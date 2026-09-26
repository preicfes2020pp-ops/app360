
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
