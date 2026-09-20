import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
// Ver nota en app/api/ai/generar-examen/route.ts sobre este cambio temporal a Gemini.
import { generarPreguntasExamenGemini as generarPreguntasExamen } from "@/lib/ai/gemini";
import { generarImagenPregunta } from "@/lib/generarImagenPregunta";
import { barajarOrdenPreguntas } from "@/lib/barajarOrdenPreguntas";
import type { ContextoExamen } from "@/lib/ai/tipos";

// POST /api/ai/aprobar-examen
// aprobado=true  -> marca la versión A como aprobada y crea las versiones
//   B y C (nuevas filas en `examenes`, mismas preguntas pero en otro orden
//   — ver lib/barajarOrdenPreguntas.ts sobre el alcance de esta mezcla).
// aprobado=false -> descarta las preguntas de este intento (quedan en el
//   banco por si sirven después) y genera un juego nuevo; no hay columna
//   de historial en `examenes`, así que no se conserva el intento anterior,
//   solo cuenta cuántos intentos ha llevado en `intentos_validacion`.
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
    .select("id, docente_id, institucion_id, asignacion_id, tema, version, tipo, estado, intentos_validacion")
    .eq("id", examenId).eq("docente_id", user.id).single();
  if (!examen) return NextResponse.json({ error: "Examen no encontrado." }, { status: 404 });
  if (examen.version !== "A") return NextResponse.json({ error: "Solo la versión A se aprueba o regenera directamente." }, { status: 400 });

  const { data: vinculos } = await supabase
    .from("examen_preguntas")
    .select("orden, preguntas(id, tema, competencia, tipo_texto, contexto, enunciado, opciones, respuesta_correcta, explicacion, nivel_dificultad, area_id, grado_id, institucion_id, docente_id)")
    .eq("examen_id", examenId)
    .order("orden");
  const preguntasActuales = (vinculos ?? []).map((v: any) => v.preguntas);

  if (aprobado) {
    const { error: errorAprobar } = await supabase.from("examenes").update({ estado: "aprobado" }).eq("id", examenId);
    if (errorAprobar) return NextResponse.json({ error: errorAprobar.message }, { status: 500 });

    const preguntaIds = preguntasActuales.map((p: any) => p.id);

    for (const letra of ["B", "C"] as const) {
      const { data: nuevaVersion, error: errorVersion } = await supabase
        .from("examenes")
        .insert({
          institucion_id: examen.institucion_id, docente_id: user.id, asignacion_id: examen.asignacion_id,
          tema: examen.tema, version: letra, tipo: examen.tipo, estado: "aprobado", intentos_validacion: 1,
        })
        .select("id").single();
      if (errorVersion || !nuevaVersion) return NextResponse.json({ error: `No se pudo crear la versión ${letra}: ${errorVersion?.message}` }, { status: 500 });

      const ordenBarajado = barajarOrdenPreguntas(preguntaIds, examenId, letra);
      const filas = ordenBarajado.map((preguntaId, idx) => ({ examen_id: nuevaVersion.id, pregunta_id: preguntaId, orden: idx + 1 }));
      const { error: errorLink } = await supabase.from("examen_preguntas").insert(filas);
      if (errorLink) return NextResponse.json({ error: `No se pudo enlazar la versión ${letra}: ${errorLink.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, estado: "aprobado" });
  }

  if (!instrucciones?.trim()) return NextResponse.json({ error: "Indica qué deseas mejorar." }, { status: 400 });

  const { data: asignacion } = await supabase
    .from("asignaciones_docente")
    .select("grados(nombre), grupos(nombre), areas(nombre), asignaturas(nombre)")
    .eq("id", examen.asignacion_id).single();

  const ctx: ContextoExamen = {
    tema: examen.tema,
    grado: (asignacion as any)?.grados?.nombre ?? "",
    area: (asignacion as any)?.areas?.nombre ?? "",
    asignatura: (asignacion as any)?.asignaturas?.nombre ?? "",
    grupo: (asignacion as any)?.grupos?.nombre ?? "",
    numeroItems: preguntasActuales.length,
    nivelDificultad: (preguntasActuales[0]?.nivel_dificultad ?? "intermedio") as any,
  };

  try {
    const { preguntas, intentos } = await generarPreguntasExamen(ctx, ctx.numeroItems, instrucciones);

    const imagenesPorIndice: Record<number, { ruta: string; urlFirmada: string }> = {};
    await Promise.all(
      preguntas.map(async (p, idx) => {
        if (p.tipoTexto === "discontinuo" || p.tipoTexto === "mixto") {
          const imagen = await generarImagenPregunta(supabase, user.id, p.contexto);
          if (imagen) imagenesPorIndice[idx] = imagen;
        }
      })
    );

    const filasPreguntas = preguntas.map((p, idx) => ({
      institucion_id: examen.institucion_id, docente_id: user.id,
      area_id: preguntasActuales[0]?.area_id, grado_id: preguntasActuales[0]?.grado_id,
      tema: p.tema, competencia: p.competencia, tipo_texto: p.tipoTexto, contexto: p.contexto,
      enunciado: p.enunciado, opciones: p.opciones, respuesta_correcta: p.respuestaCorrecta,
      explicacion: p.explicacion, nivel_dificultad: ctx.nivelDificultad,
      irt_dificultad: p.irtDificultad, irt_discriminacion: p.irtDiscriminacion, irt_adivinacion: p.irtAdivinacion,
      imagen_url: imagenesPorIndice[idx]?.ruta ?? null,
    }));
    const { data: nuevasPreguntas, error: errorPreguntas } = await supabase
      .from("preguntas").insert(filasPreguntas).select("id, tema, competencia, tipo_texto, contexto, enunciado, opciones, respuesta_correcta, explicacion, imagen_url");
    if (errorPreguntas || !nuevasPreguntas) return NextResponse.json({ error: errorPreguntas?.message ?? "No se pudieron guardar las preguntas." }, { status: 500 });

    const preguntasConImagen = nuevasPreguntas.map((p, idx) => ({
      ...p,
      imagen_url_firmada: imagenesPorIndice[idx]?.urlFirmada ?? null,
    }));

    await supabase.from("examen_preguntas").delete().eq("examen_id", examenId);
    const filasVinculo = nuevasPreguntas.map((p, idx) => ({ examen_id: examenId, pregunta_id: p.id, orden: idx + 1 }));
    const { error: errorVinculo } = await supabase.from("examen_preguntas").insert(filasVinculo);
    if (errorVinculo) return NextResponse.json({ error: errorVinculo.message }, { status: 500 });

    await supabase.from("examenes").update({ intentos_validacion: examen.intentos_validacion + intentos }).eq("id", examenId);

    return NextResponse.json({ examenId, estado: "pendiente_aprobacion", preguntas: preguntasConImagen });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
