import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";
import FormularioInvitarCoordinador from "@/app/components/FormularioInvitarCoordinador";

export default async function CoordinadoresRector() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre_completo, institucion_id").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "rector") redirect("/login");

  const { data: coordinadores } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, correo")
    .eq("institucion_id", perfil.institucion_id)
    .eq("rol", "coordinador")
    .order("nombre_completo");

  return (
    <div className="flex">
      <Sidebar rol="rector" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>Coordinadores de mi institucion</h1>
        <FormularioInvitarCoordinador />
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr><th className="p-3">Nombre</th><th className="p-3">Correo</th></tr>
            </thead>
            <tbody>
              {((coordinadores ?? []) as any[]).map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3 font-medium">{c.nombre_completo}</td>
                  <td className="p-3">{c.correo}</td>
                </tr>
              ))}
              {(coordinadores ?? []).length === 0 && (
                <tr><td colSpan={2} className="p-4 text-gray-400">
                  Aun no hay coordinadores invitados.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
