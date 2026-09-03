"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Asignacion = { id: string; label: string; grupoId: string };
type Estudiante = { id: string; nombre_completo: string };
type Estado = "presente" | "ausente" | "excusa" | "retardo";

export default function AsistenciaFormulario({
  institucionId, docenteId, asignaciones,
}: { institucionId: string; docenteId: string; asignaciones: Asignacion[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [asignacionId, setAsignacionId] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [estados, setEstados] = useState<Record<string, { estado: Estado; observaciones: string }>>({});
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function cargarLista() {
    setError(null); setOk(null);
    if (!asignacionId || !fecha) { setError("Selecciona la clase y la fecha."); return; }
    setCargando(true);

    const asignacion = asignaciones.find((a) => a.id === asignacionId)!;
    const { data: listaEstudiantes, error: errEst } = await supabase
      .from("estudiantes").select("id, nombre_completo").eq("grupo_id", asignacion.grupoId).order("nombre_completo");

    if (errEst) { setError(errEst.message); setCargando(false); return; }

    // ¿Ya existe asistencia tomada ese día para esta clase? Si sí, precargarla.
    const { data: attendanceExistente } = await supabase
      .from("attendance").select("id").eq("asignacion_id", asignacionId).eq("fecha", fecha).maybeSingle();

    const nuevosEstados: Record<string, { estado: Estado; observaciones: string }> = {};
    if (attendanceExistente) {
      const { data: detalle } = await supabase
        .from("attendance_estudiante").select("estudiante_id, estado, observaciones").eq("attendance_id", attendanceExistente.id);
      (detalle ?? []).forEach((d) => { nuevosEstados[d.estudiante_id] = { estado: d.estado as Estado, observaciones: d.observaciones ?? "" }; });
      setAttendanceId(attendanceExistente.id);
    } else {
      setAttendanceId(null);
    }
    (listaEstudiantes ?? []).forEach((est) => {
      if (!nuevosEstados[est.id]) nuevosEstados[est.id] = { estado: "presente", observaciones: "" };
    });

    setEstudiantes(listaEstudiantes ?? []);
    setEstados(nuevosEstados);
    setCargando(false);
  }

  function cambiarEstado(estudianteId: string, estado: Estado) {
    setEstados((e) => ({ ...e, [estudianteId]: { ...e[estudianteId], estado } }));
  }
  function cambiarObservacion(estudianteId: string, observaciones: string) {
    setEstados((e) => ({ ...e, [estudianteId]: { ...e[estudianteId], observaciones } }));
  }

  async function guardarAsistencia() {
    setGuardando(true); setError(null); setOk(null);

    let idAttendance = attendanceId;
    if (!idAttendance) {
      const { data, error: errIns } = await supabase
        .from("attendance")
        .insert({ institucion_id: institucionId, docente_id: docenteId, asignacion_id: asignacionId, fecha })
        .select("id").single();
      if (errIns || !data) { setError(errIns?.message ?? "No se pudo crear el registro de asistencia."); setGuardando(false); return; }
      idAttendance = data.id;
      setAttendanceId(idAttendance);
    }

    const filas = estudiantes.map((est) => ({
      attendance_id: idAttendance,
      estudiante_id: est.id,
      estado: estados[est.id]?.estado ?? "presente",
      observaciones: estados[est.id]?.observaciones || null,
    }));

    const { error: errUpsert } = await supabase
      .from("attendance_estudiante")
      .upsert(filas, { onConflict: "attendance_id,estudiante_id" });

    setGuardando(false);
    if (errUpsert) { setError(errUpsert.message); return; }
    setOk("Asistencia guardada.");
    router.refresh();
  }

  const etiquetaEstado: Record<Estado, string> = { presente: "Presente", ausente: "Ausente", excusa: "Excusa", retardo: "Retardo" };

  return (
    <div className="bg-white border rounded-xl p-5 flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" value={asignacionId} onChange={(e) => setAsignacionId(e.target.value)}>
          <option value="">Clase (grado/grupo/área/asignatura)</option>
          {asignaciones.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>
      <button type="button" onClick={cargarLista} disabled={cargando}
        className="self-start text-sm font-medium border rounded-lg px-4 py-2 hover:bg-gray-50 disabled:opacity-60">
        {cargando ? "Cargando..." : "Cargar lista de estudiantes"}
      </button>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-green-600">{ok}</p>}

      {estudiantes.length > 0 && (
        <div className="flex flex-col gap-2">
          {estudiantes.map((est) => (
            <div key={est.id} className="flex flex-col sm:flex-row sm:items-center gap-2 border-t pt-2">
              <p className="text-sm flex-1">{est.nombre_completo}</p>
              <div className="flex gap-1">
                {(["presente", "ausente", "excusa", "retardo"] as Estado[]).map((op) => (
                  <button key={op} type="button" onClick={() => cambiarEstado(est.id, op)}
                    className={`text-xs px-2 py-1 rounded-full border ${estados[est.id]?.estado === op ? "a360-gradiente text-white border-transparent" : "text-gray-500"}`}>
                    {etiquetaEstado[op]}
                  </button>
                ))}
              </div>
              <input placeholder="Observación" className="border rounded-lg px-2 py-1 text-xs sm:w-40"
                value={estados[est.id]?.observaciones ?? ""} onChange={(e) => cambiarObservacion(est.id, e.target.value)} />
            </div>
          ))}
          <button type="button" onClick={guardarAsistencia} disabled={guardando}
            className="mt-2 a360-gradiente text-white text-sm font-semibold rounded-lg py-2 disabled:opacity-60">
            {guardando ? "Guardando..." : "Guardar asistencia"}
          </button>
        </div>
      )}
      {estudiantes.length === 0 && !cargando && (
        <p className="text-xs text-gray-400">Elige clase y fecha, luego carga la lista para tomar asistencia.</p>
      )}
    </div>
  );
}
