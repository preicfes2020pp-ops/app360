import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";

// POST /api/rector/invitar-coordinador
// El rector invita a un coordinador para SU MISMA institucion. Igual que
// con el rector, nunca se maneja ni se genera ninguna contrasena: Supabase
// envia un correo con un enlace para que el coordinador ponga la suya.
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const { data: perfil } = await supabase.from("perfiles").select("rol, institucion_id").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "rector") {
    return NextResponse.json({ error: "Solo un rector puede invitar coordinadores." }, { status: 403 });
  }

  const { nombreCompleto, correo } = await req.json();
  if (!nombreCompleto || !correo) {
    return NextResponse.json({ error: "Faltan datos: nombreCompleto, correo." }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data: invitado, error: errorInvitar } = await admin.auth.admin.inviteUserByEmail(correo);

  if (errorInvitar || !invitado?.user) {
    const mensaje = errorInvitar?.message ?? "No se pudo invitar al coordinador.";
    const yaExiste = /already registered|already exists/i.test(mensaje);
    return NextResponse.json(
      { error: yaExiste ? "Ese correo ya tiene una cuenta en AULA360." : mensaje },
      { status: yaExiste ? 409 : 502 }
    );
  }

  const { error: errorPerfil } = await admin.from("perfiles").insert({
    id: invitado.user.id,
    rol: "coordinador",
    nombre_completo: nombreCompleto,
    correo,
    institucion_id: perfil.institucion_id,
  });

  if (errorPerfil) {
    await admin.auth.admin.deleteUser(invitado.user.id);
    return NextResponse.json({ error: errorPerfil.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, correo });
}
