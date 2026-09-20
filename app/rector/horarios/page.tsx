import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";
import FranjasHorarias from "@/app/components/FranjasHorarias";
import HorarioGrupo from "@/app/components/HorarioGrupo";

export default async function HorariosRector() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre_completo, institucion_id").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "rector") redirect("/login");

  const { data: franjas } = await supabase
    .from("franjas_horarias").select("id, nombre, hora_inicio, hora_fin, orden")
    .eq("institucion_id", perfil.institucion_id).order("orden");

  const { data: gruposRaw } = await supabase
    .from("grupos").select("id, nombre, grados(nombre)")
    .eq("institucion_id", perfil.institucion_id).order("nombre");
  const grupos = (gruposRaw ?? []).map((g: any) => ({ id: g.id, label: `${g.grados?.nombre} ${g.nombre}` }));

  return (
    <div className="flex">
      <Sidebar rol="rector" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>Horarios</h1>
          <p className="text-gray-500 text-sm mt-1">
            Define las franjas horarias del colegio y arma el horario semanal de cada grupo,
            asignando en cada casilla la clase (docente + área/asignatura) que corresponde.
          </p>
        </div>

        <FranjasHorarias institucionId={perfil.institucion_id} franjas={franjas ?? []} />
        <HorarioGrupo institucionId={perfil.institucion_id} grupos={grupos} franjas={franjas ?? []} />
      </main>
    </div>
  );
}
