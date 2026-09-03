import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";
import GeneradorIA from "@/app/components/GeneradorIA";

export default async function GeneradorIAPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre_completo").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "docente") redirect("/login");

  const { data: asignacionesRaw } = await supabase
    .from("asignaciones_docente")
    .select("id, grados(nombre), grupos(nombre), areas(nombre), asignaturas(nombre)")
    .eq("docente_id", user.id);

  const asignaciones = (asignacionesRaw ?? []).map((a: any) => ({
    id: a.id,
    label: `${a.grados?.nombre} ${a.grupos?.nombre} — ${a.areas?.nombre} / ${a.asignaturas?.nombre}`,
  }));

  return (
    <div className="flex">
      <Sidebar rol="docente" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>Generador Pedagógico IA</h1>
          <p className="text-gray-500 text-sm mt-1">
            La IA propone; tú decides. Todo contenido generado pasa por tu aprobación antes de usarse.
          </p>
        </div>
        <GeneradorIA asignaciones={asignaciones} />
      </main>
    </div>
  );
}
