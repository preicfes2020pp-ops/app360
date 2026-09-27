"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormularioGenerarCodigoRector({
  instituciones,
}: {
  instituciones: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [institucionId, setInstitucionId] = useState("");
  const [codigoGenerado, setCodigoGenerado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCodigoGenerado(null);
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

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-5 flex flex-col gap-3">
      <select required className="border rounded-lg px-3 py-2 text-sm"
        value={institucionId} onChange={(e) => setInstitucionId(e.target.value)}>
        <option value="">Selecciona la institucion...</option>
        {instituciones.map((inst) => (
          <option key={inst.id} value={inst.id}>{inst.nombre}</option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {codigoGenerado && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
          Codigo generado: <span className="font-mono font-bold text-lg">{codigoGenerado}</span>
          <br />Compartelo con la persona que sera rector - lo debe escribir en /registro.
        </p>
      )}
      <button type="submit" disabled={enviando}
        className="a360-gradiente text-white font-semibold rounded-lg py-2 disabled:opacity-60">
        {enviando ? "Generando..." : "Generar codigo de rector"}
      </button>
    </form>
  );
}
