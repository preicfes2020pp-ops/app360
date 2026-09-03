"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Opcion = { id: string; nombre: string };

export default function FormularioPlanArea({
  institucionId, docenteId, areas, grados,
}: { institucionId: string; docenteId: string; areas: Opcion[]; grados: Opcion[] }) {
  const router = useRouter();
  const [areaId, setAreaId] = useState("");
  const [gradoId, setGradoId] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [campos, setCampos] = useState({
    competencias: "", estandares: "", derechos_basicos_aprendizaje: "",
    evidencias: "", temas: "", objetivos: "", metodologia: "", evaluacion: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function actualizarCampo<K extends keyof typeof campos>(campo: K, valor: string) {
    setCampos((c) => ({ ...c, [campo]: valor }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setOk(null); setGuardando(true);
    const supabase = createClient();

    let archivoUrl: string | null = null;
    let archivoNombre: string | null = null;
    if (archivo) {
      const ruta = `${docenteId}/planes-area/${Date.now()}-${archivo.name}`;
      const { error: uploadError } = await supabase.storage.from("documentos").upload(ruta, archivo);
      if (uploadError) {
        setError("No pudimos subir el archivo: " + uploadError.message);
        setGuardando(false);
        return;
      }
      archivoUrl = ruta; // bucket privado: se resuelve con URL firmada al consultar
      archivoNombre = archivo.name;
    }

    const { error: insertError } = await supabase.from("area_plans").insert({
      institucion_id: institucionId, docente_id: docenteId, area_id: areaId, grado_id: gradoId,
      periodo, archivo_url: archivoUrl, archivo_nombre: archivoNombre,
      estado_extraccion: "manual", ...campos,
    });

    setGuardando(false);
    if (insertError) { setError(insertError.message); return; }
    setOk("Plan de área guardado.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-5 flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select required className="border rounded-lg px-3 py-2 text-sm" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
          <option value="">Área</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        <select required className="border rounded-lg px-3 py-2 text-sm" value={gradoId} onChange={(e) => setGradoId(e.target.value)}>
          <option value="">Grado</option>
          {grados.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
        </select>
        <input required placeholder="Periodo (ej: Periodo 1 - 2026)" className="border rounded-lg px-3 py-2 text-sm"
          value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
      </div>

      <label className="text-sm">
        <span className="text-gray-500">Documento del plan de área (PDF, Word, JPG o PNG) — opcional</span>
        <input type="file" accept=".pdf,.doc,.docx,image/*" className="block mt-1 text-sm"
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
      </label>

      <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
        La extracción automática por IA de este documento todavía no está integrada
        (queda documentado como pendiente en PROGRESO_AULA360.md). Por ahora completa
        los campos manualmente — tú siempre tienes la última palabra sobre este contenido.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <textarea placeholder="Competencias" className="border rounded-lg px-3 py-2 text-sm" rows={2}
          value={campos.competencias} onChange={(e) => actualizarCampo("competencias", e.target.value)} />
        <textarea placeholder="Estándares" className="border rounded-lg px-3 py-2 text-sm" rows={2}
          value={campos.estandares} onChange={(e) => actualizarCampo("estandares", e.target.value)} />
        <textarea placeholder="Derechos básicos de aprendizaje" className="border rounded-lg px-3 py-2 text-sm" rows={2}
          value={campos.derechos_basicos_aprendizaje} onChange={(e) => actualizarCampo("derechos_basicos_aprendizaje", e.target.value)} />
        <textarea placeholder="Evidencias" className="border rounded-lg px-3 py-2 text-sm" rows={2}
          value={campos.evidencias} onChange={(e) => actualizarCampo("evidencias", e.target.value)} />
        <textarea placeholder="Temas" className="border rounded-lg px-3 py-2 text-sm" rows={2}
          value={campos.temas} onChange={(e) => actualizarCampo("temas", e.target.value)} />
        <textarea placeholder="Objetivos" className="border rounded-lg px-3 py-2 text-sm" rows={2}
          value={campos.objetivos} onChange={(e) => actualizarCampo("objetivos", e.target.value)} />
        <textarea placeholder="Metodología" className="border rounded-lg px-3 py-2 text-sm" rows={2}
          value={campos.metodologia} onChange={(e) => actualizarCampo("metodologia", e.target.value)} />
        <textarea placeholder="Evaluación" className="border rounded-lg px-3 py-2 text-sm" rows={2}
          value={campos.evaluacion} onChange={(e) => actualizarCampo("evaluacion", e.target.value)} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-green-600">{ok}</p>}
      <button disabled={guardando} className="a360-gradiente text-white text-sm font-semibold rounded-lg py-2 disabled:opacity-60">
        {guardando ? "Guardando..." : "Guardar plan de área"}
      </button>
    </form>
  );
}
