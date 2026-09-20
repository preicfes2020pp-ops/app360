import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const MAX_PDFS_POR_SUBIDA = 60;
const MAX_TAMANO_PDF_BYTES = 5 * 1024 * 1024; // 5 MB por archivo

// ============================================================
// Parser (todo en este mismo archivo a propósito, para eliminar
// cualquier posibilidad de que quede una copia vieja en otra carpeta)
// ============================================================

type ResultadoArea = { puntaje: number | null; percentilNacional: number | null; percentilEtnico: number | null };

type ResultadoSaber11 = {
  nombreCompleto: string;
  tipoDocumento: string | null;
  numeroDocumento: string;
  numeroRegistro: string | null;
  fechaAplicacion: string | null;
  fechaPublicacion: string | null;
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

type ResultadoParseo =
  | { ok: true; datos: ResultadoSaber11 }
  | { ok: false; motivo: string; textoParaDiagnostico: string };

function extraerDiagnostico(texto: string): string {
  for (const ancla of ["Datos del evaluado", "Publicaci[oó]n de resultados", "Reporte de resultados"]) {
    const m = texto.match(new RegExp(ancla));
    if (m && m.index !== undefined) {
      return `(longitud total del texto: ${texto.length}) ...` + texto.slice(m.index, m.index + 1200);
    }
  }
  return `(longitud total del texto: ${texto.length}, no se encontró ningún ancla conocida) ` + texto.slice(0, 1500);
}

function normalizar(texto: string): string {
  return texto.replace(/\s+/g, " ");
}

function fechaDDMMYYYYaISO(fecha: string): string | null {
  const m = fecha.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

function buscarPrimero(regexes: RegExp[], texto: string): number | null {
  for (const r of regexes) {
    const m = texto.match(r);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function extraerAreaBloque(bloque: string): ResultadoArea {
  const puntaje = buscarPrimero([/\b(\d{2,3})\s*\/\s*100\b/i], bloque);
  const percentilNacional = buscarPrimero(
    [/\b(\d{1,3})\b\s*Estudiantes a nivel nacional/i, /Estudiantes a nivel nacional\D{0,20}?(\d{1,3})/i],
    bloque
  );
  const percentilEtnico = buscarPrimero(
    [
      /\b(\d{1,3})\b\s*Estudiantes de comunidades étnicas que/i,
      /Estudiantes de comunidades étnicas que\D{0,20}?(\d{1,3})/i,
    ],
    bloque
  );
  return { puntaje, percentilNacional, percentilEtnico };
}

function parsearResultadoSaber11(textoPdfOriginal: string): ResultadoParseo {
  const texto = normalizar(textoPdfOriginal);

  const mDatos = texto.match(
    /Nombre Completo:\s*(.+?)\s*Identificaci[oó]n:\s*((?:T\.I\.|C\.C\.|CC|TI|CE)\.?)\s*(\d{4,15})\s*N[uú]mero de registro:\s*(\S+)\s*Aplicaci[oó]n del examen:\s*(\d{2}\/\d{2}\/\d{4})\s*Publicaci[oó]n de resultados:\s*(\d{2}\/\d{2}\/\d{4})/
  );

  if (!mDatos) {
    return {
      ok: false,
      motivo: "No se pudo leer la sección 'Datos del evaluado'.",
      textoParaDiagnostico: extraerDiagnostico(texto),
    };
  }

  const [, nombreCompleto, tipoDocumento, numeroDocumento, numeroRegistro, fechaAplicacionRaw, fechaPublicacionRaw] =
    mDatos;

  const fechaAplicacion = fechaDDMMYYYYaISO(fechaAplicacionRaw);
  const anio = fechaAplicacion
    ? parseInt(fechaAplicacion.slice(0, 4), 10)
    : parseInt(fechaAplicacionRaw.slice(-4), 10);

  const nombresArea: { clave: keyof ResultadoSaber11["areas"]; patron: RegExp }[] = [
    { clave: "lecturaCritica", patron: /Lectura Cr[ií]tica(?=[\s\S]{0,60}?Puntaje)/gi },
    { clave: "matematicas", patron: /Matem[aá]ticas(?=[\s\S]{0,60}?Puntaje)/gi },
    { clave: "socialesCiudadanas", patron: /Sociales y Ciudadanas(?=[\s\S]{0,60}?Puntaje)/gi },
    { clave: "cienciasNaturales", patron: /Ciencias Naturales(?=[\s\S]{0,60}?Puntaje)/gi },
    { clave: "ingles", patron: /Ingl[eé]s(?=[\s\S]{0,60}?Puntaje)/gi },
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
      motivo: `No se encontraron las secciones de: ${faltantes.join(", ")}.`,
      textoParaDiagnostico: extraerDiagnostico(texto),
    };
  }

  const areasResultado = {} as ResultadoSaber11["areas"];
  const bloquesPorArea = {} as Record<keyof ResultadoSaber11["areas"], string>;
  for (let i = 0; i < posiciones.length; i++) {
    const inicio = posiciones[i].inicio!;
    const fin = i + 1 < posiciones.length ? posiciones[i + 1].inicio! : texto.length;
    const bloque = texto.slice(inicio, fin);
    bloquesPorArea[posiciones[i].clave] = bloque;
    areasResultado[posiciones[i].clave] = extraerAreaBloque(bloque);
  }

  const areasFallidas = Object.entries(areasResultado).filter(([, r]) => r.puntaje === null).map(([c]) => c);
  if (areasFallidas.length > 0) {
    const textoFallidas = areasFallidas
      .map((clave) => `--- ${clave} ---\n${bloquesPorArea[clave as keyof ResultadoSaber11["areas"]].slice(0, 500)}`)
      .join("\n\n");
    return {
      ok: false,
      motivo: `No se pudo leer el puntaje de: ${areasFallidas.join(", ")}.`,
      textoParaDiagnostico: textoFallidas,
    };
  }

  const lc = areasResultado.lecturaCritica.puntaje!;
  const mat = areasResultado.matematicas.puntaje!;
  const soc = areasResultado.socialesCiudadanas.puntaje!;
  const cn = areasResultado.cienciasNaturales.puntaje!;
  const ing = areasResultado.ingles.puntaje!;
  const puntajeGlobal = Math.round(((3 * lc + 3 * mat + 3 * soc + 3 * cn + 1 * ing) / 13) * 5);

  const superos = [...texto.matchAll(/Tu puntaje super[oó] al (\d{1,3})\s*%/gi)];

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
      percentilGlobalNacional: superos[0] ? parseInt(superos[0][1], 10) : null,
      percentilGlobalEtnico: superos[1] ? parseInt(superos[1][1], 10) : null,
      areas: areasResultado,
    },
  };
}

// ============================================================
// Endpoint
// ============================================================

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, institucion_id")
    .eq("id", user.id)
    .single();

  if (!perfil || !["rector", "coordinador", "superadmin"].includes(perfil.rol)) {
    return NextResponse.json({ error: "No tienes permiso para subir resultados de Saber 11." }, { status: 403 });
  }
  if (!perfil.institucion_id) {
    return NextResponse.json({ error: "No se encontró tu institución." }, { status: 400 });
  }
  const institucionId = perfil.institucion_id;

  const formData = await request.formData();
  const archivos = formData.getAll("pdfs").filter((f): f is File => f instanceof File);

  if (archivos.length === 0) return NextResponse.json({ error: "No se recibió ningún archivo PDF." }, { status: 400 });
  if (archivos.length > MAX_PDFS_POR_SUBIDA) {
    return NextResponse.json({ error: `Solo se pueden subir hasta ${MAX_PDFS_POR_SUBIDA} PDF a la vez.` }, { status: 400 });
  }

  const creados: { archivo: string; nombre: string; anio: number; puntajeGlobal: number }[] = [];
  const fallidos: { archivo: string; motivo: string }[] = [];

  for (const archivo of archivos) {
    if (!archivo.name.toLowerCase().endsWith(".pdf") || archivo.type !== "application/pdf") {
      fallidos.push({ archivo: archivo.name, motivo: "El archivo no es un PDF." });
      continue;
    }
    if (archivo.size > MAX_TAMANO_PDF_BYTES) {
      fallidos.push({ archivo: archivo.name, motivo: "El archivo pesa más de 5 MB." });
      continue;
    }

    let buffer: Buffer;
    let texto: string;
    try {
      buffer = Buffer.from(await archivo.arrayBuffer());
      const resultadoPdf = await pdfParse(buffer);
      texto = resultadoPdf.text;
    } catch (errorPdf) {
      const mensaje = errorPdf instanceof Error ? errorPdf.message : String(errorPdf);
      fallidos.push({ archivo: archivo.name, motivo: `No se pudo abrir el PDF. Detalle técnico: ${mensaje}` });
      continue;
    }

    const parseo = parsearResultadoSaber11(texto);
    if (!parseo.ok) {
      // El detalle técnico (texto extraído del PDF) queda solo en los logs
      // del servidor para diagnóstico — nunca se muestra al usuario final,
      // ya que puede contener datos personales del PDF.
      console.error(`[saber11] "${archivo.name}": ${parseo.motivo}\n${parseo.textoParaDiagnostico}`);
      fallidos.push({ archivo: archivo.name, motivo: parseo.motivo });
      continue;
    }
    const datos = parseo.datos;

    const { data: estudianteEncontrado } = await supabase
      .from("estudiantes")
      .select("id")
      .eq("institucion_id", institucionId)
      .eq("numero_documento", datos.numeroDocumento)
      .maybeSingle();

    const rutaPdf = `${institucionId}/individuales/${datos.anio}/${datos.numeroDocumento}.pdf`;
    const { error: errorSubida } = await supabase.storage
      .from("saber11-pdfs")
      .upload(rutaPdf, buffer, { contentType: "application/pdf", upsert: true });

    if (errorSubida) {
      fallidos.push({ archivo: archivo.name, motivo: `No se pudo guardar el PDF: ${errorSubida.message}` });
      continue;
    }

    const { error: errorGuardado } = await supabase.from("saber11_resultados_individuales").upsert(
      {
        institucion_id: institucionId,
        estudiante_id: estudianteEncontrado?.id ?? null,
        nombre_completo: datos.nombreCompleto,
        tipo_documento: datos.tipoDocumento,
        numero_documento: datos.numeroDocumento,
        numero_registro: datos.numeroRegistro,
        anio: datos.anio,
        fecha_aplicacion: datos.fechaAplicacion,
        fecha_publicacion: datos.fechaPublicacion,
        puntaje_global: datos.puntajeGlobal,
        percentil_global_nacional: datos.percentilGlobalNacional,
        percentil_global_etnico: datos.percentilGlobalEtnico,
        lectura_critica_puntaje: datos.areas.lecturaCritica.puntaje,
        lectura_critica_percentil_nacional: datos.areas.lecturaCritica.percentilNacional,
        lectura_critica_percentil_etnico: datos.areas.lecturaCritica.percentilEtnico,
        matematicas_puntaje: datos.areas.matematicas.puntaje,
        matematicas_percentil_nacional: datos.areas.matematicas.percentilNacional,
        matematicas_percentil_etnico: datos.areas.matematicas.percentilEtnico,
        sociales_ciudadanas_puntaje: datos.areas.socialesCiudadanas.puntaje,
        sociales_ciudadanas_percentil_nacional: datos.areas.socialesCiudadanas.percentilNacional,
        sociales_ciudadanas_percentil_etnico: datos.areas.socialesCiudadanas.percentilEtnico,
        ciencias_naturales_puntaje: datos.areas.cienciasNaturales.puntaje,
        ciencias_naturales_percentil_nacional: datos.areas.cienciasNaturales.percentilNacional,
        ciencias_naturales_percentil_etnico: datos.areas.cienciasNaturales.percentilEtnico,
        ingles_puntaje: datos.areas.ingles.puntaje,
        ingles_percentil_nacional: datos.areas.ingles.percentilNacional,
        ingles_percentil_etnico: datos.areas.ingles.percentilEtnico,
        pdf_path: rutaPdf,
        subido_por: user.id,
      },
      { onConflict: "institucion_id,numero_documento,anio" }
    );

    if (errorGuardado) {
      fallidos.push({ archivo: archivo.name, motivo: `No se pudo guardar el resultado: ${errorGuardado.message}` });
      continue;
    }

    creados.push({ archivo: archivo.name, nombre: datos.nombreCompleto, anio: datos.anio, puntajeGlobal: datos.puntajeGlobal });
  }

  await supabase.from("auditoria").insert({
    usuario_id: user.id,
    institucion_id: institucionId,
    accion: "importar_resultados_saber11",
    entidad: "saber11_resultados_individuales",
    detalle: { creados: creados.length, fallidos: fallidos.length },
  });

  return NextResponse.json({ error: null, creados, fallidos });
}
