import type { SupabaseClient } from "@supabase/supabase-js";

const LIMITE_POR_HORA = 10;

export async function verificarLimiteIA(
  supabase: SupabaseClient,
  docenteId: string
): Promise<{ permitido: true } | { permitido: false; mensaje: string }> {
  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("limite_ia_uso")
    .select("id", { count: "exact", head: true })
    .eq("docente_id", docenteId)
    .gte("creado_en", haceUnaHora);

  if (error) {
    return { permitido: true };
  }

  if ((count ?? 0) >= LIMITE_POR_HORA) {
    return {
      permitido: false,
      mensaje: `Has alcanzado el limite de ${LIMITE_POR_HORA} solicitudes de IA por hora. Intenta de nuevo mas tarde.`,
    };
  }

  await supabase.from("limite_ia_uso").insert({ docente_id: docenteId });
  return { permitido: true };
}
