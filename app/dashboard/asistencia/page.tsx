import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";
import AsistenciaFormulario from "@/app/components/AsistenciaFormulario";

export default async function AsistenciaDocente() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre_completo, institucion_id").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "docente") redirect("/login");

  const { data: asignacionesRaw } = await supabase
    .from("asignaciones_docente")
    .select("id, grupo_id, grados(nombre), grupos(nombre), areas(nombre), asignaturas(nombre)")
    .eq("docente_id", user.id);

  const asignaciones = (asignacionesRaw ?? []).map((a: any) => ({
    id: a.id, grupoId: a.grupo_id,
    label: `${a.grados?.nombre} ${a.grupos?.nombre} — ${a.areas?.nombre} / ${a.asignaturas?.nombre}`,
  }));

  const { data: historial } = await supabase
    .from("attendance")
    .select("id, fecha, asignaciones_docente(grados(nombre), grupos(nombre), asignaturas(nombre))")
    .eq("docente_id", user.id)
    .order("fecha", { ascending: false })
    .limit(20);

  return (
    <div className="flex">
      <Sidebar rol="docente" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>Asistencia</h1>

        <AsistenciaFormulario institucionId={perfil.institucion_id} docenteId={user.id} asignaciones={asignaciones} />

        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr><th className="p-3">Fecha</th><th className="p-3">Clase</th><th className="p-3"></th></tr>
            </thead>
            <tbody>
              {(historial ?? []).map((h: any) => (
                <tr key={h.id} className="border-t">
                  <td className="p-3">{h.fecha}</td>
                  <td className="p-3">
                    {h.asignaciones_docente?.grados?.nombre} {h.asignaciones_docente?.grupos?.nombre} — {h.asignaciones_docente?.asignaturas?.nombre}
                  </td>
                  <td className="p-3">
                    <Link href={`/dashboard/asistencia/imprimir/${h.id}`} className="text-sm font-medium hover:underline" style={{ color: "var(--a360-azul)" }}>
                      Ver / Descargar con membrete
                    </Link>
                  </td>
                </tr>
              ))}
              {(historial ?? []).length === 0 && <tr><td colSpan={3} className="p-4 text-gray-400">Aún no has tomado asistencia.</td></tr>}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
