// Adaptador de Google Gemini para el "AULA360 AI Engine".
// - generarImagen: imágenes de apoyo para actividades (diagramas,
//   infografías) — sección 22, textos discontinuos/mixtos.
// - generarPreguntasExamenGemini: MISMO contrato que generarPreguntasExamen
//   de anthropic.ts (mismo prompt/validador, en examenes-compartido.ts).
//   Se agregó para poder probar el Generador de Exámenes sin necesitar
//   saldo cargado en Anthropic — Gemini tiene un nivel gratuito real.
//   Para volver a usar Anthropic más adelante: en
//   app/api/ai/generar-examen/route.ts y aprobar-examen/route.ts, cambia
//   el import de "generarPreguntasExamenGemini" (este archivo) por
//   "generarPreguntasExamen" (lib/ai/anthropic.ts) — misma firma, ningún
//   otro cambio necesario.
// SOLO se importa desde código de servidor: usa GEMINI_API_KEY.
import type { ContextoExamen, PreguntaGenerada, ContextoGeneracion, ClaseGenerada } from "./tipos";
import { construirPromptPreguntas, validarPreguntasGeneradas } from "./examenes-compartido";
import { construirPromptClase } from "./clase-compartida";
import { construirPromptIngles, validarExamenIngles } from "./ingles-compartido";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODELO_IMAGEN = "gemini-3.1-flash-image";
const MODELO_TEXTO = "gemini-3.6-flash";

function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 429 (cuota), 500/502/503/504 (saturación o caída puntual del proveedor)
// son errores TEMPORALES — vale la pena reintentar. 400/401/403/404 son
// errores de configuración (clave inválida, modelo inexistente, etc.) que
// no se van a arreglar solos, así que ahí no tiene sentido reintentar.
function esErrorTemporal(status: number) {
  return status === 429 || status >= 500;
}

