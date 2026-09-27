import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { generarCodigoInvitacion } from "@/lib/generarCodigoInvitacion";

// POST /api/superadmin/generar-codigo-rector
// Genera un codigo de un solo uso, ligado a una institucion, que alguien
// debe escribir en /registro para poder quedar como rector de esa
// institucion. El superadmin comparte el codigo por fuera de la app.
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "superadmin") {
    return NextResponse.json({ error: "Solo un superadmin puede generar codigos de rector." }, { status: 403 });
  }

  const { institucionId } = await req.json();
  if (!institucionId) return NextResponse.json({ error: "Falta institucionId." }, { status: 400 });

  const { data: institucion } = await supabase.from("instituciones").select("id, nombre").eq("id", institucionId).single();
  if (!institucion) return NextResponse.json({ error: "Esa institucion no existe." }, { status: 404 });

  const admin = createAdminSupabaseClient();
  const codigo = generarCodigoInvitacion();

  const { error } = await admin.from("codigos_invitacion").insert({
    codigo, rol: "rector", institucion_id: institucionId, creado_por: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, codigo, institucion: institucion.nombre });
}
