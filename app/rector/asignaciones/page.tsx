import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";
import FormularioAsignacion from "@/app/components/FormularioAsignacion";

export default async function AsignacionesRector() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre_completo, institucion_id").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "rector") redirect("/login");

  const institucionId = perfil.institucion_id;

  const [{ data: docentes }, { data: grados }, { data: grupos }, { data: areas }, { data: asignaturasRaw }, { data: asignaciones }] =
    await Promise.all([
      supabase.from("perfiles").select("id, nombre_completo").eq("institucion_id", institucionId).eq("rol", "docente").order("nombre_completo"),
      supabase.from("grados").select("id, nombre").eq("institucion_id", institucionId).order("nombre"),
      supabase.from("grupos").select("id, nombre, grado_id").eq("institucion_id", institucionId).order("nombre"),
      supabase.from("areas").select("id, nombre").eq("institucion_id", institucionId).order("nombre"),
      supabase.from("asignaturas").select("id, nombre, area_id, areas!inner(institucion_id)").eq("areas.institucion_id", institucionId),
      supabase.from("asignaciones_docente")
        .select("id, perfiles(nombre_completo), grados(nombre), grupos(nombre), areas(nombre), asignaturas(nombre)")
        .eq("institucion_id", institucionId),
    ]);

  const docentesOpc = (docentes ?? []).map((d) => ({ id: d.id, nombre: d.nombre_completo }));
  const asignaturas = (asignaturasRaw ?? []).map((a) => ({ id: a.id, nombre: a.nombre, area_id: a.area_id }));

  return (
    <div className="flex">
      <Sidebar rol="rector" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>Asignación de docentes</h1>

        <FormularioAsignacion
          institucionId={institucionId}
          docentes={docentesOpc}
          grados={grados ?? []}
          grupos={grupos ?? []}
          areas={areas ?? []}
          asignaturas={asignaturas}
        />

        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr><th className="p-3">Docente</th><th className="p-3">Grado</th><th className="p-3">Grupo</th><th className="p-3">Área</th><th className="p-3">Asignatura</th></tr>
            </thead>
            <tbody>
              {(asignaciones ?? []).map((a) => (
                <tr key={a.id} className="border-t">
                  {/* @ts-expect-error -- relaciones anidadas de Supabase */}
                  <td className="p-3 font-medium">{a.perfiles?.nombre_completo}</td>
                  {/* @ts-expect-error -- relaciones anidadas de Supabase */}
                  <td className="p-3">{a.grados?.nombre}</td>
                  {/* @ts-expect-error -- relaciones anidadas de Supabase */}
                  <td className="p-3">{a.grupos?.nombre}</td>
                  {/* @ts-expect-error -- relaciones anidadas de Supabase */}
                  <td className="p-3">{a.areas?.nombre}</td>
                  {/* @ts-expect-error -- relaciones anidadas de Supabase */}
                  <td className="p-3">{a.asignaturas?.nombre}</td>
                </tr>
              ))}
              {(asignaciones ?? []).length === 0 && <tr><td colSpan={5} className="p-4 text-gray-400">Aún no hay asignaciones.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
