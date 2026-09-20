import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { generarExamenInglesGemini } from "@/lib/ai/gemini";
import { PARTES_INGLES_ICFES } from "@/lib/ai/ingles-compartido";

// POST /api/ai/generar-examen-ingles
// Genera el examen COMPLETO de inglés (45 preguntas, 7 partes oficiales
// del ICFES) en una sola llamada, y lo aplana en filas de `preguntas`
// (una por pregunta) + `examen_preguntas` (orden 1-45 continuo). El orden
// de cada parte es siempre el mismo (fijo, oficial), así que no hace
// falta guardar a qué parte pertenece cada fila: se reconstruye por
// posición usando PARTES_INGLES_ICFES en el momento de imprimir.
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { data: perfil } = await supabase.from("perfiles").select("rol, institucion_id").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "docente") return NextResponse.json({ error: "Solo un docente puede generar exámenes." }, { status: 403 });

  const { asignacionId, tema } = await req.json();
  if (!asignacionId || !tema) return NextResponse.json({ error: "Faltan datos: asignacionId, tema." }, { status: 400 });

  const { data: asignacion } = await supabase
    .from("asignaciones_docente")
    .select("id, grado_id, area_id")
    .eq("id", asignacionId).eq("docente_id", user.id).single();
  if (!asignacion) return NextResponse.json({ error: "Esa asignación no existe o no te pertenece." }, { status: 404 });

  try {
    const examenIA = await generarExamenInglesGemini(tema);

    const filasPreguntas: any[] = [];
    for (const spec of PARTES_INGLES_ICFES) {
      const parte = examenIA.partes.find((p: any) => p.numero === spec.numero);
      for (const [idx, p] of parte.preguntas.entries()) {
        const opciones = spec.numero === 2 ? parte.opciones : p.opciones;
        const enunciado =
          spec.numero === 4 || spec.numero === 7
            ? `Espacio (${p.numeroEspacio ?? idx + 1}) del texto.`
            : p.texto;
        filasPreguntas.push({
          institucion_id: perfil.institucion_id,
          docente_id: user.id,
          area_id: asignacion.area_id,
          grado_id: asignacion.grado_id,
          tema,
          competencia: `Parte ${spec.numero} — ${spec.titulo} (MCER ${spec.nivelCEFR})`,
          tipo_texto: "continuo",
          contexto: spec.tieneTextoBase ? parte.textoBase : (spec.numero === 2 ? "Vocabulario — banco de opciones compartido de la Parte 2." : ""),
          enunciado,
          opciones,
          respuesta_correcta: p.respuestaCorrecta,
          explicacion: p.explicacion,
          nivel_dificultad: spec.nivelCEFR === "B1" ? "avanzado" : spec.nivelCEFR === "A2" ? "intermedio" : "basico",
          irt_dificultad: p.irtDificultad,
          irt_discriminacion: p.irtDiscriminacion,
          irt_adivinacion: p.irtAdivinacion,
        });
      }
    }

    const { data: preguntasGuardadas, error: errorPreguntas } = await supabase
      .from("preguntas").insert(filasPreguntas).select("id, competencia, tipo_texto, contexto, enunciado, opciones, respuesta_correcta, explicacion");
    if (errorPreguntas || !preguntasGuardadas) {
      return NextResponse.json({ error: errorPreguntas?.message ?? "No se pudieron guardar las preguntas." }, { status: 500 });
    }

    const { data: examen, error: errorExamen } = await supabase
      .from("examenes")
      .insert({
        institucion_id: perfil.institucion_id, docente_id: user.id, asignacion_id: asignacionId,
        tema, version: "A", tipo: "ingles_saber11", estado: "pendiente_aprobacion", intentos_validacion: 1,
      })
      .select("id, estado").single();
    if (errorExamen || !examen) return NextResponse.json({ error: errorExamen?.message ?? "No se pudo crear el examen." }, { status: 500 });

    const filasVinculo = preguntasGuardadas.map((p, idx) => ({ examen_id: examen.id, pregunta_id: p.id, orden: idx + 1 }));
    const { error: errorVinculo } = await supabase.from("examen_preguntas").insert(filasVinculo);
    if (errorVinculo) return NextResponse.json({ error: errorVinculo.message }, { status: 500 });

    return NextResponse.json({ examenId: examen.id, estado: examen.estado, preguntas: preguntasGuardadas });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
