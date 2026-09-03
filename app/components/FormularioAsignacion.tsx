"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Opcion = { id: string; nombre: string };
type Grupo = { id: string; nombre: string; grado_id: string };
type Asignatura = { id: string; nombre: string; area_id: string };

export default function FormularioAsignacion({
  institucionId, docentes, grados, grupos, areas, asignaturas,
}: {
  institucionId: string; docentes: Opcion[]; grados: Opcion[]; grupos: Grupo[]; areas: Opcion[]; asignaturas: Asignatura[];
}) {
  const router = useRouter();
  const [docenteId, setDocenteId] = useState("");
  const [gradoId, setGradoId] = useState("");
  const [grupoId, setGrupoId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [asignaturaId, setAsignaturaId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const gruposFiltrados = useMemo(() => grupos.filter((g) => g.grado_id === gradoId), [grupos, gradoId]);
  const asignaturasFiltradas = useMemo(() => asignaturas.filter((a) => a.area_id === areaId), [asignaturas, areaId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setOk(null); setGuardando(true);
    const supabase = createClient();
    const { error: err } = await supabase.from("asignaciones_docente").insert({
      docente_id: docenteId, institucion_id: institucionId,
      grado_id: gradoId, grupo_id: grupoId, area_id: areaId, asignatura_id: asignaturaId,
    });
    setGuardando(false);
    if (err) {
      setError(err.message.includes("duplicate") ? "Ese docente ya tiene esa asignatura asignada en ese grupo." : err.message);
      return;
    }
    setOk("Asignación creada.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-5 gap-3">
      <select required className="border rounded-lg px-3 py-2 text-sm" value={docenteId} onChange={(e) => setDocenteId(e.target.value)}>
        <option value="">Docente</option>
        {docentes.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
      </select>
      <select required className="border rounded-lg px-3 py-2 text-sm" value={gradoId}
        onChange={(e) => { setGradoId(e.target.value); setGrupoId(""); }}>
        <option value="">Grado</option>
        {grados.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
      </select>
      <select required className="border rounded-lg px-3 py-2 text-sm" value={grupoId} onChange={(e) => setGrupoId(e.target.value)} disabled={!gradoId}>
        <option value="">Grupo</option>
        {gruposFiltrados.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
      </select>
      <select required className="border rounded-lg px-3 py-2 text-sm" value={areaId}
        onChange={(e) => { setAreaId(e.target.value); setAsignaturaId(""); }}>
        <option value="">Área</option>
        {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
      </select>
      <select required className="border rounded-lg px-3 py-2 text-sm" value={asignaturaId} onChange={(e) => setAsignaturaId(e.target.value)} disabled={!areaId}>
        <option value="">Asignatura</option>
        {asignaturasFiltradas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
      </select>

      {error && <p className="text-sm text-red-600 sm:col-span-5">{error}</p>}
      {ok && <p className="text-sm text-green-600 sm:col-span-5">{ok}</p>}
      <button disabled={guardando} className="sm:col-span-5 a360-gradiente text-white text-sm font-semibold rounded-lg py-2 disabled:opacity-60">
        {guardando ? "Guardando..." : "Crear asignación"}
      </button>
    </form>
  );
}
