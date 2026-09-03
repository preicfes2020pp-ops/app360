import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cliente de Supabase para Route Handlers y Server Components (app/**).
// Lee la sesión real del usuario desde las cookies de la petición, para que
// las políticas RLS (ej. "un docente solo ve estudiantes de su institución")
// se apliquen también del lado del servidor. Mismo patrón que LlévameQ.
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignorar: en algunos contextos de Route Handler las cookies son de solo lectura.
          }
        },
      },
    }
  )
}
