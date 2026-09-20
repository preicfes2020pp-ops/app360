import type { SupabaseClient } from "@supabase/supabase-js";

// Defensa EN PROFUNDIDAD para páginas de impresión (exámenes, asistencia):
// además de las políticas RLS de la base de datos, el código verifica
// explícitamente que quien pide ver el recurso sea el docente dueño, o un
// rector/superadmin de la misma institución. No reemplaza RLS — es una
// segunda barrera, para que un hueco en una sola política no exponga datos
// (hojas de respuestas, claves de examen, asistencia) a cualquier usuario
// autenticado que adivine un id.
export async function puedeVerRecurso(
  supabase: SupabaseClient,
  userId: string,
  recurso: { docente_id?: string | null; institucion_id?: string | null }
): Promise<boolean> {
  if (recurso.docente_id && recurso.docente_id === userId) return true;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, institucion_id")
    .eq("id", userId)
    .single();

  if (!perfil) return false;
  if (perfil.rol === "superadmin") return true;
  if (perfil.rol === "rector" && recurso.institucion_id && perfil.institucion_id === recurso.institucion_id) return true;

  return false;
}
