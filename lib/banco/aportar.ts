import type { SupabaseClient } from "@supabase/supabase-js";

// Una pregunta de un examen ya aprobado, lista para aportarla al banco.
export type PreguntaDeExamen = {
  tema: string;
  competencia: string | null;
  tipo_texto: string;
  contexto: string | null;
  enunciado: string;
  opciones: Record<string, string>;
  respuesta_correcta: string;
  explicacion: string;
  nivel_dificultad: string;
  irt_dificultad: number | null;
  irt_discriminacion: number | null;
  irt_adivinacion: number | null;
  imagen_url: string | null;
  banco_pregunta_id: string | null;
};

const ALMACEN_BANCO = "banco-imagenes";
const ALMACEN_DOCENTE = "documentos";

// Suma al banco compartido las preguntas de un examen que el docente acaba de aprobar.
// - Entran como "sin_revisar" (solo el superadmin las marca como "verificada").
// - Las que ya vinieron del banco no se vuelven a agregar.
// - Si la pregunta ya existe en el banco (mismo texto), la base de datos la ignora.
// - Si algo falla, no afecta la aprobacion del examen: se registra el error y listo.
export async function aportarPreguntasAlBanco(
  admin: SupabaseClient,
  p: { docenteId: string; catalogoAsignaturaId: string; grado: number; preguntas: PreguntaDeExamen[] }
): Promise<number> {
  let agregadas = 0;
  const nuevas = p.preguntas.filter((q) => !q.banco_pregunta_id);

  await Promise.all(
    nuevas.map(async (q) => {
      try {
        const { data, error } = await admin
          .from("banco_preguntas")
          .upsert(
            {
              catalogo_asignatura_id: p.catalogoAsignaturaId,
              grado: p.grado,
              tema: q.tema,
              competencia: q.competencia,
              tipo_texto: q.tipo_texto,
              contexto: q.contexto || null,
              enunciado: q.enunciado,
              opciones: q.opciones,
              respuesta_correcta: q.respuesta_correcta,
              explicacion: q.explicacion,
              nivel_dificultad: q.nivel_dificultad,
              irt_dificultad: q.irt_dificultad,
              irt_discriminacion: q.irt_discriminacion,
              irt_adivinacion: q.irt_adivinacion,
              estado: "sin_revisar",
              origen: "ia",
              creado_por: p.docenteId,
            },
            { onConflict: "huella", ignoreDuplicates: true }
          )
          .select("id");
        if (error) {
          console.error("Banco: no se pudo agregar una pregunta:", error.message);
          return;
        }
        if (!data || data.length === 0) return; // ya estaba en el banco
        const id = data[0].id as string;

        if (q.imagen_url) {
          const rutaBanco = `${id}.png`;
          let copiada = false;
          const { data: archivo, error: errorBajar } = await admin.storage.from(ALMACEN_DOCENTE).download(q.imagen_url);
          if (!errorBajar && archivo) {
            const buffer = Buffer.from(await archivo.arrayBuffer());
            const { error: errorSubir } = await admin.storage
              .from(ALMACEN_BANCO)
              .upload(rutaBanco, buffer, { contentType: "image/png", upsert: true });
            if (!errorSubir) {
              const { error: errorActualizar } = await admin
                .from("banco_preguntas")
                .update({ imagen_ruta: rutaBanco })
                .eq("id", id);
              copiada = !errorActualizar;
            }
          }
          if (!copiada) {
            // Una pregunta que necesitaba imagen y no la tiene no sirve en el banco
            await admin.from("banco_preguntas").delete().eq("id", id);
            return;
          }
        }
        agregadas++;
      } catch (e) {
        console.error("Banco: error inesperado al agregar una pregunta:", e);
      }
    })
  );
  return agregadas;
}
