import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";
import FormularioDiaDia from "@/app/components/FormularioDiaDia";

export default async function DiaADiaDocente() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre_completo, institucion_id").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "docente") redirect("/login");

  const { data: asignacionesRaw } = await supabase
    .from("asignaciones_docente")
    .select("id, grados(nombre), grupos(nombre), areas(nombre), asignaturas(nombre)")
    .eq("docente_id", user.id);

  const asignaciones = (asignacionesRaw ?? []).map((a: any) => ({
    id: a.id,
    label: `${a.grados?.nombre} ${a.grupos?.nombre} — ${a.areas?.nombre} / ${a.asignaturas?.nombre}`,
  }));

  const { data: planes } = await supabase
    .from("daily_plans")
    .select("id, fecha, tema, asignaciones_docente(grados(nombre), grupos(nombre), asignaturas(nombre))")
    .eq("docente_id", user.id)
    .order("fecha", { ascending: false })
    .limit(30);

  return (
    <div className="flex">
      <Sidebar rol="docente" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>Día a día</h1>

        <FormularioDiaDia institucionId={perfil.institucion_id} docenteId={user.id} asignaciones={asignaciones} />

        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr><th className="p-3">Fecha</th><th className="p-3">Clase</th><th className="p-3">Tema</th></tr>
            </thead>
            <tbody>
              {(planes ?? []).map((p: any) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.fecha}</td>
                  <td className="p-3">
                    {p.asignaciones_docente?.grados?.nombre} {p.asignaciones_docente?.grupos?.nombre} — {p.asignaciones_docente?.asignaturas?.nombre}
                  </td>
                  <td className="p-3">{p.tema}</td>
                </tr>
              ))}
              {(planes ?? []).length === 0 && <tr><td colSpan={3} className="p-4 text-gray-400">Aún no has registrado ninguna planeación.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
