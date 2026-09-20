import type {
  ContextoGeneracion,
  ClaseGenerada,
  ContextoExamen,
  PreguntaGenerada,
} from "./tipos";
import { construirPromptPreguntas, validarPreguntasGeneradas } from "./examenes-compartido";
import { construirPromptClase } from "./clase-compartida";

// Adaptador de Anthropic (Claude) para el "AULA360 AI Engine".
// SOLO se importa desde código de servidor (Route Handlers) — nunca desde
// un componente de cliente, porque usa ANTHROPIC_API_KEY.
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODELO = "claude-sonnet-4-6";

export async function generarClase(
  ctx: ContextoGeneracion,
  instruccionesMejora?: string
): Promise<ClaseGenerada> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY no está configurada. Agrégala a tus variables de entorno para activar el Generador Pedagógico IA."
    );
  }

  const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: 2000,
      messages: [{ role: "user", content: construirPromptClase(ctx, instruccionesMejora) }],
    }),
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`Error del proveedor de IA (Anthropic): ${respuesta.status} ${detalle}`);
  }

  const data = await respuesta.json();
  const texto = data.content?.find((b: any) => b.type === "text")?.text ?? "";

  try {
    return JSON.parse(texto) as ClaseGenerada;
  } catch {
    throw new Error("La IA no devolvió un JSON válido. Intenta generar de nuevo.");
  }
}

// ============================================================
// Exámenes tipo ICFES — genera filas listas para la tabla real
// `preguntas` (contexto/enunciado/opciones/respuesta_correcta/explicacion).
// Valida automáticamente y reintenta; el número de intentos usados se
// devuelve para guardarlo en `examenes.intentos_validacion`.
// ============================================================

export async function generarPreguntasExamen(
  ctx: ContextoExamen,
  cantidad: number,
  instrucciones?: string
): Promise<{ preguntas: PreguntaGenerada[]; intentos: number }> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY no está configurada. Agrégala a tus variables de entorno para activar el Generador de Exámenes ICFES."
    );
  }

  const MAX_INTENTOS = 3;
  let ultimoError = "";
  let instruccionesActuales = instrucciones;

  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 8000,
        messages: [{ role: "user", content: construirPromptPreguntas(ctx, cantidad, instruccionesActuales) }],
      }),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      throw new Error(`Error del proveedor de IA (Anthropic): ${respuesta.status} ${detalle}`);
    }

    const data = await respuesta.json();
    const texto = data.content?.find((b: any) => b.type === "text")?.text ?? "";

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
