// Tipos comunes de la capa de abstracción de IA (sección 52 del prompt
// maestro: "crear una capa de abstracción para poder cambiar de proveedor
// de IA. NO acoplar toda la aplicación a un único proveedor").
// Ningún componente de la app debe llamar directamente a Anthropic/Gemini:
// siempre pasan por estas funciones.

export type ContextoGeneracion = {
  tema: string;
  grado: string;
  area: string;
  asignatura: string;
  grupo: string;
  tiempoClaseMinutos: number;
  nivelDificultad: "basico" | "intermedio" | "avanzado";
  // Contexto adicional cuando exista un plan de área cargado (Fase 2).
  planDeArea?: {
    competencias?: string;
    estandares?: string;
    temas?: string;
  } | null;
};

export type ActividadGenerada = {
  titulo: string;
  tipo: "comprension" | "aplicacion" | "analisis";
  instrucciones: string;
};

export type ClaseGenerada = {
  objetivo: string;
  competencia: string;
  estandar: string;
  actividades: [ActividadGenerada, ActividadGenerada, ActividadGenerada];
  recursos: string;
  evaluacion: string;
  tarea: string;
  refuerzo: string;
};

// ---- Exámenes tipo ICFES (tabla real `preguntas` / `examenes` / `examen_preguntas`) ----
// Los campos siguen EXACTAMENTE las columnas de la tabla `preguntas` para
// poder guardarlas tal cual, sin traducción: tipo_texto, contexto,
// enunciado, opciones, respuesta_correcta, explicacion, nivel_dificultad.

export type TipoTextoPregunta = "continuo" | "discontinuo" | "mixto";
export type OpcionesPregunta = { A: string; B: string; C: string; D: string };

export type PreguntaGenerada = {
  tema: string;
  competencia: string;
  tipoTexto: TipoTextoPregunta;
  contexto: string;
  enunciado: string;
  opciones: OpcionesPregunta;
  respuestaCorrecta: "A" | "B" | "C" | "D";
  explicacion: string;
  // Estimación experta inicial de parámetros IRT (modelo logístico 3PL),
  // hecha por la IA al momento de crear la pregunta — NO es una calibración
  // estadística real (esa requiere datos de resultados de estudiantes).
  irtDificultad: number;
  irtDiscriminacion: number;
  irtAdivinacion: number;
};

export type ContextoExamen = {
  tema: string;
  grado: string;
  area: string;
  asignatura: string;
  grupo: string;
  numeroItems: number;
  nivelDificultad: "basico" | "intermedio" | "avanzado";
};
