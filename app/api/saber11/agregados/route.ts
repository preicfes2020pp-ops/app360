import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const MAX_TAMANO_PDF_BYTES = 20 * 1024 * 1024; // 20 MB (el agregado trae a todos los estudiantes)

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
    return NextResponse.json({ error: "No se recibió el archivo PDF." }, { status: 400 });
  }
  const anio = parseInt(String(anioRaw), 10);
  const anioActual = new Date().getFullYear();
  if (!anio || anio < anioActual - 10 || anio > anioActual) {
    return NextResponse.json(
      { error: `El año debe estar entre ${anioActual - 10} y ${anioActual}.` },
      { status: 400 }
    );
  }
  if (archivo.type !== "application/pdf") {
    return NextResponse.json({ error: "El archivo debe ser un PDF." }, { status: 400 });
  }
  if (archivo.size > MAX_TAMANO_PDF_BYTES) {
    return NextResponse.json({ error: "El archivo pesa más de 20 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const rutaPdf = `${institucionId}/agregados/${anio}.pdf`;

  const { error: errorSubida } = await supabase.storage
    .from("saber11-pdfs")
    .upload(rutaPdf, buffer, { contentType: "application/pdf", upsert: true });

  if (errorSubida) {
    return NextResponse.json(
      { error: `No se pudo guardar el PDF: ${errorSubida.message}` },
      { status: 400 }
    );
  }

  const { error: errorGuardado } = await supabase
    .from("saber11_reportes_agregados")
    .upsert(
      { institucion_id: institucionId, anio, pdf_path: rutaPdf, subido_por: user.id },
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
    detalle: { anio },
  });

  return NextResponse.json({ error: null, anio });
}
