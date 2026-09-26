import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const MAX_TAMANO_BYTES = 20 * 1024 * 1024; // 20 MB (el agregado trae a todos los estudiantes)

// El ICFES entrega los reportes agregados tanto en PDF como en Excel.
const TIPOS_PERMITIDOS: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
};

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, institucion_id")
    .eq("id", user.id)
    .single();

  if (!perfil || !["rector", "coordinador", "superadmin"].includes(perfil.rol)) {
    return NextResponse.json(
      { error: "No tienes permiso para subir el reporte agregado." },
      { status: 403 }
    );
  }
  if (!perfil.institucion_id) {
    return NextResponse.json({ error: "No se encontró tu institución." }, { status: 400 });
  }
  const institucionId = perfil.institucion_id;

  const formData = await request.formData();
  const archivo = formData.get("pdf");
  const anioRaw = formData.get("anio");

  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  }
  const anio = parseInt(String(anioRaw), 10);
  const anioActual = new Date().getFullYear();
  if (!anio || anio < anioActual - 10 || anio > anioActual) {
    return NextResponse.json(
      { error: `El año debe estar entre ${anioActual - 10} y ${anioActual}.` },
      { status: 400 }
    );
  }

  // Detecta el tipo por el nombre del archivo si el navegador no mandó un
  // "type" reconocible (pasa a veces con .xls en algunos navegadores).
  const extensionPorNombre = archivo.name.toLowerCase().split(".").pop();
  const extension =
    TIPOS_PERMITIDOS[archivo.type] ??
    (extensionPorNombre === "pdf" || extensionPorNombre === "xlsx" || extensionPorNombre === "xls"
      ? extensionPorNombre
      : null);

  if (!extension) {
    return NextResponse.json(
      { error: "El archivo debe ser un PDF o un Excel (.xlsx / .xls)." },
      { status: 400 }
    );
  }
  if (archivo.size > MAX_TAMANO_BYTES) {
    return NextResponse.json({ error: "El archivo pesa más de 20 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const rutaArchivo = `${institucionId}/agregados/${anio}.${extension}`;
  const contentType =
    archivo.type ||
    (extension === "pdf"
      ? "application/pdf"
      : extension === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/vnd.ms-excel");

  // Si ya existía un reporte de este año en el otro formato (por ejemplo
  // subieron antes el PDF y ahora suben el Excel), se borra el anterior
  // para no dejar dos archivos huérfanos del mismo año.
  const { data: reporteExistente } = await supabase
    .from("saber11_reportes_agregados")
    .select("pdf_path")
    .eq("institucion_id", institucionId)
    .eq("anio", anio)
    .maybeSingle();

  if (reporteExistente && reporteExistente.pdf_path !== rutaArchivo) {
    await supabase.storage.from("saber11-pdfs").remove([reporteExistente.pdf_path]);
  }

  const { error: errorSubida } = await supabase.storage
    .from("saber11-pdfs")
    .upload(rutaArchivo, buffer, { contentType, upsert: true });

  if (errorSubida) {
    return NextResponse.json(
      { error: `No se pudo guardar el archivo: ${errorSubida.message}` },
      { status: 400 }
    );
  }

  const { error: errorGuardado } = await supabase
    .from("saber11_reportes_agregados")
    .upsert(
      { institucion_id: institucionId, anio, pdf_path: rutaArchivo, subido_por: user.id },
      { onConflict: "institucion_id,anio" }
    );

  if (errorGuardado) {
    return NextResponse.json(
      { error: `No se pudo registrar el reporte: ${errorGuardado.message}` },
      { status: 400 }
    );
  }

  await supabase.from("auditoria").insert({
    usuario_id: user.id,
    institucion_id: institucionId,
    accion: "subir_reporte_agregado_saber11",
    entidad: "saber11_reportes_agregados",
    detalle: { anio, formato: extension },
  });

  return NextResponse.json({ error: null, anio });
}
