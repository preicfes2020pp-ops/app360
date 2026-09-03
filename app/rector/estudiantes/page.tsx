import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";
import GestionEstudiantes from "@/app/components/GestionEstudiantes";

export default async function EstudiantesRector() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre_completo, institucion_id").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "rector") redirect("/login");

  const { data: grados } = await supabase.from("grados").select("id, nombre").eq("institucion_id", perfil.institucion_id).order("nombre");
  const { data: grupos } = await supabase.from("grupos").select("id, nombre, grado_id").eq("institucion_id", perfil.institucion_id).order("nombre");
  const { data: estudiantes } = await supabase
    .from("estudiantes")
    .select("id, nombre_completo, numero_documento, grados(nombre), grupos(nombre)")
    .eq("institucion_id", perfil.institucion_id)
    .order("nombre_completo")
    .limit(100);

  return (
    <div className="flex">
      <Sidebar rol="rector" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>Estudiantes</h1>
        <GestionEstudiantes institucionId={perfil.institucion_id} grados={grados ?? []} grupos={grupos ?? []} />
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr><th className="p-3">Nombre</th><th className="p-3">Documento</th><th className="p-3">Grado</th><th className="p-3">Grupo</th></tr>
            </thead>
            <tbody>
              {(estudiantes ?? []).map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="p-3">{e.nombre_completo}</td>
                  <td className="p-3">{e.numero_documento ?? "—"}</td>
                  {/* @ts-expect-error -- relación anidada de Supabase */}
                  <td className="p-3">{e.grados?.nombre ?? "—"}</td>
                  {/* @ts-expect-error -- relación anidada de Supabase */}
                  <td className="p-3">{e.grupos?.nombre ?? "—"}</td>
                </tr>
              ))}
              {(estudiantes ?? []).length === 0 && <tr><td colSpan={4} className="p-4 text-gray-400">Aún no hay estudiantes.</td></tr>}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 p-3 border-t">Mostrando hasta 100 estudiantes. La paginación completa llega en una fase posterior.</p>
        </div>
      </main>
    </div>
  );
}
