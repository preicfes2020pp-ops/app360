import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";

export default async function DashboardRector() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, nombre_completo, institucion_id")
    .eq("id", user.id)
    .single();

  if (!perfil || perfil.rol !== "rector") redirect("/login");

  const { data: institucion } = await supabase
    .from("instituciones")
    .select("nombre")
    .eq("id", perfil.institucion_id)
    .single();

  const { count: totalDocentes } = await supabase
    .from("perfiles")
    .select("id", { count: "exact", head: true })
    .eq("institucion_id", perfil.institucion_id)
    .eq("rol", "docente");

  const { count: totalEstudiantes } = await supabase
    .from("estudiantes")
    .select("id", { count: "exact", head: true })
    .eq("institucion_id", perfil.institucion_id);

  return (
    <div className="flex">
      <Sidebar rol="rector" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>
          {institucion?.nombre ?? "Tu institución"}
        </h1>
        <p className="text-gray-500 mt-1">
          Aquí puedes visualizar y acompañar el trabajo académico de tu institución.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <div className="bg-white rounded-xl shadow-sm p-5 border">
            <p className="text-sm text-gray-500">Docentes</p>
            <p className="text-3xl font-bold mt-1" style={{ color: "var(--a360-azul)" }}>
              {totalDocentes ?? 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border">
            <p className="text-sm text-gray-500">Estudiantes</p>
            <p className="text-3xl font-bold mt-1" style={{ color: "var(--a360-verde)" }}>
              {totalEstudiantes ?? 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border opacity-60">
            <p className="text-sm text-gray-500">Promedio institucional</p>
            <p className="text-xs text-gray-400 mt-2">Disponible cuando existan calificaciones (Fase de Evaluación)</p>
          </div>
        </div>
      </main>
    </div>
  );
}