export async function generarImagen(descripcion: string): Promise<Buffer> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY no está configurada. Agrégala a tus variables de entorno para generar imágenes de apoyo."
    );
  }

  const MAX_INTENTOS = 2;
  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    const respuesta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_IMAGEN}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Genera una imagen educativa, clara y apropiada para un aula de clase colombiana, sin texto en español incrustado con errores: ${descripcion}`,
            }],
          }],
        }),
      }
    );

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      // 429 en el modelo de imagen casi siempre es "el nivel gratuito no
      // incluye este modelo" (límite = 0), no una saturación pasajera —
      // reintentarlo solo hace perder tiempo sin cambiar el resultado.
      // Sí vale la pena reintentar 5xx (caída puntual del servidor).
      if (respuesta.status >= 500 && intento < MAX_INTENTOS) {
        await esperar(1500 * intento);
        continue;
      }
      throw new Error(`Error del proveedor de IA (Gemini): ${respuesta.status} ${detalle}`);
    }

    const data = await respuesta.json();
    const parteImagen = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    if (!parteImagen) throw new Error("Gemini no devolvió ninguna imagen.");

    return Buffer.from(parteImagen.inlineData.data, "base64");
  }

  throw new Error("El proveedor de IA no respondió tras varios intentos.");
}

export async function generarPreguntasExamenGemini(
  ctx: ContextoExamen,
  cantidad: number,
  instrucciones?: string
): Promise<{ preguntas: PreguntaGenerada[]; intentos: number }> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY no está configurada. Agrégala a tus variables de entorno para activar el Generador de Exámenes ICFES."
    );
  }

  const MAX_INTENTOS = 3;
  let ultimoError = "";
  let instruccionesActuales = instrucciones;

  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    const respuesta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_TEXTO}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: construirPromptPreguntas(ctx, cantidad, instruccionesActuales) }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      if (esErrorTemporal(respuesta.status) && intento < MAX_INTENTOS) {
        ultimoError = `El proveedor de IA respondió ${respuesta.status} (saturación temporal). Reintentando...`;
        await esperar(1500 * intento);
        continue;
      }
      throw new Error(`Error del proveedor de IA (Gemini): ${respuesta.status} ${detalle}`);
    }

    const data = await respuesta.json();
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let parseado: any;
    try {
      parseado = JSON.parse(texto);
    } catch {
      ultimoError = "La IA no devolvió un JSON válido.";
      instruccionesActuales = `${instrucciones ?? ""} (Intento anterior inválido: responde SOLO con el JSON solicitado.)`;
      continue;
    }

    const errorValidacion = validarPreguntasGeneradas(parseado, cantidad);
    if (!errorValidacion) {
      const preguntas: PreguntaGenerada[] = parseado.preguntas.map((p: any) => ({
        tema: p.tema || ctx.tema,
        competencia: p.competencia,
        tipoTexto: p.tipoTexto,
        contexto: p.contexto,
        enunciado: p.enunciado,
        opciones: p.opciones,
        respuestaCorrecta: p.respuestaCorrecta,
        explicacion: p.explicacion,
        irtDificultad: p.irtDificultad,
        irtDiscriminacion: p.irtDiscriminacion,
        irtAdivinacion: p.irtAdivinacion,
      }));
      return { preguntas, intentos: intento };
    }
    ultimoError = errorValidacion;
    instruccionesActuales = `${instrucciones ?? ""} (El intento anterior fue rechazado por el validador automático: "${errorValidacion}". Corrígelo.)`;
  }

  throw new Error(`El generador de exámenes no produjo preguntas válidas tras ${MAX_INTENTOS} intentos. Último motivo: ${ultimoError}`);
}

export async function generarClaseGemini(
  ctx: ContextoGeneracion,
  instruccionesMejora?: string
): Promise<ClaseGenerada> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY no está configurada. Agrégala a tus variables de entorno para activar el Generador Pedagógico IA."
    );
  }

  const MAX_INTENTOS = 3;
  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    const respuesta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_TEXTO}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: construirPromptClase(ctx, instruccionesMejora) }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      if (esErrorTemporal(respuesta.status) && intento < MAX_INTENTOS) {
        await esperar(1500 * intento);
        continue;
      }
      throw new Error(`Error del proveedor de IA (Gemini): ${respuesta.status} ${detalle}`);
    }

    const data = await respuesta.json();
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    try {
      return JSON.parse(texto) as ClaseGenerada;
    } catch {
      throw new Error("La IA no devolvió un JSON válido. Intenta generar de nuevo.");
    }
  }

  throw new Error("El proveedor de IA no respondió tras varios intentos. Intenta de nuevo en un momento.");
}

// ============================================================
// Examen de Inglés — Prueba Saber 11 (estructura oficial ICFES, 7
// partes, alineada al MCER). Un examen completo se genera en una sola
// llamada (las 7 partes están relacionadas entre sí y el prompt ya fija
// exactamente cuántas preguntas y opciones lleva cada una).
// ============================================================
export async function generarExamenInglesGemini(tema: string, instrucciones?: string): Promise<any> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY no está configurada. Agrégala a tus variables de entorno para generar el examen de inglés.");
  }

  const MAX_INTENTOS = 3;
  let ultimoError = "";
  let instruccionesActuales = instrucciones;

  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    const respuesta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_TEXTO}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: construirPromptIngles(tema, instruccionesActuales) }] }],
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 16000 },
        }),
      }
    );

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      if (esErrorTemporal(respuesta.status) && intento < MAX_INTENTOS) {
        await esperar(2000 * intento);
        continue;
      }
      throw new Error(`Error del proveedor de IA (Gemini): ${respuesta.status} ${detalle}`);
    }

    const data = await respuesta.json();
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let parseado: any;
    try {
      parseado = JSON.parse(texto);
    } catch {
      ultimoError = "La IA no devolvió un JSON válido.";
      instruccionesActuales = `${instrucciones ?? ""} (Intento anterior inválido: responde SOLO con el JSON solicitado, sin truncarlo.)`;
      continue;
    }

    const errorValidacion = validarExamenIngles(parseado);
    if (!errorValidacion) {
      return parseado;
    }
    ultimoError = errorValidacion;
    instruccionesActuales = `${instrucciones ?? ""} (El intento anterior fue rechazado por el validador automático: "${errorValidacion}". Corrígelo exactamente.)`;
  }

  throw new Error(`El generador del examen de inglés no produjo un examen válido tras ${MAX_INTENTOS} intentos. Último motivo: ${ultimoError}`);
}

// ============================================================
// Calificación automática de hojas de respuesta (foto de celular o PDF
// escaneado). Gemini "ve" la hoja marcada y reporta, pregunta por
// pregunta, qué opción quedó marcada — o null si el estudiante la dejó
// en blanco o marcó más de una casilla (se cuenta como sin marcar).
// ============================================================
export type RespuestaDetectada = { numero: number; letra: string | null };

export async function leerHojaRespuestasGemini(
  archivoBase64: string,
  mimeType: string,
  numeroPreguntas: number
): Promise<RespuestaDetectada[]> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY no está configurada. Agrégala a tus variables de entorno para calificar hojas de respuesta."
    );
  }

  const prompt = `Esta imagen es una hoja de respuestas de un examen tipo ICFES, con ${numeroPreguntas} preguntas numeradas del 1 al ${numeroPreguntas}. Cada pregunta tiene varias casillas u óvalos (A, B, C, D y a veces E) y el estudiante debía rellenar o marcar UNA de ellas por pregunta.

