import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";
import FormularioPlanArea from "@/app/components/FormularioPlanArea";

export default async function PlanDeAreaDocente() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre_completo, institucion_id").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "docente") redirect("/login");

  const [{ data: areas }, { data: grados }, { data: planes }] = await Promise.all([
    supabase.from("areas").select("id, nombre").eq("institucion_id", perfil.institucion_id).order("nombre"),
    supabase.from("grados").select("id, nombre").eq("institucion_id", perfil.institucion_id).order("nombre"),
    supabase.from("area_plans")
      .select("id, periodo, archivo_nombre, estado_extraccion, creado_en, areas(nombre), grados(nombre)")
      .eq("docente_id", user.id)
      .order("creado_en", { ascending: false }),
  ]);

  return (
    <div className="flex">
      <Sidebar rol="docente" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>Plan de área</h1>

        <FormularioPlanArea institucionId={perfil.institucion_id} docenteId={user.id} areas={areas ?? []} grados={grados ?? []} />

        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr><th className="p-3">Área</th><th className="p-3">Grado</th><th className="p-3">Periodo</th><th className="p-3">Archivo</th><th className="p-3">Estado</th></tr>
            </thead>
            <tbody>
              {((planes ?? []) as any[]).map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.areas?.nombre}</td>
                  <td className="p-3">{p.grados?.nombre}</td>
                  <td className="p-3">{p.periodo}</td>
                  <td className="p-3">{p.archivo_nombre ?? "—"}</td>
                  <td className="p-3 text-xs">{p.estado_extraccion === "manual" ? "Completado manualmente" : p.estado_extraccion}</td>
                </tr>
              ))}
              {(planes ?? []).length === 0 && <tr><td colSpan={5} className="p-4 text-gray-400">Aún no has cargado ningún plan de área.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
