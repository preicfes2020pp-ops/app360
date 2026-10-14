"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Asignatura = { id: string; nombre: string };
type Area = { id: string; nombre: string; asignaturas: Asignatura[] };

const GRADOS = [
  { v: "6", t: "Sexto (6)" }, { v: "7", t: "Séptimo (7)" }, { v: "8", t: "Octavo (8)" },
  { v: "9", t: "Noveno (9)" }, { v: "10", t: "Décimo (10)" }, { v: "11", t: "Undécimo (11)" },
];

export default function FormularioGenerarBanco({ areas }: { areas: Area[] }) {
  const router = useRouter();
  const [areaId, setAreaId] = useState("");
  const [asignaturaId, setAsignaturaId] = useState("");
  const [grado, setGrado] = useState("11");
  const [nivel, setNivel] = useState("intermedio");
  const [cantidad, setCantidad] = useState("8");
  const [temasTexto, setTemasTexto] = useState("");
  const [registro, setRegistro] = useState<string[]>([]);
  const [corriendo, setCorriendo] = useState(false);
  const detener = useRef(false);

  const area = areas.find((a) => a.id === areaId) ?? null;
  const temas = Array.from(new Set(temasTexto.split("\n").map((t) => t.trim()).filter(Boolean))).slice(0, 20);
  const costo = (temas.length * Number(cantidad) * 0.022).toFixed(2);

  function anotar(linea: string) {
    setRegistro((r) => [...r, linea]);
  }

  async function generar(e: React.FormEvent) {
    e.preventDefault();
    if (!asignaturaId || temas.length === 0) return;
    detener.current = false;
    setCorriendo(true);
    setRegistro([]);
    let total = 0;

    for (let i = 0; i < temas.length; i++) {
      if (detener.current) {
        anotar("Detenido por ti.");
        break;
      }
      anotar(`Lote ${i + 1} de ${temas.length}: ${temas[i]} ...`);
      try {
        const res = await fetch("/api/superadmin/banco/generar", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ catalogoAsignaturaId: asignaturaId, grado, tema: temas[i], nivel, cantidad }),
        });
        const data = await res.json();
        if (!res.ok) {
          anotar(`   Error: ${data.error ?? res.status}`);
          if (res.status === 401 || res.status === 403) break;
          continue;
        }
        total += data.agregadas;
        anotar(`   Agregadas ${data.agregadas} | repetidas ${data.repetidas} | sin imagen ${data.sinImagen} | errores ${data.errores}`);
      } catch {
        anotar("   El servidor no respondió a tiempo (puede que el lote igual se haya guardado).");
      }
    }

    anotar(`Listo: ${total} preguntas nuevas en el banco.`);
    setCorriendo(false);
    router.refresh();
  }

  return (
    <form onSubmit={generar} className="bg-white border rounded-xl p-5 flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select required className="border rounded-lg px-3 py-2 text-sm" value={areaId}
          onChange={(e) => { setAreaId(e.target.value); setAsignaturaId(""); }}>
          <option value="">Área...</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>
        <select required disabled={!area} className="border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
          value={asignaturaId} onChange={(e) => setAsignaturaId(e.target.value)}>
          <option value="">{area ? "Asignatura..." : "Primero elige el área"}</option>
          {(area?.asignaturas ?? []).map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm" value={grado} onChange={(e) => setGrado(e.target.value)}>
          {GRADOS.map((g) => (
            <option key={g.v} value={g.v}>{g.t}</option>
          ))}
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm" value={nivel} onChange={(e) => setNivel(e.target.value)}>
          <option value="basico">Nivel básico</option>
          <option value="intermedio">Nivel intermedio</option>
          <option value="avanzado">Nivel avanzado</option>
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm" value={cantidad} onChange={(e) => setCantidad(e.target.value)}>
          <option value="6">6 preguntas por lote</option>
          <option value="8">8 preguntas por lote</option>
          <option value="10">10 preguntas por lote</option>
          <option value="12">12 preguntas por lote</option>
        </select>
      </div>

      <textarea
        required
        rows={5}
        className="border rounded-lg px-3 py-2 text-sm"
        placeholder={"Un tema por línea. Cada tema es un lote. Ejemplo:\nFracciones equivalentes\nOperaciones con decimales\nPorcentajes"}
        value={temasTexto}
        onChange={(e) => setTemasTexto(e.target.value)}
      />

      <p className="text-xs text-gray-500">
        {temas.length} lote(s) × {cantidad} preguntas, costo aproximado US$ {costo}. Cada lote tarda cerca de un minuto: no cierres esta pantalla mientras corre.
      </p>

      <div className="flex gap-2">
        <button type="submit" disabled={corriendo || temas.length === 0 || !asignaturaId}
          className="a360-gradiente text-white font-semibold rounded-lg px-5 py-2 disabled:opacity-60">
          {corriendo ? "Generando..." : `Generar ${temas.length} lote(s)`}
        </button>
        {corriendo && (
          <button type="button" onClick={() => { detener.current = true; }} className="border rounded-lg px-4 py-2 text-sm">
            Detener
          </button>
        )}
      </div>

      {registro.length > 0 && (
        <pre className="bg-gray-50 border rounded-lg p-3 text-xs whitespace-pre-wrap">{registro.join("\n")}</pre>
      )}
    </form>
  );
}
