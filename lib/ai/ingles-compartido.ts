// Estructura oficial de la Prueba de Inglés Saber 11.° (verificada contra
// el "Marco de referencia — Prueba de Inglés Saber 11.°, Saber TyT y Saber
// Pro" del ICFES, y la ficha "Niveles de Desempeño — Prueba Inglés"
// septiembre 2025). 45 preguntas, 7 partes, alineada al MCER.
//
// IMPORTANTE sobre los niveles: el ICFES actualizó los niveles de
// desempeño — ya NO son A-/A1/A2/B1/B+ (5 niveles, versión antigua),
// sino 4 niveles vigentes: Pre A1, A1, A2, B1 (el examen no evalúa B2
// en adelante). Este generador usa los 4 niveles vigentes.

export type ParteInglesSpec = {
  numero: number;
  titulo: string;
  tipoTarea: string;
  numOpciones: 3 | 4 | 8;
  cantidad: number;
  nivelCEFR: "Pre A1" | "A1" | "A2" | "B1";
  competencia: string;
  tieneTextoBase: boolean;
  instruccionEstudiante: string;
};

export const PARTES_INGLES_ICFES: ParteInglesSpec[] = [
  {
    numero: 1, titulo: "Ubicación de avisos", tipoTarea: "aviso_ubicacion", numOpciones: 3, cantidad: 5,
    nivelCEFR: "Pre A1", competencia: "pragmática", tieneTextoBase: false,
    instruccionEstudiante: "Lea el aviso y responda dónde puede verlo. Marque A, B o C.",
  },
  {
    numero: 2, titulo: "Vocabulario", tipoTarea: "vocabulario_emparejar", numOpciones: 8, cantidad: 5,
    nivelCEFR: "A1", competencia: "léxica", tieneTextoBase: false,
    instruccionEstudiante: "Relacione cada descripción con la palabra (A-H) que le corresponde.",
  },
  {
    numero: 3, titulo: "Conversaciones", tipoTarea: "conversacion_completar", numOpciones: 3, cantidad: 5,
    nivelCEFR: "A1", competencia: "pragmática y sociolingüística", tieneTextoBase: false,
    instruccionEstudiante: "Lea el inicio de la conversación y elija la mejor respuesta. Marque A, B o C.",
  },
  {
    numero: 4, titulo: "Texto con espacios (general)", tipoTarea: "cloze_general", numOpciones: 3, cantidad: 8,
    nivelCEFR: "A2", competencia: "gramatical (uso del lenguaje)", tieneTextoBase: true,
    instruccionEstudiante: "Lea el texto y elija la palabra adecuada para cada espacio. Marque A, B o C.",
  },
  {
    numero: 5, titulo: "Comprensión de lectura", tipoTarea: "lectura_literal", numOpciones: 3, cantidad: 7,
    nivelCEFR: "A2", competencia: "lectora literal", tieneTextoBase: true,
    instruccionEstudiante: "Lea el texto y responda las preguntas con información explícita (parafraseada) del texto. Marque A, B o C.",
  },
  {
    numero: 6, titulo: "Comprensión de lectura (inferencial)", tipoTarea: "lectura_inferencial", numOpciones: 4, cantidad: 5,
    nivelCEFR: "B1", competencia: "lectora inferencial", tieneTextoBase: true,
    instruccionEstudiante: "Lea el texto y responda infiriendo la información necesaria. Marque A, B, C o D.",
  },
  {
    numero: 7, titulo: "Texto con espacios (gramática y léxico)", tipoTarea: "cloze_gramatical_lexico", numOpciones: 4, cantidad: 10,
    nivelCEFR: "B1", competencia: "gramatical y léxica (uso del lenguaje)", tieneTextoBase: true,
    instruccionEstudiante: "Lea el texto y elija la palabra adecuada para cada espacio. Marque A, B, C o D.",
  },
];

function letrasOpciones(n: number): string[] {
  return "ABCDEFGH".slice(0, n).split("");
}

