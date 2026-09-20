// Lógica compartida entre proveedores de IA para el Generador Pedagógico
// (ver nota equivalente en examenes-compartido.ts).
import type { ContextoGeneracion } from "./tipos";

export function construirPromptClase(ctx: ContextoGeneracion, instruccionesMejora?: string) {
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
