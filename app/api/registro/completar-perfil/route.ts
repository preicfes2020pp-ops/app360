import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase-admin";
import { generarCodigoDocente } from "@/lib/codigoGrupo";

// POST /api/registro/completar-perfil
// Se llama justo despues de crear la cuenta en Supabase Auth (signUp), sin
// importar si ya hay sesion activa o si falta confirmar el correo - por
// eso usa el cliente de administrador. Aqui se decide de verdad el rol:
// - docente: libre, solo elige su institucion.
// - rector / coordinador: exige un codigo de invitacion valido, sin usar,
//   generado por un superadmin o un rector. Sin codigo correcto, no hay
//   forma de quedar con ese rol.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, rolElegido, nombreCompleto, numeroDocumento, correo, telefono, fotoUrl } = body;

  if (!userId || !rolElegido || !nombreCompleto || !correo) {
    return NextResponse.json({ error: "Faltan datos obligatorios." }, { status: 400 });
  }
  if (!["docente", "rector", "coordinador"].includes(rolElegido)) {
    return NextResponse.json({ error: "Rol invalido." }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();

  const { data: perfilExistente } = await admin.from("perfiles").select("id").eq("id", userId).maybeSingle();
  if (perfilExistente) {
    return NextResponse.json({ error: "Ya existe un perfil para esta cuenta." }, { status: 409 });
  }

  if (rolElegido === "docente") {
    const { institucionId, areaPrincipal } = body;
    if (!institucionId) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Falta institucionId." }, { status: 400 });
    }

    const { error: errorPerfil } = await admin.from("perfiles").insert({
      id: userId, rol: "docente", institucion_id: institucionId,
      nombre_completo: nombreCompleto, numero_documento: numeroDocumento ?? null,
      correo, telefono: telefono ?? null, foto_url: fotoUrl ?? null,
      codigo_aula360: generarCodigoDocente(),
    });
    if (errorPerfil) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: errorPerfil.message }, { status: 500 });
    }

    await admin.from("docentes").insert({ perfil_id: userId, area_principal: areaPrincipal ?? "" });
    return NextResponse.json({ ok: true, rol: "docente" });
  }

  const { codigo } = body;
  if (!codigo?.trim()) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: "Falta el codigo de invitacion." }, { status: 400 });
  }

  const { data: codigoFila } = await admin
    .from("codigos_invitacion")
    .select("id, institucion_id, rol, usado")
    .eq("codigo", codigo.trim().toUpperCase())
    .maybeSingle();

  if (!codigoFila || codigoFila.usado || codigoFila.rol !== rolElegido) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: "El codigo no es valido, ya fue usado, o no corresponde a ese rol." }, { status: 400 });
  }

  const { error: errorPerfil } = await admin.from("perfiles").insert({
    id: userId, rol: rolElegido, institucion_id: codigoFila.institucion_id,
    nombre_completo: nombreCompleto, numero_documento: numeroDocumento ?? null,
    correo, telefono: telefono ?? null, foto_url: fotoUrl ?? null,
  });
  if (errorPerfil) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: errorPerfil.message }, { status: 500 });
  }

  await admin.from("codigos_invitacion").update({
    usado: true, usado_por: userId, usado_en: new Date().toISOString(),
  }).eq("id", codigoFila.id);

  return NextResponse.json({ ok: true, rol: rolElegido });
}