export function construirPromptIngles(tema: string, instrucciones?: string) {
  const especPartes = PARTES_INGLES_ICFES.map((p) => {
    const letras = letrasOpciones(p.numOpciones).join(", ");
    return `Parte ${p.numero} — "${p.titulo}" (${p.tipoTarea}): EXACTAMENTE ${p.cantidad} preguntas, opciones ${letras}, nivel MCER ${p.nivelCEFR}, competencia ${p.competencia}.${p.tieneTextoBase ? " Requiere un textoBase (texto de lectura o texto con espacios) compartido por todas sus preguntas." : " Cada pregunta tiene su propio enunciado corto (aviso/conversación), sin textoBase compartido."}`;
  }).join("\n");

  return `Eres el diseñador experto de la Prueba de Inglés Saber 11.° para AULA360, siguiendo EXACTAMENTE la estructura oficial del ICFES (Marco Común Europeo de Referencia — MCER). Genera un examen completo de 45 preguntas en JSON puro (sin markdown, sin backticks) con esta forma exacta:

{"partes":[
  {"numero":1,"preguntas":[{"texto":"...(texto corto del aviso/letrero)...","opciones":{"A":"...","B":"...","C":"..."},"respuestaCorrecta":"A","explicacion":"...","irtDificultad":0.0,"irtDiscriminacion":1.0,"irtAdivinacion":0.33}]},
  {"numero":2,"opciones":{"A":"word1","B":"word2","C":"word3","D":"word4","E":"word5","F":"word6","G":"word7","H":"word8"},"preguntas":[{"texto":"...(descripción a emparejar)...","respuestaCorrecta":"C","explicacion":"...","irtDificultad":0.0,"irtDiscriminacion":1.0,"irtAdivinacion":0.125}]},
  {"numero":3,"preguntas":[{"texto":"...(inicio de conversación)...","opciones":{"A":"...","B":"...","C":"..."},"respuestaCorrecta":"A","explicacion":"...","irtDificultad":0.0,"irtDiscriminacion":1.0,"irtAdivinacion":0.33}]},
  {"numero":4,"textoBase":"...(texto con espacios numerados (1)___ ... (8)___)...","preguntas":[{"numeroEspacio":1,"opciones":{"A":"...","B":"...","C":"..."},"respuestaCorrecta":"A","explicacion":"...","irtDificultad":0.0,"irtDiscriminacion":1.0,"irtAdivinacion":0.33}]},
  {"numero":5,"textoBase":"...(texto de lectura)...","preguntas":[{"texto":"...(pregunta)...","opciones":{"A":"...","B":"...","C":"..."},"respuestaCorrecta":"A","explicacion":"...","irtDificultad":0.0,"irtDiscriminacion":1.0,"irtAdivinacion":0.33}]},
  {"numero":6,"textoBase":"...(texto de lectura más complejo)...","preguntas":[{"texto":"...(pregunta inferencial)...","opciones":{"A":"...","B":"...","C":"...","D":"..."},"respuestaCorrecta":"A","explicacion":"...","irtDificultad":0.0,"irtDiscriminacion":1.0,"irtAdivinacion":0.25}]},
  {"numero":7,"textoBase":"...(texto con espacios numerados (1)___ ... (10)___)...","preguntas":[{"numeroEspacio":1,"opciones":{"A":"...","B":"...","C":"...","D":"..."},"respuestaCorrecta":"A","explicacion":"...","irtDificultad":0.0,"irtDiscriminacion":1.0,"irtAdivinacion":0.25}]}
]}

Especificación EXACTA de cada parte (respétala al pie de la letra, en este orden, sin saltarte ninguna):
${especPartes}

Tema/contexto general sugerido para los textos de lectura y los textos con espacios (partes 4, 5, 6 y 7): "${tema}". Las partes 1, 2 y 3 pueden usar situaciones cotidianas variadas, no necesitan seguir ese tema.

Reglas obligatorias:
- Todo el examen está en INGLÉS (avisos, conversaciones, textos, preguntas y opciones) — únicamente "explicacion" va en español, porque es para el docente.
- Parte 2: los 8 valores en "opciones" son palabras de vocabulario en inglés; cada una de las 5 preguntas tiene una "respuestaCorrecta" distinta entre sí (no repitas la misma letra en dos preguntas de esta parte).
- Partes 4 y 7 (textos con espacios): en "textoBase" numera los espacios exactamente como "(1)___", "(2)___", etc., en el mismo orden que las preguntas del arreglo "preguntas" (cada pregunta corresponde a un espacio, en "numeroEspacio").
- Partes 5 y 6: los textos de lectura deben tener una extensión y complejidad reales de examen (varios párrafos), acordes al nivel MCER indicado.
- Nunca uses tablas en formato ASCII con "|" ni líneas de guiones — es texto para imprimir en una hoja angosta.
- METODOLOGÍA IRT (igual que en el resto de AULA360): en cada pregunta estima "irtDificultad" (-3 a 3), "irtDiscriminacion" (0.5 a 2.0) e "irtAdivinacion" (≈ 1/número de opciones de esa parte) — es una estimación experta inicial de la IA, no una calibración estadística real.
${instrucciones ? `- El docente pidió esta mejora sobre un intento anterior, aplícala: "${instrucciones}"` : ""}

Responde ÚNICAMENTE con el JSON, nada más.`;
}

