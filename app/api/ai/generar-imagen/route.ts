import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { generarImagen } from "@/lib/ai/gemini";

// POST /api/ai/generar-imagen
// Genera una imagen de apoyo (Gemini) para una actividad y la sube a
// Storage. Devuelve la URL pública. Proveedor intercambiable: ver
// lib/ai/gemini.ts — el resto de la app no sabe qué proveedor se usa.
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { descripcion } = await req.json();
  if (!descripcion) return NextResponse.json({ error: "Falta la descripción de la imagen." }, { status: 400 });

  try {
    const buffer = await generarImagen(descripcion);
    const ruta = `${user.id}/${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage.from("imagenes-ia").upload(ruta, buffer, { contentType: "image/png" });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const url = supabase.storage.from("imagenes-ia").getPublicUrl(ruta).data.publicUrl;
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
