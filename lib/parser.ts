// Extrae los datos de un PDF de "Reporte de resultados" individual de
// Saber 11 (ICFES). El texto de estos PDF viene con las columnas
// entreveradas al extraerlo (es un diseño de varias columnas), y además
// distintas librerías de extracción (Python/pdfplumber vs Node/pdf-parse)
// pueden ordenar ligeramente distinto los saltos de línea. Por eso:
//
// 1. Se normaliza todo el texto colapsando cualquier espacio en blanco
//    (saltos de línea incluidos) a un solo espacio, y las búsquedas se
//    diseñan para depender solo del ORDEN de las palabras, nunca de que
//    queden en la misma línea.
// 2. El puntaje global NO se lee del texto (esa parte del PDF es la más
//    propensa a quedar entreverada de forma ambigua) — se CALCULA con la
//    fórmula oficial que el propio ICFES publica en la primera página de
//    este mismo PDF: (3·LC + 3·MAT + 3·SOC + 3·CN + 1·ING) / 13 · 5,
//    redondeado. Ya se validó que da el valor exacto contra un PDF real.
//
// IMPORTANTE: el "nivel de desempeño" (1-4, o A-/A1/A2/B1/B+ en inglés)
// NO se extrae porque en el PDF solo existe como una barra de colores +
// una flecha (elementos visuales), no como texto.

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
  | { ok: false; motivo: string; textoParaDiagnostico?: string };

function normalizar(texto: string): string {
  return texto.replace(/\s+/g, " ");
}

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
  const mPuntaje = bloque.search(/Puntaje\s*\/\s*100/i);
  let puntaje: number | null = null;
  if (mPuntaje !== -1) {
    const antes = bloque.slice(0, mPuntaje);
    const numeros = antes.match(/\b(\d{2,3})\b/g);
    if (numeros && numeros.length > 0) {
      puntaje = parseInt(numeros[numeros.length - 1], 10);
    }
  }

  const percentilNacional = extraerNumero(/Estudiantes a nivel nacional\D{0,20}?(\d{1,3})/i, bloque);
  const percentilEtnico = extraerNumero(
    /Estudiantes de comunidades étnicas que\D{0,20}?(\d{1,3})/i,
    bloque
  );

  return { puntaje, percentilNacional, percentilEtnico };
}

export function parsearResultadoSaber11(textoPdfOriginal: string): ResultadoParseo {
  const texto = normalizar(textoPdfOriginal);

  // ---------- Datos del evaluado ----------
  // Se ancla justo después de la última etiqueta de la fila de encabezados
  // ("Publicación de resultados:"), que siempre queda inmediatamente antes
  // de la fila de valores reales, sin importar cómo se reordenen las demás.
  const mDatos = texto.match(
    /Publicaci[oó]n de resultados:\s*(.+?)\s+((?:T\.I\.|C\.C\.|CC|TI|CE)\.?)\s*(\d{4,15})\s+(\S+)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})/
  );

  if (!mDatos) {
    return {
      ok: false,
      motivo:
        "No se pudo leer la sección 'Datos del evaluado' (nombre, documento, fechas). El PDF puede no ser un reporte individual de Saber 11 en el formato esperado.",
      textoParaDiagnostico: texto.slice(0, 1500),
    };
  }

  const [, nombreCompleto, tipoDocumento, numeroDocumento, numeroRegistro, fechaAplicacionRaw, fechaPublicacionRaw] =
    mDatos;

  const fechaAplicacion = fechaDDMMYYYYaISO(fechaAplicacionRaw);
  const anio = fechaAplicacion
    ? parseInt(fechaAplicacion.slice(0, 4), 10)
    : parseInt(fechaAplicacionRaw.slice(-4), 10);

  // ---------- Áreas ----------
  const nombresArea: { clave: keyof ResultadoSaber11["areas"]; patron: RegExp }[] = [
    { clave: "lecturaCritica", patron: /Lectura Cr[ií]tica/gi },
    { clave: "matematicas", patron: /Matem[aá]ticas/gi },
    { clave: "socialesCiudadanas", patron: /Sociales y Ciudadanas/gi },
    { clave: "cienciasNaturales", patron: /Ciencias Naturales/gi },
    { clave: "ingles", patron: /Ingl[eé]s/gi },
  ];

  const posiciones = nombresArea.map(({ clave, patron }) => {
    const coincidencias = [...texto.matchAll(patron)];
    const ultima = coincidencias.at(-1);
    return { clave, inicio: ultima ? ultima.index! : null };
  });

  const faltantes = posiciones.filter((p) => p.inicio === null).map((p) => p.clave);
  if (faltantes.length > 0) {
    return {
      ok: false,
      motivo: `No se encontraron las secciones de: ${faltantes.join(", ")}. Revisa que el PDF tenga las 5 áreas completas.`,
      textoParaDiagnostico: texto.slice(0, 1500),
    };
  }

  const areasResultado = {} as ResultadoSaber11["areas"];
  for (let i = 0; i < posiciones.length; i++) {
    const inicio = posiciones[i].inicio!;
    const fin = i + 1 < posiciones.length ? posiciones[i + 1].inicio! : texto.length;
    const bloque = texto.slice(inicio, fin);
    areasResultado[posiciones[i].clave] = extraerAreaBloque(bloque);
  }

  const areasFallidas = Object.entries(areasResultado)
    .filter(([, r]) => r.puntaje === null)
    .map(([clave]) => clave);
  if (areasFallidas.length > 0) {
    return {
      ok: false,
      motivo: `No se pudo leer el puntaje de: ${areasFallidas.join(", ")}.`,
      textoParaDiagnostico: texto.slice(0, 3000),
    };
  }

  // ---------- Puntaje global (calculado, no leído del texto) ----------
  const lc = areasResultado.lecturaCritica.puntaje!;
  const mat = areasResultado.matematicas.puntaje!;
  const soc = areasResultado.socialesCiudadanas.puntaje!;
  const cn = areasResultado.cienciasNaturales.puntaje!;
  const ing = areasResultado.ingles.puntaje!;
  const puntajeGlobal = Math.round(((3 * lc + 3 * mat + 3 * soc + 3 * cn + 1 * ing) / 13) * 5);

  // Percentiles globales: mejor esfuerzo, no bloquean el guardado si fallan.
  const superos = [...texto.matchAll(/Tu puntaje super[oó] al (\d{1,3})\s*%/gi)];
  const percentilGlobalNacional = superos[0] ? parseInt(superos[0][1], 10) : null;
  const percentilGlobalEtnico = superos[1] ? parseInt(superos[1][1], 10) : null;

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
      puntajeGlobal,
      percentilGlobalNacional,
      percentilGlobalEtnico,
      areas: areasResultado,
    },
  };
}
