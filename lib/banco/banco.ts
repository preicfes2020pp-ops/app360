import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

// Una pregunta tal como vive en el banco compartido.
export type PreguntaBanco = {
  id: string;
  tema: string;
  competencia: string | null;
  tipo_texto: "continuo" | "discontinuo" | "mixto";
  contexto: string | null;
  enunciado: string;
  opciones: Record<string, string>;
  respuesta_correcta: string;
  explicacion: string;
  nivel_dificultad: "basico" | "intermedio" | "avanzado";
  irt_dificultad: number | null;
  irt_discriminacion: number | null;
  irt_adivinacion: number | null;
  imagen_ruta: string | null;
};

const ALMACEN_BANCO = "banco-imagenes";
const ALMACEN_DOCENTE = "documentos";

// Busca en el banco. Si algo falla devuelve una lista vacia: el examen nunca se
// bloquea por el banco, simplemente se genera con IA.
export async function buscarEnBanco(
  admin: SupabaseClient,
  p: { catalogoAsignaturaId: string; grado: number; tema: string; nivel: string; limite: number }
): Promise<PreguntaBanco[]> {
  try {
    const { data, error } = await admin.rpc("buscar_banco_preguntas", {
      p_asignatura: p.catalogoAsignaturaId,
      p_grado: p.grado,
      p_tema: p.tema,
      p_nivel: p.nivel,
      p_limite: p.limite,
    });
    if (error || !data) {
      console.error("Banco: no se pudo buscar:", error?.message);
      return [];
    }
    return data as PreguntaBanco[];
  } catch (e) {
    console.error("Banco: error inesperado al buscar:", e);
    return [];
  }
}

// Copia la imagen de una pregunta del banco a la carpeta del docente, para que la
// impresion del examen la encuentre donde siempre.
export async function copiarImagenDelBancoADocente(
  admin: SupabaseClient,
  rutaBanco: string,
  docenteId: string
): Promise<{ ruta: string; urlFirmada: string } | null> {
  try {
    const { data: archivo, error: errorBajar } = await admin.storage.from(ALMACEN_BANCO).download(rutaBanco);
    if (errorBajar || !archivo) return null;
    const buffer = Buffer.from(await archivo.arrayBuffer());
    const ruta = `${docenteId}/preguntas-imagenes/${randomUUID()}.png`;
    const { error: errorSubir } = await admin.storage
      .from(ALMACEN_DOCENTE)
      .upload(ruta, buffer, { contentType: "image/png" });
    if (errorSubir) return null;
    const { data: firmada } = await admin.storage
      .from(ALMACEN_DOCENTE)
      .createSignedUrl(ruta, 60 * 60 * 24 * 365);
    return firmada?.signedUrl ? { ruta, urlFirmada: firmada.signedUrl } : null;
  } catch (e) {
    console.error("Banco: no se pudo copiar la imagen:", e);
    return null;
  }
}

// Suma 1 al contador de uso de las preguntas del banco que entraron a un examen.
export async function sumarUsoEnBanco(admin: SupabaseClient, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    const { error } = await admin.rpc("sumar_uso_banco", { p_ids: ids });
    if (error) console.error("Banco: no se pudo sumar el uso:", error.message);
  } catch (e) {
    console.error("Banco: error inesperado al sumar el uso:", e);
  }
}
