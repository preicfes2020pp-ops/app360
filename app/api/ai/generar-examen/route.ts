import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { verificarLimiteIA } from "@/lib/ai/limite-uso";
// Usando Gemini temporalmente (tiene nivel gratuito) mientras se carga
// saldo en Anthropic. Para volver a Anthropic: cambia este import por
// `import { generarPreguntasExamen } from "@/lib/ai/anthropic";` - misma
// firma, no hay que tocar nada mas en este archivo.
import { generarPreguntasExamenGemini as generarPreguntasExamen } from "@/lib/ai/gemini";
import { generarImagenPregunta } from "@/lib/generarImagenPregunta";
import type { ContextoExamen } from "@/lib/ai/tipos";

// POST /api/ai/generar-examen
// Genera un examen tipo ICFES contra el esquema REAL del proyecto:
// - Cada pregunta se guarda como una fila en `preguntas` (banco reutilizable,
//   con soporte para calibracion IRT a futuro).
// - El examen es una fila en `examenes` (version "A", estado
//   pendiente_aprobacion - seccion 3: nada se usa sin aprobacion).
// - `examen_preguntas` enlaza el examen con sus preguntas, en orden.
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const limite = await verificarLimiteIA(supabase, user.id);
  if (!limite.permitido) {
    return NextResponse.json({ error: limite.mensaje }, { status: 429 });
  }

  const { data: perfil } = await supabase.from("perfiles").select("rol, institucion_id").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "docente") return NextResponse.json({ error: "Solo un docente puede generar examenes." }, { status: 403 });

  const { asignacionId, tema, numeroItems, nivelDificultad } = await req.json();
  if (!asignacionId || !tema || !numeroItems || !nivelDificultad) {
    return NextResponse.json({ error: "Faltan datos: asignacionId, tema, numeroItems, nivelDificultad." }, { status: 400 });
  }
  if (numeroItems < 20) {
    return NextResponse.json({ error: "El examen debe tener al menos 20 preguntas, como los examenes tipo ICFES reales." }, { status: 400 });
  }

  const { data: asignacion } = await supabase
    .from("asignaciones_docente")
    .select("id, grado_id, area_id, grados(nombre), grupos(nombre), areas(nombre), asignaturas(nombre)")
    .eq("id", asignacionId).eq("docente_id", user.id).single();
  if (!asignacion) return NextResponse.json({ error: "Esa asignacion no existe o no te pertenece." }, { status: 404 });

  const ctx: ContextoExamen = {
    tema,
    grado: (asignacion as any).grados?.nombre ?? "",
    area: (asignacion as any).areas?.nombre ?? "",
    asignatura: (asignacion as any).asignaturas?.nombre ?? "",
    grupo: (asignacion as any).grupos?.nombre ?? "",
    numeroItems,
    nivelDificultad,
  };

  try {
    const { preguntas, intentos } = await generarPreguntasExamen(ctx, numeroItems);

    // Preguntas "discontinuas" -> se les genera una imagen real (tabla/grafico)
    // con Gemini, en vez de solo describirla en palabras dentro del contexto.
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
      institucion_id: perfil.institucion_id,
      docente_id: user.id,
      area_id: asignacion.area_id,
      grado_id: asignacion.grado_id,
      tema: p.tema,
      competencia: p.competencia,
      tipo_texto: p.tipoTexto,
      contexto: p.contexto,
      enunciado: p.enunciado,
      opciones: p.opciones,
      respuesta_correcta: p.respuestaCorrecta,
      explicacion: p.explicacion,
      nivel_dificultad: nivelDificultad,
      irt_dificultad: p.irtDificultad,
      irt_discriminacion: p.irtDiscriminacion,
      irt_adivinacion: p.irtAdivinacion,
      imagen_url: imagenesPorIndice[idx]?.ruta ?? null,
    }));

    const { data: preguntasGuardadas, error: errorPreguntas } = await supabase
      .from("preguntas").insert(filasPreguntas).select("id, tema, competencia, tipo_texto, contexto, enunciado, opciones, respuesta_correcta, explicacion, imagen_url");
    if (errorPreguntas || !preguntasGuardadas) {
      return NextResponse.json({ error: errorPreguntas?.message ?? "No se pudieron guardar las preguntas." }, { status: 500 });
    }

    // Adjunta la URL firmada (temporal) de cada imagen para la vista previa inmediata.
    const preguntasConImagen = preguntasGuardadas.map((p, idx) => ({
      ...p,
      imagen_url_firmada: imagenesPorIndice[idx]?.urlFirmada ?? null,
    }));

    const { data: examen, error: errorExamen } = await supabase
      .from("examenes")
      .insert({
        institucion_id: perfil.institucion_id,
        docente_id: user.id,
        asignacion_id: asignacionId,
        tema,
        version: "A",
        tipo: "tema",
        estado: "pendiente_aprobacion",
        intentos_validacion: intentos,
      })
      .select("id, estado")
      .single();
    if (errorExamen || !examen) return NextResponse.json({ error: errorExamen?.message ?? "No se pudo crear el examen." }, { status: 500 });

    const filasVinculo = preguntasGuardadas.map((p, idx) => ({ examen_id: examen.id, pregunta_id: p.id, orden: idx + 1 }));
    const { error: errorVinculo } = await supabase.from("examen_preguntas").insert(filasVinculo);
    if (errorVinculo) return NextResponse.json({ error: errorVinculo.message }, { status: 500 });

    return NextResponse.json({ examenId: examen.id, estado: examen.estado, preguntas: preguntasConImagen });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
