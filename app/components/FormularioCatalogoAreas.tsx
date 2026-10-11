"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type AsignaturaCatalogo = { id: string; nombre: string };
type AreaCatalogo = { id: string; nombre: string; asignaturas: AsignaturaCatalogo[] };
type AreaExistente = { areaId: string; catalogoAreaId: string; catalogoAsignaturaIds: string[] };

export default function FormularioCatalogoAreas({
  institucionId,
  catalogo,
  existentes,
}: {
  institucionId: string;
  catalogo: AreaCatalogo[];
  existentes: AreaExistente[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [catalogoAreaId, setCatalogoAreaId] = useState("");
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const area = useMemo(() => catalogo.find((a) => a.id === catalogoAreaId) ?? null, [catalogo, catalogoAreaId]);
  const existente = useMemo(() => existentes.find((e) => e.catalogoAreaId === catalogoAreaId) ?? null, [existentes, catalogoAreaId]);
  const yaAgregadas = existente?.catalogoAsignaturaIds ?? [];

  function elegirArea(id: string) {
    setCatalogoAreaId(id);
    setError(null);
    setMensaje(null);
    const a = catalogo.find((x) => x.id === id);
    const ya = existentes.find((e) => e.catalogoAreaId === id)?.catalogoAsignaturaIds ?? [];
    setSeleccion(a ? a.asignaturas.filter((s) => !ya.includes(s.id)).map((s) => s.id) : []);
  }

  function alternar(id: string) {
    setSeleccion((actual) => (actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id]));
  }

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    if (!area) return;

    const elegidas = area.asignaturas.filter((s) => seleccion.includes(s.id) && !yaAgregadas.includes(s.id));
    if (elegidas.length === 0) {
      setError("Marca al menos una asignatura que todavía no hayas agregado.");
      return;
    }
    setGuardando(true);

    let areaId: string | null = existente?.areaId ?? null;
    if (!areaId) {
      const { data, error: errorArea } = await supabase
        .from("areas")
        .insert({ institucion_id: institucionId, nombre: area.nombre, catalogo_area_id: area.id })
        .select("id")
        .single();
      if (errorArea || !data) {
        setGuardando(false);
        setError(errorArea?.message ?? "No se pudo crear el área.");
        return;
      }
      areaId = data.id as string;
    }

    const { error: errorAsig } = await supabase
      .from("asignaturas")
      .insert(elegidas.map((s) => ({ area_id: areaId, nombre: s.nombre, catalogo_asignatura_id: s.id })));
    setGuardando(false);
    if (errorAsig) {
      setError(errorAsig.message);
      return;
    }

    setMensaje(`Se agregaron ${elegidas.length} asignatura(s) a ${area.nombre}.`);
    setCatalogoAreaId("");
    setSeleccion([]);
    router.refresh();
  }

  return (
    <form onSubmit={agregar} className="bg-white border rounded-xl p-5 flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold">Agregar desde el catálogo</p>
        <p className="text-xs text-gray-500">Las áreas del catálogo usan el banco de preguntas para armar exámenes.</p>
      </div>
      <select className="border rounded-lg px-3 py-2 text-sm" value={catalogoAreaId} onChange={(e) => elegirArea(e.target.value)}>
        <option value="">Elige un área del catálogo</option>
        {catalogo.map((a) => (
          <option key={a.id} value={a.id}>{a.nombre}</option>
        ))}
      </select>
      {area && (
        <div className="flex flex-col gap-2">
          {area.asignaturas.map((s) => {
            const ya = yaAgregadas.includes(s.id);
            return (
              <label key={s.id} className={`flex items-center gap-2 text-sm ${ya ? "text-gray-400" : ""}`}>
                <input type="checkbox" disabled={ya} checked={ya || seleccion.includes(s.id)} onChange={() => alternar(s.id)} />
                {s.nombre}
                {ya && <span className="text-xs">(ya agregada)</span>}
              </label>
            );
          })}
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {mensaje && <p className="text-sm text-green-600">{mensaje}</p>}
      <button disabled={guardando || !area} className="a360-gradiente text-white text-sm font-semibold rounded-lg py-2 disabled:opacity-60">
        {guardando ? "Agregando..." : "Agregar al colegio"}
      </button>
    </form>
  );
}
