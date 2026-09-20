"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Grupo = { id: string; label: string };
type Franja = { id: string; nombre: string; hora_inicio: string; hora_fin: string };
type Asignacion = { id: string; label: string };
type CeldaExistente = { id: string; asignacionId: string };

const DIAS = [
  { numero: 1, nombre: "Lunes" }, { numero: 2, nombre: "Martes" }, { numero: 3, nombre: "Miércoles" },
  { numero: 4, nombre: "Jueves" }, { numero: 5, nombre: "Viernes" },
];

export default function HorarioGrupo({ institucionId, grupos, franjas }: { institucionId: string; grupos: Grupo[]; franjas: Franja[] }) {
  const supabase = createClient();
  const [grupoId, setGrupoId] = useState("");
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [celdas, setCeldas] = useState<Record<string, CeldaExistente>>({});
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!grupoId) { setAsignaciones([]); setCeldas({}); return; }
    (async () => {
      setCargando(true);
      const { data: asigRaw } = await supabase
        .from("asignaciones_docente")
        .select("id, perfiles(nombre_completo), areas(nombre), asignaturas(nombre)")
        .eq("grupo_id", grupoId);
      const asigs = (asigRaw ?? []).map((a: any) => ({
        id: a.id, label: `${a.areas?.nombre}/${a.asignaturas?.nombre} — ${a.perfiles?.nombre_completo}`,
      }));
      setAsignaciones(asigs);

      const ids = asigs.map((a) => a.id);
      const nuevasCeldas: Record<string, CeldaExistente> = {};
      if (ids.length > 0) {
        const { data: horarioRaw } = await supabase.from("horario_clases").select("id, asignacion_id, dia_semana, franja_id").in("asignacion_id", ids);
        (horarioRaw ?? []).forEach((h: any) => {
          nuevasCeldas[`${h.dia_semana}-${h.franja_id}`] = { id: h.id, asignacionId: h.asignacion_id };
        });
      }
      setCeldas(nuevasCeldas);
      setCargando(false);
    })();
  }, [grupoId]);

  async function alCambiarCelda(dia: number, franjaId: string, asignacionId: string) {
    setError(null);
    const clave = `${dia}-${franjaId}`;
    const existente = celdas[clave];

    if (!asignacionId) {
      if (existente) {
        const { error: err } = await supabase.from("horario_clases").delete().eq("id", existente.id);
        if (err) { setError(err.message); return; }
        setCeldas((c) => { const copia = { ...c }; delete copia[clave]; return copia; });
      }
      return;
    }

    if (existente) {
      const { error: err } = await supabase.from("horario_clases").update({ asignacion_id: asignacionId }).eq("id", existente.id);
      if (err) { setError(err.message); return; }
      setCeldas((c) => ({ ...c, [clave]: { id: existente.id, asignacionId } }));
    } else {
      const { data, error: err } = await supabase.from("horario_clases")
        .insert({ institucion_id: institucionId, asignacion_id: asignacionId, dia_semana: dia, franja_id: franjaId })
        .select("id").single();
      if (err || !data) { setError(err?.message ?? "No se pudo guardar."); return; }
      setCeldas((c) => ({ ...c, [clave]: { id: data.id, asignacionId } }));
    }
  }

  return (
    <div className="bg-white border rounded-xl p-5 flex flex-col gap-4">
      <p className="text-sm font-semibold" style={{ color: "var(--a360-azul-oscuro)" }}>Horario semanal por grupo</p>
      <select className="border rounded-lg px-3 py-2 text-sm max-w-sm" value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
        <option value="">Elige un grupo</option>
        {grupos.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
      </select>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {cargando && <p className="text-sm text-gray-400">Cargando...</p>}

      {grupoId && !cargando && (
        franjas.length === 0 ? (
          <p className="text-sm text-gray-400">Crea al menos una franja horaria arriba antes de armar el horario.</p>
        ) : asignaciones.length === 0 ? (
          <p className="text-sm text-gray-400">Este grupo todavía no tiene ninguna clase (asignación docente) creada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 bg-gray-50 text-left">Franja</th>
                  {DIAS.map((d) => <th key={d.numero} className="border p-2 bg-gray-50">{d.nombre}</th>)}
                </tr>
              </thead>
              <tbody>
                {franjas.map((f) => (
                  <tr key={f.id}>
                    <td className="border p-2 font-medium whitespace-nowrap">{f.nombre}<br /><span className="text-gray-400">{f.hora_inicio.slice(0,5)}-{f.hora_fin.slice(0,5)}</span></td>
                    {DIAS.map((d) => {
                      const clave = `${d.numero}-${f.id}`;
                      const valorActual = celdas[clave]?.asignacionId ?? "";
                      return (
                        <td key={d.numero} className="border p-1">
                          <select className="w-full border-0 text-xs p-1" value={valorActual} onChange={(e) => alCambiarCelda(d.numero, f.id, e.target.value)}>
                            <option value="">—</option>
                            {asignaciones.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
