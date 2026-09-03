import { createBrowserClient } from '@supabase/ssr'

// Cliente de Supabase para componentes de cliente (navegador).
// Mismo patrón que en LlévameQ (admin/lib/supabase.ts): solo usa la anon key,
// la sesión se maneja vía cookies con @supabase/ssr.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
