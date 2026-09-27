import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";
import FormularioGenerarCodigoRector from "@/app/components/FormularioGenerarCodigoRector";

export default async function RectoresSuperadmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre_completo").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "superadmin") redirect("/login");

  const { data: instituciones } = await supabase.from("instituciones").select("id, nombre").order("nombre");
  const { data: rectores } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, correo, instituciones(nombre)")
    .eq("rol", "rector")
    .order("nombre_completo");
  const { data: codigos } = await supabase
    .from("codigos_invitacion")
    .select("id, codigo, usado, instituciones(nombre)")
    .eq("rol", "rector")
    .order("creado_en", { ascending: false });

  return (
    <div className="flex">
      <Sidebar rol="superadmin" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>Rectores</h1>
        <FormularioGenerarCodigoRector instituciones={instituciones ?? []} />

        <div className="bg-white border rounded-xl overflow-hidden">
          <h2 className="p-3 font-semibold border-b bg-gray-50 text-sm">Rectores ya registrados</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr><th className="p-3">Nombre</th><th className="p-3">Correo</th><th className="p-3">Institucion</th></tr>
            </thead>
            <tbody>
              {((rectores ?? []) as any[]).map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-medium">{r.nombre_completo}</td>
                  <td className="p-3">{r.correo}</td>
                  <td className="p-3">{r.instituciones?.nombre ?? "-"}</td>
                </tr>
              ))}
              {(rectores ?? []).length === 0 && (
                <tr><td colSpan={3} className="p-4 text-gray-400">Aun no hay rectores registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          <h2 className="p-3 font-semibold border-b bg-gray-50 text-sm">Codigos generados</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr><th className="p-3">Codigo</th><th className="p-3">Institucion</th><th className="p-3">Estado</th></tr>
            </thead>
            <tbody>
              {((codigos ?? []) as any[]).map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3 font-mono">{c.codigo}</td>
                  <td className="p-3">{c.instituciones?.nombre ?? "-"}</td>
                  <td className="p-3">{c.usado ? "Usado" : "Disponible"}</td>
                </tr>
              ))}
              {(codigos ?? []).length === 0 && (
                <tr><td colSpan={3} className="p-4 text-gray-400">Aun no has generado ningun codigo.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