export function validarExamenIngles(data: any): string | null {
  if (!data || !Array.isArray(data.partes)) return "La IA no devolvió el arreglo de partes.";
  if (data.partes.length !== PARTES_INGLES_ICFES.length) return `Se requieren ${PARTES_INGLES_ICFES.length} partes y llegaron ${data.partes.length}.`;

  for (const spec of PARTES_INGLES_ICFES) {
    const parte = data.partes.find((p: any) => p.numero === spec.numero);
    if (!parte) return `Falta la parte ${spec.numero} (${spec.titulo}).`;
    if (!Array.isArray(parte.preguntas) || parte.preguntas.length !== spec.cantidad) {
      return `La parte ${spec.numero} debe tener exactamente ${spec.cantidad} preguntas (llegaron ${parte.preguntas?.length ?? 0}).`;
    }
    if (spec.tieneTextoBase && (typeof parte.textoBase !== "string" || !parte.textoBase.trim())) {
      return `A la parte ${spec.numero} le falta el textoBase.`;
    }
    const letrasEsperadas = letrasOpciones(spec.numOpciones);

    if (spec.numero === 2) {
      const op = parte.opciones;
      if (!op || !letrasEsperadas.every((l) => typeof op[l] === "string" && op[l].trim())) {
        return `La parte 2 no tiene las 8 opciones (A-H) completas.`;
      }
      const letrasUsadas = new Set<string>();
      for (const [i, p] of parte.preguntas.entries()) {
        if (typeof p.texto !== "string" || !p.texto.trim()) return `A la pregunta ${i + 1} de la parte 2 le falta el texto.`;
        if (!letrasEsperadas.includes(p.respuestaCorrecta)) return `La pregunta ${i + 1} de la parte 2 tiene una respuestaCorrecta inválida.`;
        letrasUsadas.add(p.respuestaCorrecta);
      }
      if (letrasUsadas.size < 5) return "La parte 2 debe usar 5 letras distintas como respuestas correctas (una por pregunta).";
    } else {
      for (const [i, p] of parte.preguntas.entries()) {
        const n = i + 1;
        if (!p || typeof p !== "object") return `La pregunta ${n} de la parte ${spec.numero} no es válida.`;
        if ((spec.numero === 4 || spec.numero === 7) && typeof p.numeroEspacio !== "number") {
          return `A la pregunta ${n} de la parte ${spec.numero} le falta numeroEspacio.`;
        }
        if (spec.numero !== 4 && spec.numero !== 7 && (typeof p.texto !== "string" || !p.texto.trim())) {
          return `A la pregunta ${n} de la parte ${spec.numero} le falta el texto.`;
        }
        const op = p.opciones;
        if (!op || !letrasEsperadas.every((l) => typeof op[l] === "string" && op[l].trim())) {
          return `A la pregunta ${n} de la parte ${spec.numero} le faltan sus ${spec.numOpciones} opciones completas.`;
        }
        if (!letrasEsperadas.includes(p.respuestaCorrecta)) return `La pregunta ${n} de la parte ${spec.numero} no tiene una respuestaCorrecta válida.`;
        if (typeof p.explicacion !== "string" || !p.explicacion.trim()) return `A la pregunta ${n} de la parte ${spec.numero} le falta la explicación.`;
        if (typeof p.irtDificultad !== "number" || typeof p.irtDiscriminacion !== "number" || typeof p.irtAdivinacion !== "number") {
          return `A la pregunta ${n} de la parte ${spec.numero} le faltan los parámetros IRT.`;
        }
      }
    }
  }
  return null;
}
