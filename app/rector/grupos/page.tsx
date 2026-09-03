import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";
import FormularioGrupo from "@/app/components/FormularioGrupo";

export default async function GruposRector() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre_completo, institucion_id").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "rector") redirect("/login");

  const { data: grados } = await supabase.from("grados").select("id, nombre").eq("institucion_id", perfil.institucion_id).order("nombre");
  const { data: grupos } = await supabase
    .from("grupos")
    .select("id, nombre, jornada, anio_lectivo, codigo_grupo, grados(nombre)")
    .eq("institucion_id", perfil.institucion_id)
    .order("anio_lectivo", { ascending: false });

  return (
    <div className="flex">
      <Sidebar rol="rector" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>Grupos</h1>
        <FormularioGrupo institucionId={perfil.institucion_id} grados={grados ?? []} />
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr><th className="p-3">Grado</th><th className="p-3">Grupo</th><th className="p-3">Jornada</th><th className="p-3">Año</th><th className="p-3">Código</th></tr>
            </thead>
            <tbody>
              {(grupos ?? []).map((g) => (
                <tr key={g.id} className="border-t">
                  <td className="p-3">{g.grados?.nombre}</td>
                  <td className="p-3 font-medium">{g.nombre}</td>
                  <td className="p-3">{g.jornada}</td>
                  <td className="p-3">{g.anio_lectivo}</td>
                  <td className="p-3 font-mono text-xs">{g.codigo_grupo}</td>
                </tr>
              ))}
              {(grupos ?? []).length === 0 && <tr><td colSpan={5} className="p-4 text-gray-400">Aún no hay grupos.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
