// Lógica compartida entre proveedores de IA para el Generador de Exámenes:
// el prompt y el validador NO dependen de qué proveedor (Anthropic/Gemini)
// se use — así se cumple de verdad la "capa de abstracción" (sección 52):
// cambiar de proveedor es cambiar solo la llamada HTTP, nunca las reglas
// de negocio.
import type { ContextoExamen } from "./tipos";

export function construirPromptPreguntas(ctx: ContextoExamen, cantidad: number, instrucciones?: string) {
  return `Eres el diseñador de evaluaciones de AULA360, una plataforma educativa colombiana. Genera preguntas de examen tipo ICFES (estilo Saber) en JSON puro (sin markdown, sin backticks) con esta forma exacta:
{"preguntas":[{"tema":"...","competencia":"...","tipoTexto":"continuo","contexto":"...","enunciado":"...","opciones":{"A":"...","B":"...","C":"...","D":"..."},"respuestaCorrecta":"A","explicacion":"...","irtDificultad":0.0,"irtDiscriminacion":1.0,"irtAdivinacion":0.25}]}

Datos:
- Tema: ${ctx.tema}
- Grado: ${ctx.grado}
- Área: ${ctx.area} / Asignatura: ${ctx.asignatura}
- Grupo: ${ctx.grupo}
- Nivel de dificultad: ${ctx.nivelDificultad}
- Cantidad de preguntas requerida: EXACTAMENTE ${cantidad}

Reglas obligatorias del formato ICFES:
- Combina los 3 tipos de texto ("tipoTexto"):
  · "continuo": un párrafo narrativo/expositivo normal, sin datos para graficar.
  · "discontinuo": "contexto" debe describir CLARAMENTE una tabla, gráfico o
    diagrama de datos concretos (cifras, categorías, ejes, relaciones) — a
    partir de esa descripción se generará una imagen real de esa tabla o
    gráfico, así que sé específico y estructurado, no ambiguo.
  · "mixto": combina un párrafo narrativo breve CON datos concretos para
    graficar (igual de específicos que en "discontinuo") dentro del mismo
    "contexto" — también se generará una imagen real a partir de esa parte
    de datos.
  Debe haber al menos una pregunta de cada tipo.
- IMPORTANTE — formato del texto de "contexto": este texto se imprime en
  una hoja de examen angosta. NUNCA uses tablas en formato ASCII con
  símbolos "|" ni líneas separadoras de guiones ("---------"), porque no
  caben en la hoja impresa y se salen del margen. En vez de eso, describe
  los datos como prosa natural o como una lista simple, un dato por línea,
  por ejemplo: "Muestra 1: Mitocondrias 35%, Retículo Endoplasmático
  Rugoso 10%, Cloroplastos 0%, Vacuola Central 0%." — con saltos de línea
  normales entre elementos, nunca con pipes ni rayas separadoras.
- Puedes reutilizar el mismo "contexto" en varias preguntas consecutivas (un texto con
  2-4 preguntas asociadas), tal como hace el ICFES real.
- Cada pregunta tiene exactamente 4 opciones (A, B, C, D), todas plausibles, y UNA sola
  respuesta correcta en "respuestaCorrecta".
- "competencia" (ej: interpretativa, argumentativa, propositiva) debe ser coherente con
  el área y el tema.
- "explicacion" justifica brevemente por qué esa es la respuesta correcta (uso del
  docente, no se muestra al estudiante en el examen impreso).
- Usa contextos y ejemplos culturalmente apropiados para Colombia.
- METODOLOGÍA IRT (Teoría de Respuesta al Ítem, modelo logístico de 3
  parámetros, como usa el ICFES real): para cada pregunta, estima TÚ MISMO,
  como experto pedagógico, valores iniciales razonables de sus 3 parámetros
  (esto es una ESTIMACIÓN EXPERTA inicial, no una calibración estadística
  real — esa solo se puede obtener con resultados reales de estudiantes a lo
  largo del tiempo):
  · "irtDificultad" (parámetro b): de -3.0 (muy fácil) a 3.0 (muy difícil).
    Debe ser coherente con "${ctx.nivelDificultad}" y con qué tan compleja es
    la pregunta dentro del examen (varía la dificultad entre preguntas, no
    pongas el mismo valor en todas).
  · "irtDiscriminacion" (parámetro a): de 0.5 (discrimina poco entre quien
    sabe y quien no) a 2.0 (discrimina mucho). Preguntas más ambiguas o con
    distractores poco creíbles discriminan menos.
  · "irtAdivinacion" (parámetro c): probabilidad de acertar al azar. Con 4
    opciones, usa un valor cercano a 0.25 (puede variar un poco según qué
    tan "descartables" sean los distractores).
${instrucciones ? `- El docente pidió esta mejora sobre un intento anterior, aplícala: "${instrucciones}"` : ""}

Responde ÚNICAMENTE con el JSON, nada más.`;
}

export function validarPreguntasGeneradas(data: any, cantidad: number): string | null {
  if (!data || !Array.isArray(data.preguntas)) return "La IA no devolvió el arreglo de preguntas.";
  if (data.preguntas.length < cantidad) return `Se requerían ${cantidad} preguntas y solo llegaron ${data.preguntas.length}.`;

  const tiposVistos = new Set<string>();
  for (const [i, p] of data.preguntas.entries()) {
    const n = i + 1;
    if (!p || typeof p !== "object") return `La pregunta ${n} no es un objeto válido.`;
    if (!["continuo", "discontinuo", "mixto"].includes(p.tipoTexto)) return `La pregunta ${n} tiene un tipoTexto inválido.`;
    tiposVistos.add(p.tipoTexto);
    if (typeof p.contexto !== "string" || !p.contexto.trim()) return `A la pregunta ${n} le falta el contexto.`;
    if (typeof p.enunciado !== "string" || !p.enunciado.trim()) return `A la pregunta ${n} le falta el enunciado.`;
    const op = p.opciones;
    if (!op || !["A", "B", "C", "D"].every((k) => typeof op[k] === "string" && op[k].trim())) {
      return `A la pregunta ${n} le faltan las 4 opciones (A-D) completas.`;
    }
    if (!["A", "B", "C", "D"].includes(p.respuestaCorrecta)) return `La pregunta ${n} no tiene una respuestaCorrecta válida.`;
    if (typeof p.competencia !== "string" || !p.competencia.trim()) return `A la pregunta ${n} le falta la competencia.`;
    if (typeof p.explicacion !== "string" || !p.explicacion.trim()) return `A la pregunta ${n} le falta la explicación.`;
    if (typeof p.irtDificultad !== "number" || p.irtDificultad < -4 || p.irtDificultad > 4) return `A la pregunta ${n} le falta o tiene inválido irtDificultad.`;
    if (typeof p.irtDiscriminacion !== "number" || p.irtDiscriminacion < 0.1 || p.irtDiscriminacion > 3) return `A la pregunta ${n} le falta o tiene inválido irtDiscriminacion.`;
    if (typeof p.irtAdivinacion !== "number" || p.irtAdivinacion < 0 || p.irtAdivinacion > 0.6) return `A la pregunta ${n} le falta o tiene inválido irtAdivinacion.`;
  }
  if (tiposVistos.size < 3) return "El examen debe incluir al menos una pregunta de cada tipo de texto: continuo, discontinuo y mixto.";
  return null;
}
