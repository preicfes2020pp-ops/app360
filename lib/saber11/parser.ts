// Extrae los datos de un PDF de "Reporte de resultados" individual de
// Saber 11 (ICFES). El texto de estos PDF viene con las columnas
// entreveradas al extraerlo (es un diseño de varias columnas), así que
// los patrones de búsqueda están diseñados para ser resistentes a eso:
// en vez de esperar que dos textos queden pegados, se ancla en frases o
// números que SIEMPRE quedan justo antes/después de una etiqueta fija,
// sin importar qué texto haya quedado intercalado en el medio.
//
// IMPORTANTE: el "nivel de desempeño" (1-4, o A-/A1/A2/B1/B+ en inglés)
// NO se extrae porque en el PDF solo existe como una barra de colores +
// una flecha (elementos visuales), no como texto. Ver decisión tomada
// con el usuario: por ahora el análisis institucional trabaja solo con
// puntajes y percentiles numéricos.

export type ResultadoArea = {
  puntaje: number | null;
  percentilNacional: number | null;
  percentilEtnico: number | null;
};

export type ResultadoSaber11 = {
  nombreCompleto: string;
  tipoDocumento: string | null;
  numeroDocumento: string;
  numeroRegistro: string | null;
  fechaAplicacion: string | null; // YYYY-MM-DD
  fechaPublicacion: string | null; // YYYY-MM-DD
  anio: number;
  establecimientoEducativo: string | null;
  puntajeGlobal: number;
  percentilGlobalNacional: number | null;
  percentilGlobalEtnico: number | null;
  areas: {
    lecturaCritica: ResultadoArea;
    matematicas: ResultadoArea;
    socialesCiudadanas: ResultadoArea;
    cienciasNaturales: ResultadoArea;
    ingles: ResultadoArea;
  };
};

export type ResultadoParseo =
  | { ok: true; datos: ResultadoSaber11 }
  | { ok: false; motivo: string };

function fechaDDMMYYYYaISO(fecha: string): string | null {
  const m = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

function extraerNumero(regex: RegExp, texto: string): number | null {
  const m = texto.match(regex);
  return m ? parseInt(m[1], 10) : null;
}

function extraerAreaBloque(bloque: string): ResultadoArea {
  const mPuntaje = bloque.search(/Puntaje\s*\/100/i);
  let puntaje: number | null = null;
  if (mPuntaje !== -1) {
    const antes = bloque.slice(0, mPuntaje);
    const numeros = antes.match(/\b(\d{2,3})\b/g);
    if (numeros && numeros.length > 0) {
      puntaje = parseInt(numeros[numeros.length - 1], 10);
    }
  }

  const percentilNacional = extraerNumero(/Estudiantes a nivel nacional\s+(\d{1,3})/i, bloque);
  const percentilEtnico = extraerNumero(
    /Estudiantes de comunidades étnicas que\s+(\d{1,3})/i,
    bloque
  );

  return { puntaje, percentilNacional, percentilEtnico };
}

export function parsearResultadoSaber11(textoPdf: string): ResultadoParseo {
  // ---------- Datos del evaluado ----------
  const mDatos = textoPdf.match(
    /Nombre Completo:[\s\S]*?\n(.+?)\s+((?:T\.I\.|C\.C\.|CC|TI|CE)\.?)\s*(\d+)\s+(\S+)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})/
  );

  if (!mDatos) {
    return {
      ok: false,
      motivo:
        "No se pudo leer la sección 'Datos del evaluado' (nombre, documento, fechas). El PDF puede no ser un reporte individual de Saber 11 en el formato esperado.",
    };
  }

  const [, nombreCompleto, tipoDocumento, numeroDocumento, numeroRegistro, fechaAplicacionRaw, fechaPublicacionRaw] =
    mDatos;

  const fechaAplicacion = fechaDDMMYYYYaISO(fechaAplicacionRaw);
  const anio = fechaAplicacion
    ? parseInt(fechaAplicacion.slice(0, 4), 10)
    : parseInt(fechaAplicacionRaw.slice(-4), 10);

  // Establecimiento educativo: best-effort, no bloquea el resto si falla.
  const mEstablecimiento = textoPdf.match(
    /Establecimiento educativo:[\s\S]*?\n.*?\s{2,}(.+?)(?:\s{2,}|\n)/
  );

  // ---------- Puntaje global y percentiles globales ----------
  const puntajeGlobal = extraerNumero(/\n(\d{2,3})\n(?:.*\n){0,3}?\/500/, textoPdf);
  if (puntajeGlobal === null) {
    return {
      ok: false,
      motivo: "No se pudo leer el puntaje global (formato inesperado cerca de '/500').",
    };
  }

  const superos = [...textoPdf.matchAll(/Tu puntaje super[oó] al (\d{1,3})\s*%/gi)];
  const percentilGlobalNacional = superos[0] ? parseInt(superos[0][1], 10) : null;
  const percentilGlobalEtnico = superos[1] ? parseInt(superos[1][1], 10) : null;

  // ---------- Áreas ----------
  // Se busca la ÚLTIMA aparición de cada nombre de área: la primera suele
  // ser solo la mención en la tabla de ponderación de la primera página.
  const nombresArea: { clave: keyof ResultadoSaber11["areas"]; patron: RegExp }[] = [
    { clave: "lecturaCritica", patron: /Lectura Crítica/gi },
    { clave: "matematicas", patron: /Matemáticas/gi },
    { clave: "socialesCiudadanas", patron: /Sociales y Ciudadanas/gi },
    { clave: "cienciasNaturales", patron: /Ciencias Naturales/gi },
    { clave: "ingles", patron: /Inglés/gi },
  ];

  const posiciones = nombresArea.map(({ clave, patron }) => {
    const coincidencias = [...textoPdf.matchAll(patron)];
    const ultima = coincidencias.at(-1);
    return { clave, inicio: ultima ? ultima.index! : null };
  });

  const faltantes = posiciones.filter((p) => p.inicio === null).map((p) => p.clave);
  if (faltantes.length > 0) {
    return {
      ok: false,
      motivo: `No se encontraron las secciones de: ${faltantes.join(", ")}. Revisa que el PDF tenga las 5 áreas completas.`,
    };
  }

  const areasResultado = {} as ResultadoSaber11["areas"];
  for (let i = 0; i < posiciones.length; i++) {
    const inicio = posiciones[i].inicio!;
    const fin = i + 1 < posiciones.length ? posiciones[i + 1].inicio! : textoPdf.length;
    const bloque = textoPdf.slice(inicio, fin);
    areasResultado[posiciones[i].clave] = extraerAreaBloque(bloque);
  }

  const areasFallidas = Object.entries(areasResultado)
    .filter(([, r]) => r.puntaje === null)
    .map(([clave]) => clave);
  if (areasFallidas.length > 0) {
    return {
      ok: false,
      motivo: `No se pudo leer el puntaje de: ${areasFallidas.join(", ")}.`,
    };
  }

  return {
    ok: true,
    datos: {
      nombreCompleto: nombreCompleto.trim(),
      tipoDocumento: tipoDocumento.replace(/\.$/, ""),
      numeroDocumento,
      numeroRegistro,
      fechaAplicacion,
      fechaPublicacion: fechaDDMMYYYYaISO(fechaPublicacionRaw),
      anio,
      establecimientoEducativo: mEstablecimiento ? mEstablecimiento[1].trim() : null,
      puntajeGlobal,
      percentilGlobalNacional,
      percentilGlobalEtnico,
      areas: areasResultado,
    },
  };
}