Observa cuidadosamente, pregunta por pregunta, cuál casilla está rellena/marcada (más oscura, sombreada, o con una X/check dentro, comparada con las demás casillas vacías de esa misma fila).

Reglas importantes:
- Si en una pregunta NO hay ninguna casilla marcada, repórtala con "letra": null.
- Si en una pregunta hay DOS O MÁS casillas marcadas (respuesta inválida), repórtala también con "letra": null.
- No adivines ni "completes" preguntas que no puedas ver con claridad: en ese caso también usa null.
- Debes devolver EXACTAMENTE ${numeroPreguntas} elementos, uno por cada número de pregunta, en orden, del 1 al ${numeroPreguntas}.

Responde ÚNICAMENTE con un JSON de este formato exacto, sin texto adicional:
{"respuestas": [{"numero": 1, "letra": "B"}, {"numero": 2, "letra": null}]}`;

  const MAX_INTENTOS = 3;
  let ultimoError = "";

  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    const respuesta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_TEXTO}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }, { inlineData: { mimeType, data: archivoBase64 } }],
            },
          ],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      if (esErrorTemporal(respuesta.status) && intento < MAX_INTENTOS) {
        ultimoError = `El proveedor de IA respondió ${respuesta.status} (saturación temporal). Reintentando...`;
        await esperar(1500 * intento);
        continue;
      }
      throw new Error(`Error del proveedor de IA (Gemini): ${respuesta.status} ${detalle}`);
    }

    const data = await respuesta.json();
    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let parseado: any;
    try {
      parseado = JSON.parse(texto);
    } catch {
      ultimoError = "La IA no devolvió un JSON válido.";
      continue;
    }

    const lista = parseado?.respuestas;
    if (!Array.isArray(lista) || lista.length !== numeroPreguntas) {
      ultimoError = `La IA devolvió ${Array.isArray(lista) ? lista.length : 0} respuestas en vez de ${numeroPreguntas}.`;
      continue;
    }

    const letrasValidas = ["A", "B", "C", "D", "E"];
    const normalizado: RespuestaDetectada[] = lista.map((r: any, idx: number) => {
      const letra = typeof r?.letra === "string" ? r.letra.trim().toUpperCase() : null;
      return {
        numero: typeof r?.numero === "number" ? r.numero : idx + 1,
        letra: letra && letrasValidas.includes(letra) ? letra : null,
      };
    });

    return normalizado;
  }

  throw new Error(
    `No se pudo leer la hoja de respuestas tras ${MAX_INTENTOS} intentos. Último motivo: ${ultimoError}`
  );
}