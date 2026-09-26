import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { leerHojaRespuestasGemini } from "@/lib/ai/gemini";

const MAX_TAMANO_BYTES = 10 * 1024 * 1024; // 10 MB (una foto de celular cabe de sobra)
const TIPOS_PERMITIDOS = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

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
    .select("rol")
    .eq("id", user.id)
    .single();

  if (!perfil || !["docente", "rector", "coordinador", "superadmin"].includes(perfil.rol)) {
    return NextResponse.json({ error: "No tienes permiso para calificar exámenes." }, { status: 403 });
  }

  const formData = await request.formData();
  const examenId = formData.get("examenId");
  const estudianteId = formData.get("estudianteId");
  const archivo = formData.get("archivo");

  if (typeof examenId !== "string" || typeof estudianteId !== "string") {
    return NextResponse.json({ error: "Falta el examen o el estudiante." }, { status: 400 });
  }
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  }
  if (!TIPOS_PERMITIDOS.has(archivo.type)) {
    return NextResponse.json(
      { error: "El archivo debe ser una foto (JPG/PNG/WEBP/HEIC) o un PDF." },
      { status: 400 }
    );
  }
  if (archivo.size > MAX_TAMANO_BYTES) {
    return NextResponse.json({ error: "El archivo pesa más de 10 MB." }, { status: 400 });
  }

  // El examen debe existir y ser del docente autenticado (o de su
  // institución si es rector/coordinador). La RLS de "examenes" ya lo
  // filtra automáticamente al usar el cliente autenticado del usuario.
  const { data: itemsExamen, error: errorItems } = await supabase
    .from("examen_preguntas")
    .select("orden, preguntas(respuesta_correcta)")
    .eq("examen_id", examenId)
    .order("orden", { ascending: true });

  if (errorItems || !itemsExamen || itemsExamen.length === 0) {
    return NextResponse.json(
      { error: "No se encontró el examen, o no tienes permiso sobre él." },
      { status: 404 }
    );
  }

  const numeroPreguntas = itemsExamen.length;
  const buffer = Buffer.from(await archivo.arrayBuffer());
  const base64 = buffer.toString("base64");

  let detectadas;
  try {
    detectadas = await leerHojaRespuestasGemini(base64, archivo.type, numeroPreguntas);
  } catch (errorLectura) {
    const mensaje = errorLectura instanceof Error ? errorLectura.message : String(errorLectura);
    await supabase.from("hojas_respuesta").upsert(
      {
        examen_id: examenId,
        estudiante_id: estudianteId,
        archivo_path: "",
        estado: "error",
        error_detalle: mensaje,
        subido_por: user.id,
      },
      { onConflict: "examen_id,estudiante_id" }
    );
    return NextResponse.json(
      { error: `No se pudo leer la hoja de respuestas: ${mensaje}` },
      { status: 502 }
    );
  }

  let correctas = 0;
  let incorrectas = 0;
  let sinMarcar = 0;
  const detalle = itemsExamen.map((item, idx) => {
    const respuestaCorrecta = (item.preguntas as unknown as { respuesta_correcta: string })
      ?.respuesta_correcta;
    const marcada = detectadas[idx]?.letra ?? null;

    if (marcada === null) {
      sinMarcar++;
    } else if (marcada === respuestaCorrecta) {
      correctas++;
    } else {
      incorrectas++;
    }

    return { numero: idx + 1, marcada, correcta: respuestaCorrecta, acerto: marcada === respuestaCorrecta };
  });

  const puntajePorcentaje = Math.round((correctas / numeroPreguntas) * 10000) / 100;

  const extension = archivo.type === "application/pdf" ? "pdf" : archivo.type.split("/")[1] ?? "jpg";
  const rutaArchivo = `${examenId}/${estudianteId}.${extension}`;

  const { error: errorSubida } = await supabase.storage
    .from("hojas-respuesta")
    .upload(rutaArchivo, buffer, { contentType: archivo.type, upsert: true });

  if (errorSubida) {
    return NextResponse.json(
      { error: `No se pudo guardar la hoja de respuestas: ${errorSubida.message}` },
      { status: 400 }
    );
  }

  const { error: errorGuardado } = await supabase.from("hojas_respuesta").upsert(
    {
      examen_id: examenId,
      estudiante_id: estudianteId,
      archivo_path: rutaArchivo,
      respuestas: detalle,
      correctas,
      incorrectas,
      sin_marcar: sinMarcar,
      puntaje_porcentaje: puntajePorcentaje,
      estado: "calificada",
      error_detalle: null,
      subido_por: user.id,
      calificado_en: new Date().toISOString(),
    },
    { onConflict: "examen_id,estudiante_id" }
  );

  if (errorGuardado) {
    return NextResponse.json(
      { error: `No se pudo registrar la calificación: ${errorGuardado.message}` },
      { status: 400 }
    );
  }

  return NextResponse.json({
    error: null,
    correctas,
    incorrectas,
    sinMarcar,
    totalPreguntas: numeroPreguntas,
    puntajePorcentaje,
  });
}