import type { ContextoGeneracion, ClaseGenerada } from "./tipos";

// Adaptador de Anthropic (Claude) para el "AULA360 AI Engine".
// SOLO se importa desde código de servidor (Route Handlers) — nunca desde
// un componente de cliente, porque usa ANTHROPIC_API_KEY.
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODELO = "claude-sonnet-4-6";

function construirPrompt(ctx: ContextoGeneracion, instruccionesMejora?: string) {
  const contextoPlan = ctx.planDeArea
    ? `Contexto del plan de área del docente — competencias: ${ctx.planDeArea.competencias ?? "no especificadas"}; estándares: ${ctx.planDeArea.estandares ?? "no especificados"}; temas del periodo: ${ctx.planDeArea.temas ?? "no especificados"}.`
    : "El docente no ha cargado un plan de área con contexto adicional para este periodo.";

  return `Eres el asistente pedagógico de AULA360, una plataforma educativa colombiana. Genera contenido de clase en JSON puro (sin markdown, sin backticks) con esta forma exacta:
{"objetivo":"...","competencia":"...","estandar":"...","actividades":[{"titulo":"...","tipo":"comprension","instrucciones":"..."},{"titulo":"...","tipo":"aplicacion","instrucciones":"..."},{"titulo":"...","tipo":"analisis","instrucciones":"..."}],"recursos":"...","evaluacion":"...","tarea":"...","refuerzo":"..."}

Datos de la clase:
- Tema: ${ctx.tema}
- Grado: ${ctx.grado}
- Área: ${ctx.area} / Asignatura: ${ctx.asignatura}
- Grupo: ${ctx.grupo}
- Tiempo de clase: ${ctx.tiempoClaseMinutos} minutos
- Nivel de dificultad: ${ctx.nivelDificultad}
- ${contextoPlan}

Reglas obligatorias:
- Las tres actividades deben ser realmente diferentes entre sí (comprensión, aplicación, análisis), no la misma actividad con otro nombre.
- Usa ejemplos y contextos culturalmente apropiados para Colombia.
- El docente SIEMPRE tiene la decisión final: escribe el contenido de forma clara y editable, no como una instrucción cerrada.
${instruccionesMejora ? `- El docente pidió esta mejora sobre una versión anterior, aplícala: "${instruccionesMejora}"` : ""}

Responde ÚNICAMENTE con el JSON, nada más.`;
}

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
      messages: [{ role: "user", content: construirPrompt(ctx, instruccionesMejora) }],
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
