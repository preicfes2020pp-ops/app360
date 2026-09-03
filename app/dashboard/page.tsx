import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";

// Server Component: valida sesión y rol en el servidor (no confía en el cliente).
export default async function DashboardDocente() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol, nombre_completo, institucion_id")
    .eq("id", user.id)
    .single();

  if (!perfil || perfil.rol !== "docente") redirect("/login");

  const { data: asignacionesRaw, count: totalGrupos } = await supabase
    .from("asignaciones_docente")
    .select("id, grados(nombre), grupos(nombre), areas(nombre), asignaturas(nombre)", { count: "exact" })
    .eq("docente_id", user.id);
  const asignaciones: any[] = asignacionesRaw ?? [];

  return (
    <div className="flex">
      <Sidebar rol="docente" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>
          Hola, {perfil.nombre_completo.split(" ")[0]}
        </h1>
        <p className="text-gray-500 mt-1">
          Este es tu espacio en AULA360. Aquí vas a organizar tus grupos, planear
          tus clases, crear actividades y exámenes, registrar asistencia y ver
          el análisis de tus estudiantes.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          <div className="bg-white rounded-xl shadow-sm p-5 border">
            <p className="text-sm text-gray-500">Grupos asignados</p>
            <p className="text-3xl font-bold mt-1" style={{ color: "var(--a360-azul)" }}>
              {totalGrupos ?? 0}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border opacity-60">
            <p className="text-sm text-gray-500">Actividades generadas</p>
            <p className="text-xs text-gray-400 mt-2">Disponible en la próxima fase (Generador IA)</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border opacity-60">
            <p className="text-sm text-gray-500">Exámenes creados</p>
            <p className="text-xs text-gray-400 mt-2">Disponible en la próxima fase (Generador IA)</p>
          </div>
        </div>

        {(totalGrupos ?? 0) === 0 && (
          <p className="text-sm text-gray-400 mt-8">
            Todavía no tienes grupos asignados. Pide a tu rector que te asigne
            un grado, grupo, área y asignatura desde su panel.
          </p>
        )}

        {(asignaciones ?? []).length > 0 && (
          <div className="mt-8">
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--a360-azul-oscuro)" }}>Mis clases</p>
            <div className="bg-white border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr><th className="p-3">Grado</th><th className="p-3">Grupo</th><th className="p-3">Área</th><th className="p-3">Asignatura</th></tr>
                </thead>
                <tbody>
                  {asignaciones.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="p-3">{a.grados?.nombre}</td>
                      <td className="p-3">{a.grupos?.nombre}</td>
                      <td className="p-3">{a.areas?.nombre}</td>
                      <td className="p-3">{a.asignaturas?.nombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
