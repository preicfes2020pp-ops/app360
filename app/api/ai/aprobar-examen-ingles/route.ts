import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { generarExamenInglesGemini } from "@/lib/ai/gemini";
import { PARTES_INGLES_ICFES } from "@/lib/ai/ingles-compartido";

// POST /api/ai/aprobar-examen-ingles
// A diferencia del examen genérico, el de inglés NO genera versiones B/C
// al aprobar: barajar preguntas rompería la correspondencia entre los
// espacios numerados del texto (partes 4 y 7) y sus preguntas, y el banco
// compartido de la parte 2. Queda como mejora simplificada — documentada
// en PROGRESO_AULA360.md.
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "docente") return NextResponse.json({ error: "Solo un docente puede aprobar exámenes." }, { status: 403 });

  const { examenId, aprobado, instrucciones } = await req.json();
  if (!examenId) return NextResponse.json({ error: "Falta examenId." }, { status: 400 });

  const { data: examen } = await supabase
    .from("examenes")
    .select("id, docente_id, institucion_id, asignacion_id, tema, estado")
    .eq("id", examenId).eq("docente_id", user.id).single();
  if (!examen) return NextResponse.json({ error: "Examen no encontrado." }, { status: 404 });

  if (aprobado) {
    const { error } = await supabase.from("examenes").update({ estado: "aprobado" }).eq("id", examenId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, estado: "aprobado" });
  }

  if (!instrucciones?.trim()) return NextResponse.json({ error: "Indica qué deseas mejorar." }, { status: 400 });

  const { data: asignacion } = await supabase
    .from("asignaciones_docente").select("area_id, grado_id").eq("id", examen.asignacion_id).single();

  try {
    const examenIA = await generarExamenInglesGemini(examen.tema, instrucciones);

    const filasPreguntas: any[] = [];
    for (const spec of PARTES_INGLES_ICFES) {
      const parte = examenIA.partes.find((p: any) => p.numero === spec.numero);
      for (const [idx, p] of parte.preguntas.entries()) {
        const opciones = spec.numero === 2 ? parte.opciones : p.opciones;
        const enunciado = spec.numero === 4 || spec.numero === 7 ? `Espacio (${p.numeroEspacio ?? idx + 1}) del texto.` : p.texto;
        filasPreguntas.push({
          institucion_id: examen.institucion_id, docente_id: user.id,
          area_id: asignacion?.area_id, grado_id: asignacion?.grado_id,
          tema: examen.tema, competencia: `Parte ${spec.numero} — ${spec.titulo} (MCER ${spec.nivelCEFR})`,
          tipo_texto: "continuo",
          contexto: spec.tieneTextoBase ? parte.textoBase : (spec.numero === 2 ? "Vocabulario — banco de opciones compartido de la Parte 2." : ""),
          enunciado, opciones, respuesta_correcta: p.respuestaCorrecta, explicacion: p.explicacion,
          nivel_dificultad: spec.nivelCEFR === "B1" ? "avanzado" : spec.nivelCEFR === "A2" ? "intermedio" : "basico",
          irt_dificultad: p.irtDificultad, irt_discriminacion: p.irtDiscriminacion, irt_adivinacion: p.irtAdivinacion,
        });
      }
    }

    const { data: nuevasPreguntas, error: errorPreguntas } = await supabase
      .from("preguntas").insert(filasPreguntas).select("id, competencia, tipo_texto, contexto, enunciado, opciones, respuesta_correcta, explicacion");
    if (errorPreguntas || !nuevasPreguntas) return NextResponse.json({ error: errorPreguntas?.message ?? "No se pudieron guardar las preguntas." }, { status: 500 });

    await supabase.from("examen_preguntas").delete().eq("examen_id", examenId);
    const filasVinculo = nuevasPreguntas.map((p, idx) => ({ examen_id: examenId, pregunta_id: p.id, orden: idx + 1 }));
    const { error: errorVinculo } = await supabase.from("examen_preguntas").insert(filasVinculo);
    if (errorVinculo) return NextResponse.json({ error: errorVinculo.message }, { status: 500 });

    return NextResponse.json({ examenId, estado: "pendiente_aprobacion", preguntas: nuevasPreguntas });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
