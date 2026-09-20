import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";
import FormularioHorarioEmergente from "@/app/components/FormularioHorarioEmergente";

export default async function HorariosEmergentesRector() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre_completo, institucion_id").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "rector") redirect("/login");

  const { data: franjas } = await supabase.from("franjas_horarias").select("id, nombre, hora_inicio, hora_fin").eq("institucion_id", perfil.institucion_id).order("orden");
  const { data: gruposRaw } = await supabase.from("grupos").select("id, nombre, grados(nombre)").eq("institucion_id", perfil.institucion_id).order("nombre");
  const grupos = (gruposRaw ?? []).map((g: any) => ({ id: g.id, label: `${g.grados?.nombre} ${g.nombre}` }));
  const { data: emergentes } = await supabase.from("horarios_emergentes").select("id, motivo, fecha_inicio, duracion_dias").eq("institucion_id", perfil.institucion_id).order("fecha_inicio", { ascending: false });

  return (
    <div className="flex">
      <Sidebar rol="rector" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>Horarios emergentes</h1>
          <p className="text-gray-500 text-sm mt-1">
            Para eventos temporales (jornadas pedagógicas, actividades especiales) que
            reemplazan el horario normal durante unos días, sin borrar el horario de siempre.
          </p>
        </div>
        <FormularioHorarioEmergente institucionId={perfil.institucion_id} grupos={grupos} franjas={franjas ?? []} emergentes={emergentes ?? []} />
      </main>
    </div>
  );
}
