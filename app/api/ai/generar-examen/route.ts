import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { verificarLimiteIA } from "@/lib/ai/limite-uso";
// Usando Gemini temporalmente (tiene nivel gratuito) mientras se carga
// saldo en Anthropic. Para volver a Anthropic: cambia este import por
// `import { generarPreguntasExamen } from "@/lib/ai/anthropic";` - misma
// firma, no hay que tocar nada mas en este archivo.
import { generarPreguntasExamenGemini as generarPreguntasExamen } from "@/lib/ai/gemini";
import { generarImagenPregunta } from "@/lib/generarImagenPregunta";
import { numeroDeGrado } from "@/lib/banco/grado";
import { buscarEnBanco, copiarImagenDelBancoADocente, sumarUsoEnBanco } from "@/lib/banco/banco";
import type { ContextoExamen, PreguntaGenerada } from "@/lib/ai/tipos";

// El validador de la IA exige que cada lote traiga los 3 tipos de texto, asi que
// nunca se le pide menos de 6 preguntas (las que sobran se descartan).
const MIN_PEDIDO_IA = 6;

// POST /api/ai/generar-examen
// Genera un examen tipo ICFES contra el esquema REAL del proyecto:
// 1) Busca primero en el banco compartido de preguntas (misma asignatura, grado,
//    nivel y tema). 2) La IA genera solo las preguntas que faltan.
// - Cada pregunta se guarda como una fila en `preguntas` (copia para este examen).
// - El examen es una fila en `examenes` (version "A", estado pendiente_aprobacion).
// - `examen_preguntas` enlaza el examen con sus preguntas, en orden.
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

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
    .select("id, grado_id, area_id, grados(nombre), grupos(nombre), areas(nombre), asignaturas(nombre, catalogo_asignatura_id)")
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
    const admin = createAdminSupabaseClient();

    // 1) Banco de preguntas (solo si la asignatura viene del catalogo y el grado se reconoce)
    const catalogoAsignaturaId: string | null = (asignacion as any).asignaturas?.catalogo_asignatura_id ?? null;
    const gradoNumero = numeroDeGrado((asignacion as any).grados?.nombre ?? "");
    const delBanco =
      catalogoAsignaturaId && gradoNumero !== null
        ? await buscarEnBanco(admin, {
            catalogoAsignaturaId,
            grado: gradoNumero,
            tema,
            nivel: nivelDificultad,
            limite: numeroItems,
          })
        : [];

    // 2) La IA completa solo lo que falta
    const faltan = numeroItems - delBanco.length;
    let generadas: PreguntaGenerada[] = [];
    let intentos = 1;
    if (faltan > 0) {
      const limite = await verificarLimiteIA(supabase, user.id);
      if (!limite.permitido) {
        return NextResponse.json({ error: limite.mensaje }, { status: 429 });
      }
      const pedido = Math.max(faltan, MIN_PEDIDO_IA);
      const resultado = await generarPreguntasExamen({ ...ctx, numeroItems: pedido }, pedido);
      generadas = resultado.preguntas.slice(0, faltan);
      intentos = resultado.intentos;
    }

    // Imagenes: las preguntas nuevas "discontinuas" o "mixtas" generan su imagen con IA;
    // las del banco copian la que ya tienen (sin costo de IA).
    const imagenesGeneradas: Record<number, { ruta: string; urlFirmada: string }> = {};
    await Promise.all(
      generadas.map(async (p, idx) => {
        if (p.tipoTexto === "discontinuo" || p.tipoTexto === "mixto") {
          const imagen = await generarImagenPregunta(supabase, user.id, p.contexto);
          if (imagen) imagenesGeneradas[idx] = imagen;
        }
      })
    );
    const imagenesBanco: Record<number, { ruta: string; urlFirmada: string }> = {};
    await Promise.all(
      delBanco.map(async (p, idx) => {
        if (p.imagen_ruta) {
          const copia = await copiarImagenDelBancoADocente(admin, p.imagen_ruta, user.id);
          if (copia) imagenesBanco[idx] = copia;
        }
      })
    );

    const base = {
      institucion_id: perfil.institucion_id,
      docente_id: user.id,
      area_id: asignacion.area_id,
      grado_id: asignacion.grado_id,
      nivel_dificultad: nivelDificultad,
    };

    const filasBanco = delBanco.map((p, idx) => ({
      ...base,
      tema: p.tema,
      competencia: p.competencia,
      tipo_texto: p.tipo_texto,
      contexto: p.contexto ?? "",
      enunciado: p.enunciado,
      opciones: p.opciones,
      respuesta_correcta: p.respuesta_correcta,
      explicacion: p.explicacion,
      irt_dificultad: p.irt_dificultad,
      irt_discriminacion: p.irt_discriminacion,
      irt_adivinacion: p.irt_adivinacion,
      imagen_url: imagenesBanco[idx]?.ruta ?? null,
      banco_pregunta_id: p.id,
    }));

    const filasGeneradas = generadas.map((p, idx) => ({
      ...base,
      tema: p.tema,
      competencia: p.competencia,
      tipo_texto: p.tipoTexto,
      contexto: p.contexto,
      enunciado: p.enunciado,
      opciones: p.opciones,
      respuesta_correcta: p.respuestaCorrecta,
      explicacion: p.explicacion,
      irt_dificultad: p.irtDificultad,
      irt_discriminacion: p.irtDiscriminacion,
      irt_adivinacion: p.irtAdivinacion,
      imagen_url: imagenesGeneradas[idx]?.ruta ?? null,
      banco_pregunta_id: null,
    }));

    const filasPreguntas = [...filasBanco, ...filasGeneradas];
    const urlsFirmadas: (string | null)[] = [
      ...delBanco.map((_, idx) => imagenesBanco[idx]?.urlFirmada ?? null),
      ...generadas.map((_, idx) => imagenesGeneradas[idx]?.urlFirmada ?? null),
    ];

    const { data: preguntasGuardadas, error: errorPreguntas } = await supabase
      .from("preguntas").insert(filasPreguntas).select("id, tema, competencia, tipo_texto, contexto, enunciado, opciones, respuesta_correcta, explicacion, imagen_url");
    if (errorPreguntas || !preguntasGuardadas) {
      return NextResponse.json({ error: errorPreguntas?.message ?? "No se pudieron guardar las preguntas." }, { status: 500 });
    }

    // Adjunta la URL firmada (temporal) de cada imagen para la vista previa inmediata.
    const preguntasConImagen = preguntasGuardadas.map((p, idx) => ({
      ...p,
      imagen_url_firmada: urlsFirmadas[idx] ?? null,
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
        intentos_validacion: Math.max(intentos, 1),
      })
      .select("id, estado")
      .single();
    if (errorExamen || !examen) return NextResponse.json({ error: errorExamen?.message ?? "No se pudo crear el examen." }, { status: 500 });

    const filasVinculo = preguntasGuardadas.map((p, idx) => ({ examen_id: examen.id, pregunta_id: p.id, orden: idx + 1 }));
    const { error: errorVinculo } = await supabase.from("examen_preguntas").insert(filasVinculo);
    if (errorVinculo) return NextResponse.json({ error: errorVinculo.message }, { status: 500 });

    await sumarUsoEnBanco(admin, delBanco.map((p) => p.id));

    return NextResponse.json({
      examenId: examen.id,
      estado: examen.estado,
      preguntas: preguntasConImagen,
      desdeBanco: delBanco.length,
      generadasIA: generadas.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
