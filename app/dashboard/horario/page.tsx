import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import Sidebar from "@/app/components/Sidebar";

const DIAS = [
  { numero: 1, nombre: "Lunes" }, { numero: 2, nombre: "Martes" }, { numero: 3, nombre: "Miércoles" },
  { numero: 4, nombre: "Jueves" }, { numero: 5, nombre: "Viernes" },
];

export default async function HorarioDocente() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfiles").select("rol, nombre_completo").eq("id", user.id).single();
  if (!perfil || perfil.rol !== "docente") redirect("/login");

  const { data: asignacionesRaw } = await supabase
    .from("asignaciones_docente")
    .select("id, grados(nombre), grupos(nombre), areas(nombre), asignaturas(nombre)")
    .eq("docente_id", user.id);
  const asignaciones = asignacionesRaw ?? [];
  const asignacionIds = asignaciones.map((a: any) => a.id);
  const mapaAsignacion: Record<string, string> = {};
  asignaciones.forEach((a: any) => {
    mapaAsignacion[a.id] = `${a.grados?.nombre} ${a.grupos?.nombre} — ${a.areas?.nombre}/${a.asignaturas?.nombre}`;
  });

  const { data: franjas } = await supabase.from("franjas_horarias").select("id, nombre, hora_inicio, hora_fin").order("orden");

  const { data: horarioRaw } = asignacionIds.length > 0
    ? await supabase.from("horario_clases").select("asignacion_id, dia_semana, franja_id").in("asignacion_id", asignacionIds)
    : { data: [] as any[] };
  const celdas: Record<string, string> = {};
  (horarioRaw ?? []).forEach((h: any) => { celdas[`${h.dia_semana}-${h.franja_id}`] = mapaAsignacion[h.asignacion_id]; });

  const { data: emergentesRaw } = await supabase.from("horarios_emergentes").select("id, motivo, fecha_inicio, duracion_dias").order("fecha_inicio", { ascending: false }).limit(5);
  const emergentes = [];
  for (const em of emergentesRaw ?? []) {
    const { data: clasesEm } = asignacionIds.length > 0
      ? await supabase.from("horario_emergente_clases").select("asignacion_id, dia_semana, franja_id").eq("horario_emergente_id", em.id).in("asignacion_id", asignacionIds)
      : { data: [] as any[] };
    if ((clasesEm ?? []).length > 0) {
      const celdasEm: Record<string, string> = {};
      (clasesEm ?? []).forEach((h: any) => { celdasEm[`${h.dia_semana}-${h.franja_id}`] = mapaAsignacion[h.asignacion_id]; });
      emergentes.push({ ...em, celdas: celdasEm });
    }
  }

  return (
    <div className="flex">
      <Sidebar rol="docente" nombre={perfil.nombre_completo} />
      <main className="flex-1 p-8 flex flex-col gap-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--a360-azul-oscuro)" }}>Mi horario</h1>

        <div className="bg-white border rounded-xl p-5 overflow-x-auto">
          {(franjas ?? []).length === 0 ? (
            <p className="text-sm text-gray-400">El rector aún no ha configurado franjas horarias.</p>
          ) : (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr><th className="border p-2 bg-gray-50 text-left">Franja</th>{DIAS.map((d) => <th key={d.numero} className="border p-2 bg-gray-50">{d.nombre}</th>)}</tr>
              </thead>
              <tbody>
                {(franjas ?? []).map((f: any) => (
                  <tr key={f.id}>
                    <td className="border p-2 font-medium whitespace-nowrap">{f.nombre}<br /><span className="text-gray-400">{f.hora_inicio.slice(0,5)}-{f.hora_fin.slice(0,5)}</span></td>
                    {DIAS.map((d) => <td key={d.numero} className="border p-2 text-center">{celdas[`${d.numero}-${f.id}`] ?? ""}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {emergentes.length > 0 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-semibold" style={{ color: "var(--a360-azul-oscuro)" }}>Horarios emergentes que te afectan</p>
            {emergentes.map((em: any) => (
              <div key={em.id} className="bg-white border rounded-xl p-5 overflow-x-auto">
                <p className="font-medium text-sm mb-1">{em.motivo}</p>
                <p className="text-xs text-gray-400 mb-3">Desde {em.fecha_inicio} · {em.duracion_dias} día(s)</p>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr><th className="border p-2 bg-gray-50 text-left">Franja</th>{DIAS.map((d) => <th key={d.numero} className="border p-2 bg-gray-50">{d.nombre}</th>)}</tr>
                  </thead>
                  <tbody>
                    {(franjas ?? []).map((f: any) => (
                      <tr key={f.id}>
                        <td className="border p-2 font-medium whitespace-nowrap">{f.nombre}</td>
                        {DIAS.map((d) => <td key={d.numero} className="border p-2 text-center">{em.celdas[`${d.numero}-${f.id}`] ?? ""}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
