"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Asignacion = { id: string; label: string };

export default function FormularioDiaDia({ institucionId, docenteId, asignaciones }: {
  institucionId: string; docenteId: string; asignaciones: Asignacion[];
}) {
  const router = useRouter();
  const [asignacionId, setAsignacionId] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [campos, setCampos] = useState({
    tema: "", objetivo: "", competencia: "", estandar: "",
    actividades: "", recursos: "", evaluacion: "", tarea: "", observaciones: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function actualizar<K extends keyof typeof campos>(campo: K, valor: string) {
    setCampos((c) => ({ ...c, [campo]: valor }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setOk(null); setGuardando(true);
    const supabase = createClient();
    const { error: err } = await supabase.from("daily_plans").insert({
      institucion_id: institucionId, docente_id: docenteId, asignacion_id: asignacionId, fecha, ...campos,
    });
    setGuardando(false);
    if (err) { setError(err.message); return; }
    setOk("Planeación del día guardada.");
    setCampos({ tema: "", objetivo: "", competencia: "", estandar: "", actividades: "", recursos: "", evaluacion: "", tarea: "", observaciones: "" });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-5 flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select required className="border rounded-lg px-3 py-2 text-sm" value={asignacionId} onChange={(e) => setAsignacionId(e.target.value)}>
          <option value="">Clase (grado/grupo/área/asignatura)</option>
          {asignaciones.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        <input required type="date" className="border rounded-lg px-3 py-2 text-sm" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </div>

      <input required placeholder="Tema" className="border rounded-lg px-3 py-2 text-sm"
        value={campos.tema} onChange={(e) => actualizar("tema", e.target.value)} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <textarea placeholder="Objetivo" className="border rounded-lg px-3 py-2 text-sm" rows={2}
          value={campos.objetivo} onChange={(e) => actualizar("objetivo", e.target.value)} />
        <textarea placeholder="Competencia" className="border rounded-lg px-3 py-2 text-sm" rows={2}
          value={campos.competencia} onChange={(e) => actualizar("competencia", e.target.value)} />
        <textarea placeholder="Estándar" className="border rounded-lg px-3 py-2 text-sm" rows={2}
          value={campos.estandar} onChange={(e) => actualizar("estandar", e.target.value)} />
        <textarea placeholder="Actividades" className="border rounded-lg px-3 py-2 text-sm" rows={2}
          value={campos.actividades} onChange={(e) => actualizar("actividades", e.target.value)} />
        <textarea placeholder="Recursos" className="border rounded-lg px-3 py-2 text-sm" rows={2}
          value={campos.recursos} onChange={(e) => actualizar("recursos", e.target.value)} />
        <textarea placeholder="Evaluación" className="border rounded-lg px-3 py-2 text-sm" rows={2}
          value={campos.evaluacion} onChange={(e) => actualizar("evaluacion", e.target.value)} />
        <textarea placeholder="Tarea" className="border rounded-lg px-3 py-2 text-sm" rows={2}
          value={campos.tarea} onChange={(e) => actualizar("tarea", e.target.value)} />
        <textarea placeholder="Observaciones" className="border rounded-lg px-3 py-2 text-sm" rows={2}
          value={campos.observaciones} onChange={(e) => actualizar("observaciones", e.target.value)} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-green-600">{ok}</p>}
      <button disabled={guardando || asignaciones.length === 0} className="a360-gradiente text-white text-sm font-semibold rounded-lg py-2 disabled:opacity-60">
        {guardando ? "Guardando..." : "Guardar planeación del día"}
      </button>
      {asignaciones.length === 0 && <p className="text-xs text-amber-600">Todavía no tienes clases asignadas por tu rector.</p>}
    </form>
  );
}
