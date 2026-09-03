import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";
import FormularioInstitucion from "@/app/components/FormularioInstitucion";

export default async function InstitucionesSuperAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre_completo").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "superadmin") redirect("/login");

  const { data: instituciones } = await supabase
    .from("instituciones")
    .select("id, nombre, ciudad, departamento, activa, creada_en")
    .order("creada_en", { ascending: false });

  return (
    <div className="flex">
      <Sidebar rol="superadmin" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>Instituciones</h1>

        <FormularioInstitucion />

        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr><th className="p-3">Nombre</th><th className="p-3">Ciudad</th><th className="p-3">Departamento</th><th className="p-3">Estado</th></tr>
            </thead>
            <tbody>
              {(instituciones ?? []).map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="p-3 font-medium">{i.nombre}</td>
                  <td className="p-3">{i.ciudad ?? "—"}</td>
                  <td className="p-3">{i.departamento ?? "—"}</td>
                  <td className="p-3">{i.activa ? "Activa" : "Inactiva"}</td>
                </tr>
              ))}
              {(instituciones ?? []).length === 0 && (
                <tr><td className="p-4 text-gray-400" colSpan={4}>Todavía no hay instituciones registradas.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
