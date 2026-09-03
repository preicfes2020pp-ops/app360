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
