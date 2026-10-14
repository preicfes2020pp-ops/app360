import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { generarPreguntasExamenGemini as generarPreguntasExamen } from "@/lib/ai/gemini";
import { generarImagenPregunta } from "@/lib/generarImagenPregunta";
import type { ContextoExamen, PreguntaGenerada } from "@/lib/ai/tipos";

// Cada lote tarda entre 20 y 50 segundos (texto + imagenes): se pide el maximo
// que permite el plan de Vercel.
export const maxDuration = 60;

// Competencias oficiales de cada area evaluada por el ICFES (Saber 11).
const COMPETENCIAS_ICFES: Record<string, string> = {
  MAT: "Interpretación y representación; Formulación y ejecución; Argumentación",
  LEC: "Identificar y entender los contenidos locales que conforman un texto; Comprender cómo se articulan las partes de un texto para darle un sentido global; Reflexionar a partir de un texto y evaluar su contenido",
  NAT: "Uso comprensivo del conocimiento científico; Explicación de fenómenos; Indagación",
  SOC: "Pensamiento social; Interpretación y análisis de perspectivas; Pensamiento reflexivo y sistémico",
};

const NIVELES = ["basico", "intermedio", "avanzado"];

// POST /api/superadmin/banco/generar
// Genera UN lote de preguntas originales para el banco compartido y las guarda
// como "sin_revisar". Solo el superadmin puede llamarlo.
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "superadmin") {
    return NextResponse.json({ error: "Solo un superadmin puede llenar el banco." }, { status: 403 });
  }

  const { catalogoAsignaturaId, grado, tema, nivel, cantidad } = await req.json();
  const gradoNum = Number(grado);
  const cantidadNum = Number(cantidad);
  const temaLimpio = String(tema ?? "").trim().slice(0, 200);
  if (
    !catalogoAsignaturaId || !temaLimpio || !NIVELES.includes(nivel) ||
    !Number.isInteger(gradoNum) || gradoNum < 6 || gradoNum > 11 ||
    !Number.isInteger(cantidadNum) || cantidadNum < 6 || cantidadNum > 12
  ) {
    return NextResponse.json({ error: "Datos invalidos: revisa asignatura, grado (6 a 11), nivel, tema y cantidad (6 a 12)." }, { status: 400 });
  }

  const { data: asigCruda } = await supabase
    .from("catalogo_asignaturas")
    .select("id, nombre, catalogo_areas(codigo, nombre)")
    .eq("id", catalogoAsignaturaId)
    .single();
  const asig: any = asigCruda;
  const area: any = Array.isArray(asig?.catalogo_areas) ? asig.catalogo_areas[0] : asig?.catalogo_areas;
  if (!asig || !area) return NextResponse.json({ error: "Esa asignatura no existe." }, { status: 404 });

  const competencias = COMPETENCIAS_ICFES[area.codigo];
  if (!competencias) {
    return NextResponse.json({ error: "Esa area todavia no tiene fabrica de preguntas (solo las 4 areas ICFES por ahora)." }, { status: 400 });
  }

  const ctx: ContextoExamen = {
    tema: temaLimpio,
    grado: `Grado ${gradoNum}`,
    area: area.nombre,
    asignatura: asig.nombre,
    grupo: "Banco general de preguntas",
    numeroItems: cantidadNum,
    nivelDificultad: nivel,
  };
  const instrucciones =
    `Para el campo competencia usa exactamente una de estas competencias del ICFES para el área ${area.nombre}: ${competencias}. ` +
    `Todas las preguntas deben ser originales, de selección múltiple con única respuesta, y centradas en la asignatura ${asig.nombre}.`;

  let preguntas: PreguntaGenerada[];
  try {
    preguntas = (await generarPreguntasExamen(ctx, cantidadNum, instrucciones)).preguntas;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 502 });
  }

  const admin = createAdminSupabaseClient();
  const resumen = { solicitadas: preguntas.length, agregadas: 0, repetidas: 0, sinImagen: 0, errores: 0 };

  await Promise.all(
    preguntas.map(async (p) => {
      let imagen: { ruta: string; urlFirmada: string } | null = null;
      try {
        // Las preguntas discontinuas y mixtas necesitan su imagen; sin imagen no entran al banco.
        if (p.tipoTexto === "discontinuo" || p.tipoTexto === "mixto") {
          imagen = await generarImagenPregunta(supabase, user.id, p.contexto);
          if (!imagen) {
            resumen.sinImagen++;
            return;
          }
        }

        const subtema =
          p.tema && p.tema.trim().toLowerCase() !== temaLimpio.toLowerCase()
            ? `${temaLimpio} - ${p.tema.trim()}`
            : temaLimpio;

        const { data, error } = await admin
          .from("banco_preguntas")
          .upsert(
            {
              catalogo_asignatura_id: catalogoAsignaturaId,
              grado: gradoNum,
              tema: subtema,
              competencia: p.competencia,
              tipo_texto: p.tipoTexto,
              contexto: p.contexto || null,
              enunciado: p.enunciado,
              opciones: p.opciones,
              respuesta_correcta: p.respuestaCorrecta,
              explicacion: p.explicacion,
              nivel_dificultad: nivel,
              irt_dificultad: p.irtDificultad,
              irt_discriminacion: p.irtDiscriminacion,
              irt_adivinacion: p.irtAdivinacion,
              estado: "sin_revisar",
              origen: "ia",
              creado_por: user.id,
            },
            { onConflict: "huella", ignoreDuplicates: true }
          )
          .select("id");
        if (error) {
          console.error("Fabrica del banco: no se pudo guardar una pregunta:", error.message);
          resumen.errores++;
          return;
        }
        if (!data || data.length === 0) {
          resumen.repetidas++;
          return;
        }
        const id = data[0].id as string;

        if (imagen) {
          let copiada = false;
          const { data: archivo, error: errorBajar } = await admin.storage.from("documentos").download(imagen.ruta);
          if (!errorBajar && archivo) {
            const buffer = Buffer.from(await archivo.arrayBuffer());
            const { error: errorSubir } = await admin.storage
              .from("banco-imagenes")
              .upload(`${id}.png`, buffer, { contentType: "image/png", upsert: true });
            if (!errorSubir) {
              const { error: errorActualizar } = await admin
                .from("banco_preguntas")
                .update({ imagen_ruta: `${id}.png` })
                .eq("id", id);
              copiada = !errorActualizar;
            }
          }
          if (!copiada) {
            await admin.from("banco_preguntas").delete().eq("id", id);
            resumen.sinImagen++;
            return;
          }
        }
        resumen.agregadas++;
      } catch (e) {
        console.error("Fabrica del banco: error inesperado:", e);
        resumen.errores++;
      } finally {
        // La imagen temporal vive en la carpeta del superadmin: se borra siempre.
        if (imagen) await admin.storage.from("documentos").remove([imagen.ruta]);
      }
    })
  );

  return NextResponse.json(resumen);
}
