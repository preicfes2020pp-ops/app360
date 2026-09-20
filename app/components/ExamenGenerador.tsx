"use client";
import { useState } from "react";
import Link from "next/link";

type Asignacion = { id: string; label: string };
type Pregunta = {
  id: string; tema: string; competencia: string; tipo_texto: string; contexto: string;
  enunciado: string; opciones: { A: string; B: string; C: string; D: string }; respuesta_correcta: string; explicacion: string;
  imagen_url_firmada?: string | null;
};

const ETIQUETA_TIPO: Record<string, string> = { continuo: "Texto continuo", discontinuo: "Texto discontinuo", mixto: "Texto mixto" };

export default function ExamenGenerador({ asignaciones }: { asignaciones: Asignacion[] }) {
  const [asignacionId, setAsignacionId] = useState("");
  const [tema, setTema] = useState("");
  const [numeroItems, setNumeroItems] = useState(20);
  const [dificultad, setDificultad] = useState<"basico" | "intermedio" | "avanzado">("intermedio");

  const [examenId, setExamenId] = useState<string | null>(null);
  const [preguntas, setPreguntas] = useState<Pregunta[]>([]);
  const [estado, setEstado] = useState<"pendiente_aprobacion" | "aprobado" | null>(null);
  const [mostrarMejora, setMostrarMejora] = useState(false);
  const [instrucciones, setInstrucciones] = useState("");

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function generar() {
    setError(null); setOk(null); setCargando(true);
    setPreguntas([]); setExamenId(null); setMostrarMejora(false); setEstado(null);
    const res = await fetch("/api/ai/generar-examen", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ asignacionId, tema, numeroItems, nivelDificultad: dificultad }),
    });
    const data = await res.json();
    setCargando(false);
    if (!res.ok) { setError(data.error ?? "Error generando el examen."); return; }
    setExamenId(data.examenId); setPreguntas(data.preguntas); setEstado(data.estado);
  }

  async function aprobar() {
    if (!examenId) return;
    setCargando(true); setError(null);
    const res = await fetch("/api/ai/aprobar-examen", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ examenId, aprobado: true }),
    });
    const data = await res.json();
    setCargando(false);
    if (!res.ok) { setError(data.error); return; }
    setEstado("aprobado");
    setOk("Examen aprobado. Se crearon las versiones A, B y C listas para imprimir.");
  }

  async function pedirMejora() {
    if (!examenId || !instrucciones.trim()) return;
    setCargando(true); setError(null);
    const res = await fetch("/api/ai/aprobar-examen", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ examenId, aprobado: false, instrucciones }),
    });
    const data = await res.json();
    setCargando(false);
    if (!res.ok) { setError(data.error); return; }
    setPreguntas(data.preguntas); setEstado(data.estado); setMostrarMejora(false); setInstrucciones("");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <select className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" value={asignacionId} onChange={(e) => setAsignacionId(e.target.value)}>
          <option value="">Clase (grado/grupo/área/asignatura)</option>
          {asignaciones.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        <input placeholder="Tema (ej: Sistemas de ecuaciones)" className="border rounded-lg px-3 py-2 text-sm sm:col-span-2"
          value={tema} onChange={(e) => setTema(e.target.value)} />
        <input type="number" min={20} placeholder="Número de preguntas (mín. 20)" className="border rounded-lg px-3 py-2 text-sm"
          value={numeroItems} onChange={(e) => setNumeroItems(parseInt(e.target.value) || 20)} />
        <select className="border rounded-lg px-3 py-2 text-sm" value={dificultad} onChange={(e) => setDificultad(e.target.value as any)}>
          <option value="basico">Básico</option>
          <option value="intermedio">Intermedio</option>
          <option value="avanzado">Avanzado</option>
        </select>
        <button onClick={generar} disabled={cargando || !asignacionId || !tema || numeroItems < 20}
          className="sm:col-span-2 a360-gradiente text-white text-sm font-semibold rounded-lg py-2 disabled:opacity-60">
          {cargando ? "Generando..." : "Generar examen"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-green-600">{ok}</p>}

      {preguntas.length > 0 && (
        <div className="bg-white border rounded-xl p-5 flex flex-col gap-4">
          <p className="text-xs text-gray-500">{preguntas.length} preguntas generadas.</p>

          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
            {preguntas.map((p, idx) => (
              <div key={p.id} className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold" style={{ color: "var(--a360-azul)" }}>#{idx + 1}</span>
                  <span className="text-[10px] uppercase font-semibold text-gray-400">{ETIQUETA_TIPO[p.tipo_texto]}</span>
                  <span className="text-[10px] text-gray-400">· {p.competencia}</span>
                </div>
                <p className="text-xs text-gray-600 mb-2 break-words [overflow-wrap:anywhere]">{p.contexto}</p>
                {p.imagen_url_firmada && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imagen_url_firmada} alt="Tabla o gráfico de la pregunta" className="max-w-xs rounded border mb-2" />
                )}
                <p className="text-sm font-medium mb-1">{p.enunciado}</p>
                <ul className="text-xs space-y-0.5">
                  {(["A", "B", "C", "D"] as const).map((letra) => (
                    <li key={letra} className={p.respuesta_correcta === letra ? "font-semibold" : ""} style={p.respuesta_correcta === letra ? { color: "var(--a360-verde)" } : {}}>
                      {letra}. {p.opciones[letra]}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {estado === "pendiente_aprobacion" && !mostrarMejora && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">¿Apruebas este examen tal como está?</p>
              <div className="flex gap-2">
                <button onClick={aprobar} disabled={cargando} className="a360-gradiente text-white text-sm font-semibold rounded-lg px-4 py-2">
                  Sí, apruebo el examen
                </button>
                <button onClick={() => setMostrarMejora(true)} className="border text-sm font-semibold rounded-lg px-4 py-2">
                  No, quiero mejorarlo
                </button>
              </div>
            </div>
          )}

          {mostrarMejora && (
            <div className="border-t pt-4 flex flex-col gap-2">
              <p className="text-sm font-medium">¿Qué deseas mejorar?</p>
              <textarea className="border rounded-lg px-3 py-2 text-sm" rows={2}
                value={instrucciones} onChange={(e) => setInstrucciones(e.target.value)}
                placeholder="Ej: sube el nivel de las últimas 5 preguntas" />
              <button onClick={pedirMejora} disabled={cargando || !instrucciones.trim()}
                className="self-start a360-gradiente text-white text-sm font-semibold rounded-lg px-4 py-2 disabled:opacity-60">
                {cargando ? "Regenerando..." : "Regenerar con esta mejora"}
              </button>
            </div>
          )}

          {estado === "aprobado" && examenId && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Versión A lista para imprimir (las versiones B y C aparecerán en la tabla de abajo):</p>
              <div className="flex gap-2 flex-wrap">
                <Link href={`/dashboard/examenes/imprimir/${examenId}`} target="_blank" className="text-sm font-semibold border rounded-lg px-4 py-2 hover:bg-gray-50">
                  Ver / imprimir versión A
                </Link>
                <Link href={`/dashboard/examenes/imprimir/${examenId}/claves`} target="_blank" className="text-sm font-semibold border rounded-lg px-4 py-2 hover:bg-gray-50">
                  Clave de respuestas (docente)
                </Link>
                <Link href={`/dashboard/examenes/imprimir/${examenId}/hoja-respuestas`} target="_blank" className="text-sm font-semibold border rounded-lg px-4 py-2 hover:bg-gray-50">
                  Hoja de respuestas (estudiante)
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
