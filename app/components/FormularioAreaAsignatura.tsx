"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Area = { id: string; nombre: string };

export default function FormularioAreaAsignatura({ institucionId, areas }: { institucionId: string; areas: Area[] }) {
  const router = useRouter();
  const supabase = createClient();

  const [nombreArea, setNombreArea] = useState("");
  const [guardandoArea, setGuardandoArea] = useState(false);
  const [errorArea, setErrorArea] = useState<string | null>(null);

  const [areaId, setAreaId] = useState("");
  const [nombreAsignatura, setNombreAsignatura] = useState("");
  const [guardandoAsig, setGuardandoAsig] = useState(false);
  const [errorAsig, setErrorAsig] = useState<string | null>(null);

  async function crearArea(e: React.FormEvent) {
    e.preventDefault();
    setErrorArea(null);
    setGuardandoArea(true);
    const { error } = await supabase.from("areas").insert({ institucion_id: institucionId, nombre: nombreArea });
    setGuardandoArea(false);
    if (error) { setErrorArea(error.message); return; }
    setNombreArea("");
    router.refresh();
  }

  async function crearAsignatura(e: React.FormEvent) {
    e.preventDefault();
    setErrorAsig(null);
    setGuardandoAsig(true);
    const { error } = await supabase.from("asignaturas").insert({ area_id: areaId, nombre: nombreAsignatura });
    setGuardandoAsig(false);
    if (error) { setErrorAsig(error.message); return; }
    setNombreAsignatura("");
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <form onSubmit={crearArea} className="bg-white border rounded-xl p-5 flex flex-col gap-3">
        <p className="text-sm font-semibold">Nueva área</p>
        <input required placeholder="Ej: Ciencias Naturales" className="border rounded-lg px-3 py-2 text-sm"
          value={nombreArea} onChange={(e) => setNombreArea(e.target.value)} />
        {errorArea && <p className="text-sm text-red-600">{errorArea}</p>}
        <button disabled={guardandoArea} className="a360-gradiente text-white text-sm font-semibold rounded-lg py-2 disabled:opacity-60">
          {guardandoArea ? "Guardando..." : "Crear área"}
        </button>
      </form>

      <form onSubmit={crearAsignatura} className="bg-white border rounded-xl p-5 flex flex-col gap-3">
        <p className="text-sm font-semibold">Nueva asignatura</p>
        <select required className="border rounded-lg px-3 py-2 text-sm" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
          <option value="">Área</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        <input required placeholder="Ej: Biología" className="border rounded-lg px-3 py-2 text-sm"
          value={nombreAsignatura} onChange={(e) => setNombreAsignatura(e.target.value)} />
        {errorAsig && <p className="text-sm text-red-600">{errorAsig}</p>}
        <button disabled={guardandoAsig || areas.length === 0} className="a360-gradiente text-white text-sm font-semibold rounded-lg py-2 disabled:opacity-60">
          {guardandoAsig ? "Guardando..." : "Crear asignatura"}
        </button>
        {areas.length === 0 && <p className="text-xs text-amber-600">Primero crea al menos un área.</p>}
      </form>
    </div>
  );
}
