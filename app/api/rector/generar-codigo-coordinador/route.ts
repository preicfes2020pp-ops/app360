import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { generarCodigoInvitacion } from "@/lib/generarCodigoInvitacion";

// POST /api/rector/generar-codigo-coordinador
// Igual que el de rector, pero el rector solo puede generar codigos para
// SU MISMA institucion, y siempre de rol coordinador.
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { data: perfil } = await supabase.from("perfiles").select("rol, institucion_id").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "rector") {
    return NextResponse.json({ error: "Solo un rector puede generar codigos de coordinador." }, { status: 403 });
  }

  const admin = createAdminSupabaseClient();
  const codigo = generarCodigoInvitacion();

  const { error } = await admin.from("codigos_invitacion").insert({
    codigo, rol: "coordinador", institucion_id: perfil.institucion_id, creado_por: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, codigo });
}
