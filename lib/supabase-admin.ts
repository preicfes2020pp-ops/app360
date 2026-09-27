import { createClient } from "@supabase/supabase-js";

// Cliente de administrador de Supabase: usa la service_role key, que
// evita por completo las politicas RLS. SOLO se usa en Route Handlers de
// servidor que necesitan crear cuentas para otras personas (invitar
// rector, invitar coordinador). Nunca se importa desde codigo de
// cliente/navegador.
export function createAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
