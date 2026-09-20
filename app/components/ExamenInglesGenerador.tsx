"use client";
import { useState } from "react";
import Link from "next/link";
import { PARTES_INGLES_ICFES } from "@/lib/ai/ingles-compartido";

type Asignacion = { id: string; label: string };
type Pregunta = {
  id: string; competencia: string; tipo_texto: string; contexto: string;
  enunciado: string; opciones: Record<string, string>; respuesta_correcta: string; explicacion: string;
};

export default function ExamenInglesGenerador({ asignaciones }: { asignaciones: Asignacion[] }) {
  const [asignacionId, setAsignacionId] = useState("");
  const [tema, setTema] = useState("");

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
    const res = await fetch("/api/ai/generar-examen-ingles", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ asignacionId, tema }),
    });
    const data = await res.json();
    setCargando(false);
    if (!res.ok) { setError(data.error ?? "Error generando el examen."); return; }
    setExamenId(data.examenId); setPreguntas(data.preguntas); setEstado(data.estado);
  }

  async function aprobar() {
    if (!examenId) return;
    setCargando(true); setError(null);
    const res = await fetch("/api/ai/aprobar-examen-ingles", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ examenId, aprobado: true }),
    });
    const data = await res.json();
    setCargando(false);
    if (!res.ok) { setError(data.error); return; }
    setEstado("aprobado");
    setOk("Examen de inglés aprobado.");
  }

  async function pedirMejora() {
    if (!examenId || !instrucciones.trim()) return;
    setCargando(true); setError(null);
    const res = await fetch("/api/ai/aprobar-examen-ingles", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ examenId, aprobado: false, instrucciones }),
    });
    const data = await res.json();
    setCargando(false);
    if (!res.ok) { setError(data.error); return; }
    setPreguntas(data.preguntas); setEstado(data.estado); setMostrarMejora(false); setInstrucciones("");
  }

  // Reconstruye los grupos por parte a partir del orden fijo (las
  // cantidades por parte son siempre las mismas: 5,5,5,8,7,5,10).
  const partesConPreguntas = (() => {
    let cursor = 0;
    return PARTES_INGLES_ICFES.map((spec) => {
      const slice = preguntas.slice(cursor, cursor + spec.cantidad);
      cursor += spec.cantidad;
      return { spec, preguntas: slice };
    });
  })();

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" value={asignacionId} onChange={(e) => setAsignacionId(e.target.value)}>
          <option value="">Clase (grado/grupo/área/asignatura)</option>
          {asignaciones.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        <input placeholder="Tema/contexto general (ej: medio ambiente, tecnología)" className="border rounded-lg px-3 py-2 text-sm"
          value={tema} onChange={(e) => setTema(e.target.value)} />
        <button onClick={generar} disabled={cargando || !asignacionId || !tema}
          className="sm:col-span-3 a360-gradiente text-white text-sm font-semibold rounded-lg py-2 disabled:opacity-60">
          {cargando ? "Generando (puede tardar 1-2 minutos, son 45 preguntas)..." : "Generar examen de inglés (Saber 11°, 45 preguntas)"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-green-600">{ok}</p>}

      {preguntas.length > 0 && (
        <div className="bg-white border rounded-xl p-5 flex flex-col gap-5">
          <p className="text-xs text-gray-500">{preguntas.length} preguntas generadas en 7 partes.</p>

          <div className="flex flex-col gap-5 max-h-[32rem] overflow-y-auto pr-1">
            {partesConPreguntas.map(({ spec, preguntas: preguntasParte }) => (
              <div key={spec.numero} className="border rounded-lg p-3">
                <p className="text-sm font-bold mb-1" style={{ color: "var(--a360-azul)" }}>
                  Parte {spec.numero} — {spec.titulo} <span className="font-normal text-gray-400">(MCER {spec.nivelCEFR})</span>
                </p>
                <p className="text-xs text-gray-500 mb-2">{spec.instruccionEstudiante}</p>
                {spec.tieneTextoBase && preguntasParte[0] && (
                  <p className="text-xs text-gray-600 mb-2 whitespace-pre-line border-l-2 pl-2">{preguntasParte[0].contexto}</p>
                )}
                {spec.numero === 2 && preguntasParte[0] && (
                  <div className="text-xs mb-2 flex flex-wrap gap-2">
                    {Object.entries(preguntasParte[0].opciones).map(([letra, palabra]) => (
                      <span key={letra} className="border rounded px-2 py-0.5">{letra}. {palabra}</span>
                    ))}
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {preguntasParte.map((p, i) => (
                    <div key={p.id} className="text-xs">
                      <p className="font-medium">{spec.numero === 4 || spec.numero === 7 ? `Espacio ${i + 1}` : p.enunciado}</p>
                      {spec.numero !== 2 && (
                        <ul className="ml-3">
                          {Object.entries(p.opciones).map(([letra, texto]) => (
                            <li key={letra} className={p.respuesta_correcta === letra ? "font-semibold" : ""} style={p.respuesta_correcta === letra ? { color: "var(--a360-verde)" } : {}}>
                              {letra}. {texto}
                            </li>
                          ))}
                        </ul>
                      )}
                      {spec.numero === 2 && (
                        <p className="ml-3" style={{ color: "var(--a360-verde)" }}>Respuesta: {p.respuesta_correcta}</p>
                      )}
                    </div>
                  ))}
                </div>
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
              <p className="text-sm font-medium">¿Qué deseas mejorar? (se regenera el examen completo)</p>
              <textarea className="border rounded-lg px-3 py-2 text-sm" rows={2}
                value={instrucciones} onChange={(e) => setInstrucciones(e.target.value)}
                placeholder="Ej: usa textos sobre deportes en las partes de lectura" />
              <button onClick={pedirMejora} disabled={cargando || !instrucciones.trim()}
                className="self-start a360-gradiente text-white text-sm font-semibold rounded-lg px-4 py-2 disabled:opacity-60">
                {cargando ? "Regenerando..." : "Regenerar con esta mejora"}
              </button>
            </div>
          )}

          {estado === "aprobado" && examenId && (
            <div className="border-t pt-4 flex gap-2 flex-wrap">
              <Link href={`/dashboard/examenes/imprimir-ingles/${examenId}`} target="_blank" className="text-sm font-semibold border rounded-lg px-4 py-2 hover:bg-gray-50">
                Ver / imprimir examen
              </Link>
              <Link href={`/dashboard/examenes/imprimir-ingles/${examenId}/claves`} target="_blank" className="text-sm font-semibold border rounded-lg px-4 py-2 hover:bg-gray-50">
                Clave de respuestas (docente)
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
