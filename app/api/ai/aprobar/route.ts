import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { generarClase } from "@/lib/ai/anthropic";
import type { ContextoGeneracion } from "@/lib/ai/tipos";

// POST /api/ai/aprobar
// Implementa el flujo obligatorio de la sección 3:
// - aprobado=true  -> marca la generación como aprobada, tal cual está.
// - aprobado=false -> el docente debe indicar QUÉ mejorar; la IA
//   regenera teniendo en cuenta esa instrucción, y se guarda en el
//   historial (nunca se pierde la versión anterior).
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { generacionId, aprobado, instruccionesMejora } = await req.json();
  if (!generacionId) return NextResponse.json({ error: "Falta generacionId." }, { status: 400 });

  const { data: generacion } = await supabase
    .from("ai_generaciones")
    .select("id, docente_id, contenido, historial, tema, tiempo_clase_minutos, nivel_dificultad, asignaciones_docente(grados(nombre), grupos(nombre), areas(nombre), asignaturas(nombre))")
    .eq("id", generacionId).eq("docente_id", user.id).single();

  if (!generacion) return NextResponse.json({ error: "Generación no encontrada." }, { status: 404 });

  if (aprobado) {
    const { error } = await supabase.from("ai_generaciones").update({ estado: "aprobado", actualizado_en: new Date().toISOString() }).eq("id", generacionId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, estado: "aprobado" });
  }

  if (!instruccionesMejora?.trim()) {
    return NextResponse.json({ error: "Indica qué deseas mejorar." }, { status: 400 });
  }

  const asig: any = generacion.asignaciones_docente;
  const ctx: ContextoGeneracion = {
    tema: generacion.tema,
    grado: asig?.grados?.nombre ?? "",
    area: asig?.areas?.nombre ?? "",
    asignatura: asig?.asignaturas?.nombre ?? "",
    grupo: asig?.grupos?.nombre ?? "",
    tiempoClaseMinutos: generacion.tiempo_clase_minutos,
    nivelDificultad: generacion.nivel_dificultad,
  };

  try {
    const nuevoContenido = await generarClase(ctx, instruccionesMejora);
    const nuevoHistorial = [...(generacion.historial ?? []), {
      fecha: new Date().toISOString(), instruccionesMejora, contenidoAnterior: generacion.contenido,
    }];

    const { data: actualizado, error } = await supabase
      .from("ai_generaciones")
      .update({ contenido: nuevoContenido, historial: nuevoHistorial, estado: "pendiente_aprobacion", actualizado_en: new Date().toISOString() })
      .eq("id", generacionId)
      .select("id, contenido, estado")
      .single();

    if (error || !actualizado) return NextResponse.json({ error: error?.message ?? "No se pudo actualizar." }, { status: 500 });
    return NextResponse.json(actualizado);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
