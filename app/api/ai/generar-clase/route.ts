import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { generarClase } from "@/lib/ai/anthropic";
import type { ContextoGeneracion } from "@/lib/ai/tipos";

// POST /api/ai/generar-clase
// Genera una clase nueva (planeación + 3 actividades + tarea + refuerzo)
// a partir de una asignación real del docente autenticado, y la guarda
// como "pendiente_aprobacion" (sección 3: nada se usa sin aprobación).
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { data: perfil } = await supabase.from("perfiles").select("rol, institucion_id").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "docente") return NextResponse.json({ error: "Solo un docente puede generar clases." }, { status: 403 });

  const body = await req.json();
  const { asignacionId, tema, tiempoClaseMinutos, nivelDificultad } = body;
  if (!asignacionId || !tema || !tiempoClaseMinutos || !nivelDificultad) {
    return NextResponse.json({ error: "Faltan datos: asignacionId, tema, tiempoClaseMinutos, nivelDificultad." }, { status: 400 });
  }

  // La asignación debe pertenecer al docente autenticado (RLS ya lo exige,
  // pero validamos explícito para dar un error claro).
  const { data: asignacion } = await supabase
    .from("asignaciones_docente")
    .select("id, grados(nombre), grupos(nombre), areas(nombre, id), asignaturas(nombre)")
    .eq("id", asignacionId).eq("docente_id", user.id).single();

  if (!asignacion) return NextResponse.json({ error: "Esa asignación no existe o no te pertenece." }, { status: 404 });

  // Contexto adicional: el plan de área más reciente del docente para esa área/grado, si existe (Fase 2).
  const { data: plan } = await supabase
    .from("area_plans")
    .select("competencias, estandares, temas")
    .eq("docente_id", user.id)
    .eq("area_id", (asignacion as any).areas?.id)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  const ctx: ContextoGeneracion = {
    tema,
    grado: (asignacion as any).grados?.nombre ?? "",
    area: (asignacion as any).areas?.nombre ?? "",
    asignatura: (asignacion as any).asignaturas?.nombre ?? "",
    grupo: (asignacion as any).grupos?.nombre ?? "",
    tiempoClaseMinutos,
    nivelDificultad,
    planDeArea: plan ?? null,
  };

  try {
    const contenido = await generarClase(ctx);
    const { data: guardado, error } = await supabase
      .from("ai_generaciones")
      .insert({
        institucion_id: perfil.institucion_id, docente_id: user.id, asignacion_id: asignacionId,
        tema, tiempo_clase_minutos: tiempoClaseMinutos, nivel_dificultad: nivelDificultad,
        contenido, estado: "pendiente_aprobacion",
      })
      .select("id, contenido, estado")
      .single();

    if (error || !guardado) return NextResponse.json({ error: error?.message ?? "No se pudo guardar la generación." }, { status: 500 });
    return NextResponse.json(guardado);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
