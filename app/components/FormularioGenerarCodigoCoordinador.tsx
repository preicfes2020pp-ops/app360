"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormularioGenerarCodigoCoordinador() {
  const router = useRouter();
  const [codigoGenerado, setCodigoGenerado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function generar() {
    setError(null);
    setCodigoGenerado(null);
    setEnviando(true);
    const res = await fetch("/api/rector/generar-codigo-coordinador", { method: "POST" });
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
    <div className="bg-white border rounded-xl p-5 flex flex-col gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {codigoGenerado && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
          Codigo generado: <span className="font-mono font-bold text-lg">{codigoGenerado}</span>
          <br />Compartelo con la persona que sera coordinador - lo debe escribir en /registro.
        </p>
      )}
      <button onClick={generar} disabled={enviando}
        className="a360-gradiente text-white font-semibold rounded-lg py-2 disabled:opacity-60">
        {enviando ? "Generando..." : "Generar codigo de coordinador"}
      </button>
    </div>
  );
}
