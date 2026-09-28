"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Institucion = { id: string; nombre: string; municipio: string | null };

export default function FormularioGenerarCodigoRector({
  instituciones,
}: {
  instituciones: Institucion[];
}) {
  const router = useRouter();
  const [municipio, setMunicipio] = useState("");
  const [institucionId, setInstitucionId] = useState("");
  const [codigoGenerado, setCodigoGenerado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const municipios = useMemo(
    () =>
      Array.from(new Set(instituciones.filter((i) => i.municipio).map((i) => i.municipio as string)))
        .sort((a, b) => a.localeCompare(b, "es")),
    [instituciones]
  );
  const institucionesDelMunicipio = useMemo(
    () => instituciones.filter((i) => i.municipio === municipio),
    [instituciones, municipio]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCodigoGenerado(null);
    setCopiado(false);
    setEnviando(true);
    const res = await fetch("/api/superadmin/generar-codigo-rector", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ institucionId }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo generar el codigo.");
      return;
    }
    setCodigoGenerado(data.codigo);
    router.refresh();
  }

  async function copiar() {
    if (!codigoGenerado) return;
    await navigator.clipboard.writeText(codigoGenerado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-5 flex flex-col gap-3">
      <select required className="border rounded-lg px-3 py-2 text-sm" value={municipio}
        onChange={(e) => { setMunicipio(e.target.value); setInstitucionId(""); }}>
        <option value="">Selecciona el municipio...</option>
        {municipios.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <select required disabled={!municipio} className="border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-400"
        value={institucionId} onChange={(e) => setInstitucionId(e.target.value)}>
        <option value="">{municipio ? "Selecciona la institucion..." : "Primero elige el municipio"}</option>
        {institucionesDelMunicipio.map((inst) => (
          <option key={inst.id} value={inst.id}>{inst.nombre}</option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {codigoGenerado && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 flex flex-col gap-2">
          <p>Codigo generado - compartelo con la persona que sera rector. Lo debe escribir en /registro.</p>
          <div className="flex items-center gap-2">
            <input readOnly value={codigoGenerado} onFocus={(e) => e.target.select()}
              className="font-mono font-bold text-lg border rounded-lg px-3 py-2 bg-white flex-1" />
            <button type="button" onClick={copiar}
              className="a360-gradiente text-white text-sm font-semibold rounded-lg px-4 py-2 whitespace-nowrap">
              {copiado ? "Copiado ✓" : "Copiar"}
            </button>
          </div>
        </div>
      )}
      <button type="submit" disabled={enviando}
        className="a360-gradiente text-white font-semibold rounded-lg py-2 disabled:opacity-60">
        {enviando ? "Generando..." : "Generar codigo de rector"}
      </button>
    </form>
  );
}
