import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";
import GestionEstudiantes from "@/app/components/GestionEstudiantes";

export default async function EstudiantesDocente() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre_completo, institucion_id").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "docente") redirect("/login");

  const { data: asignacionesRaw } = await supabase
    .from("asignaciones_docente")
    .select("grado_id, grupo_id, grados(id, nombre), grupos(id, nombre, grado_id)")
    .eq("docente_id", user.id);

  const gradosMap = new Map<string, { id: string; nombre: string }>();
  const gruposMap = new Map<string, { id: string; nombre: string; grado_id: string }>();
  (asignacionesRaw ?? []).forEach((a: any) => {
    if (a.grados) gradosMap.set(a.grados.id, a.grados);
    if (a.grupos) gruposMap.set(a.grupos.id, a.grupos);
  });
  const grados = [...gradosMap.values()];
  const grupos = [...gruposMap.values()];
  const grupoIds = grupos.map((g) => g.id);

  const { data: estudiantes } = grupoIds.length > 0
    ? await supabase
        .from("estudiantes")
        .select("id, nombre_completo, numero_documento, grados(nombre), grupos(nombre)")
        .in("grupo_id", grupoIds)
        .order("nombre_completo")
    : { data: [] as any[] };

  return (
    <div className="flex">
      <Sidebar rol="docente" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>Estudiantes</h1>
          <p className="text-gray-500 text-sm mt-1">
            Sube el listado de tus grupos (nombre completo y número de documento) para que
            aparezcan al imprimir exámenes y hojas de respuesta personalizadas. Puedes agregarlos
            uno por uno o cargar un CSV completo.
          </p>
        </div>

        {grupos.length === 0 ? (
          <p className="text-sm text-gray-400">Todavía no tienes ninguna clase (asignación) asignada por el rector.</p>
        ) : (
          <>
            <GestionEstudiantes institucionId={perfil.institucion_id} grados={grados} grupos={grupos} />
            <div className="bg-white border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr><th className="p-3">Nombre</th><th className="p-3">Documento</th><th className="p-3">Grado</th><th className="p-3">Grupo</th></tr>
                </thead>
                <tbody>
                  {((estudiantes ?? []) as any[]).map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="p-3">{e.nombre_completo}</td>
                      <td className="p-3">{e.numero_documento ?? "—"}</td>
                      <td className="p-3">{e.grados?.nombre ?? "—"}</td>
                      <td className="p-3">{e.grupos?.nombre ?? "—"}</td>
                    </tr>
                  ))}
                  {(estudiantes ?? []).length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-gray-400">Aún no hay estudiantes en tus grupos.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
