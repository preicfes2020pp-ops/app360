import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

// POST /api/superadmin/invitar-rector
// Crea la cuenta de un rector para una institucion existente. El rector
// recibe un correo de Supabase con un enlace para poner su propia
// contrasena - aqui nunca se maneja ni se genera ninguna contrasena.
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { data: perfil } = await supabase.from("perfiles").select("rol").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "superadmin") {
    return NextResponse.json({ error: "Solo un superadmin puede invitar rectores." }, { status: 403 });
  }

  const { institucionId, nombreCompleto, correo } = await req.json();
  if (!institucionId || !nombreCompleto || !correo) {
    return NextResponse.json({ error: "Faltan datos: institucionId, nombreCompleto, correo." }, { status: 400 });
  }

  const { data: institucion } = await supabase
    .from("instituciones")
    .select("id, nombre")
    .eq("id", institucionId)
    .single();
  if (!institucion) return NextResponse.json({ error: "Esa institucion no existe." }, { status: 404 });

  const admin = createAdminSupabaseClient();
  const { data: invitado, error: errorInvitar } = await admin.auth.admin.inviteUserByEmail(correo);

  if (errorInvitar || !invitado?.user) {
    const mensaje = errorInvitar?.message ?? "No se pudo invitar al rector.";
    const yaExiste = /already registered|already exists/i.test(mensaje);
    return NextResponse.json(
      { error: yaExiste ? "Ese correo ya tiene una cuenta en AULA360." : mensaje },
      { status: yaExiste ? 409 : 502 }
    );
  }

  const { error: errorPerfil } = await admin.from("perfiles").insert({
    id: invitado.user.id,
    rol: "rector",
    nombre_completo: nombreCompleto,
    correo,
    institucion_id: institucionId,
  });

  if (errorPerfil) {
    await admin.auth.admin.deleteUser(invitado.user.id);
    return NextResponse.json({ error: errorPerfil.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, institucion: institucion.nombre, correo });
}
