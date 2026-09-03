import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";

export default async function DocentesRector() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre_completo, institucion_id").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "rector") redirect("/login");

  const { data: docentes } = await supabase
    .from("perfiles")
    .select("id, nombre_completo, correo, codigo_aula360, docentes(area_principal)")
    .eq("institucion_id", perfil.institucion_id)
    .eq("rol", "docente")
    .order("nombre_completo");

  return (
    <div className="flex">
      <Sidebar rol="rector" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>Docentes de mi institución</h1>
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr><th className="p-3">Nombre</th><th className="p-3">Correo</th><th className="p-3">Área</th><th className="p-3">Código AULA360</th></tr>
            </thead>
            <tbody>
              {((docentes ?? []) as any[]).map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-3 font-medium">{d.nombre_completo}</td>
                  <td className="p-3">{d.correo}</td>
                  <td className="p-3">{d.docentes?.area_principal ?? "—"}</td>
                  <td className="p-3 font-mono text-xs">{d.codigo_aula360}</td>
                </tr>
              ))}
              {(docentes ?? []).length === 0 && (
                <tr><td colSpan={4} className="p-4 text-gray-400">
                  Aún no hay docentes registrados. Comparte con ellos el enlace de registro (/registro) y el nombre de tu institución.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
