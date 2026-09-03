"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import type { ClaseGenerada } from "@/lib/ai/tipos";

type Asignacion = { id: string; label: string };

export default function GeneradorIA({ asignaciones }: { asignaciones: Asignacion[] }) {
  const supabase = createClient();
  const [asignacionId, setAsignacionId] = useState("");
  const [tema, setTema] = useState("");
  const [tiempo, setTiempo] = useState(60);
  const [dificultad, setDificultad] = useState<"basico" | "intermedio" | "avanzado">("intermedio");

  const [generacionId, setGeneracionId] = useState<string | null>(null);
  const [contenido, setContenido] = useState<ClaseGenerada | null>(null);
  const [estado, setEstado] = useState<"pendiente_aprobacion" | "aprobado" | null>(null);
  const [mostrarMejora, setMostrarMejora] = useState(false);
  const [instrucciones, setInstrucciones] = useState("");

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [imagenesPorActividad, setImagenesPorActividad] = useState<Record<number, string>>({});
  const [generandoImagen, setGenerandoImagen] = useState<number | null>(null);

  async function generar() {
    setError(null); setOk(null); setCargando(true);
    setContenido(null); setGeneracionId(null); setMostrarMejora(false); setImagenesPorActividad({});
    const res = await fetch("/api/ai/generar-clase", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ asignacionId, tema, tiempoClaseMinutos: tiempo, nivelDificultad: dificultad }),
    });
    const data = await res.json();
    setCargando(false);
    if (!res.ok) { setError(data.error ?? "Error generando la clase."); return; }
    setGeneracionId(data.id); setContenido(data.contenido); setEstado(data.estado);
  }

  async function aprobar() {
    if (!generacionId) return;
    setCargando(true); setError(null);
    const res = await fetch("/api/ai/aprobar", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ generacionId, aprobado: true }),
    });
    const data = await res.json();
    setCargando(false);
    if (!res.ok) { setError(data.error); return; }
    setEstado("aprobado");
    setOk("Contenido aprobado.");
  }

  async function pedirMejora() {
    if (!generacionId || !instrucciones.trim()) return;
    setCargando(true); setError(null);
    const res = await fetch("/api/ai/aprobar", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ generacionId, aprobado: false, instruccionesMejora: instrucciones }),
    });
    const data = await res.json();
    setCargando(false);
    if (!res.ok) { setError(data.error); return; }
    setContenido(data.contenido); setEstado(data.estado); setMostrarMejora(false); setInstrucciones("");
    setImagenesPorActividad({});
  }

  async function generarImagenActividad(idx: number, instrucciones: string) {
    setGenerandoImagen(idx); setError(null);
    const res = await fetch("/api/ai/generar-imagen", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ descripcion: `${tema}: ${instrucciones}` }),
    });
    const data = await res.json();
    setGenerandoImagen(null);
    if (!res.ok) { setError(data.error ?? "No se pudo generar la imagen."); return; }
    setImagenesPorActividad((m) => ({ ...m, [idx]: data.url }));
  }

  async function guardarEnDiaADia() {
    if (!contenido) return;
    setError(null); setOk(null);
    const { error: err } = await supabase.from("daily_plans").insert({
      institucion_id: (await supabase.from("perfiles").select("institucion_id").single()).data?.institucion_id,
      docente_id: (await supabase.auth.getUser()).data.user?.id,
      asignacion_id: asignacionId,
      fecha: new Date().toISOString().slice(0, 10),
      tema,
      objetivo: contenido.objetivo,
      competencia: contenido.competencia,
      estandar: contenido.estandar,
      actividades: contenido.actividades.map((a) => `${a.titulo}: ${a.instrucciones}`).join("\n\n"),
      recursos: contenido.recursos,
      evaluacion: contenido.evaluacion,
      tarea: contenido.tarea,
      observaciones: `Refuerzo sugerido: ${contenido.refuerzo}`,
    });
    if (err) { setError(err.message); return; }
    setOk("Guardado en tu Día a día.");
  }

  async function exportarPptx() {
    if (!contenido) return;
    const PptxGenJS = (await import("pptxgenjs")).default;
    const pres = new PptxGenJS();

    const portada = pres.addSlide();
    portada.addText(tema, { x: 0.5, y: 2, fontSize: 32, bold: true, color: "0B2447" });
    portada.addText("Generado con AULA360 — Planea. Enseña. Evalúa. Mejora.", { x: 0.5, y: 3, fontSize: 14, color: "666666" });

    const objetivos = pres.addSlide();
    objetivos.addText("Objetivo y competencia", { x: 0.5, y: 0.4, fontSize: 22, bold: true, color: "1868C4" });
    objetivos.addText(`Objetivo: ${contenido.objetivo}\n\nCompetencia: ${contenido.competencia}\n\nEstándar: ${contenido.estandar}`, { x: 0.5, y: 1.2, fontSize: 16, w: 9 });

    contenido.actividades.forEach((act) => {
      const slide = pres.addSlide();
      slide.addText(act.titulo, { x: 0.5, y: 0.4, fontSize: 22, bold: true, color: "2FAE60" });
      slide.addText(act.instrucciones, { x: 0.5, y: 1.2, fontSize: 16, w: 9 });
    });

    const cierre = pres.addSlide();
    cierre.addText(`Tarea: ${contenido.tarea}\n\nRefuerzo: ${contenido.refuerzo}`, { x: 0.5, y: 1, fontSize: 16, w: 9 });

    await pres.writeFile({ fileName: `AULA360-${tema.replace(/\s+/g, "-")}.pptx` });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <select className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" value={asignacionId} onChange={(e) => setAsignacionId(e.target.value)}>
          <option value="">Clase (grado/grupo/área/asignatura)</option>
          {asignaciones.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
        <input placeholder="Tema (ej: Fotosíntesis)" className="border rounded-lg px-3 py-2 text-sm sm:col-span-2"
          value={tema} onChange={(e) => setTema(e.target.value)} />
        <input type="number" placeholder="Minutos de clase" className="border rounded-lg px-3 py-2 text-sm"
          value={tiempo} onChange={(e) => setTiempo(parseInt(e.target.value))} />
        <select className="border rounded-lg px-3 py-2 text-sm" value={dificultad} onChange={(e) => setDificultad(e.target.value as any)}>
          <option value="basico">Básico</option>
          <option value="intermedio">Intermedio</option>
          <option value="avanzado">Avanzado</option>
        </select>
        <button onClick={generar} disabled={cargando || !asignacionId || !tema}
          className="sm:col-span-2 a360-gradiente text-white text-sm font-semibold rounded-lg py-2 disabled:opacity-60">
          {cargando ? "Generando con IA..." : "Generar clase"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-green-600">{ok}</p>}

      {contenido && (
        <div className="bg-white border rounded-xl p-5 flex flex-col gap-4">
          <div className="text-sm space-y-1">
            <p><span className="font-semibold">Objetivo:</span> {contenido.objetivo}</p>
            <p><span className="font-semibold">Competencia:</span> {contenido.competencia}</p>
            <p><span className="font-semibold">Estándar:</span> {contenido.estandar}</p>
            <p><span className="font-semibold">Recursos:</span> {contenido.recursos}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {contenido.actividades.map((act, idx) => (
              <div key={idx} className="border rounded-lg p-3 flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase" style={{ color: "var(--a360-azul)" }}>{act.tipo}</p>
                <p className="text-sm font-medium">{act.titulo}</p>
                <p className="text-xs text-gray-500 flex-1">{act.instrucciones}</p>
                {imagenesPorActividad[idx] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagenesPorActividad[idx]} alt={act.titulo} className="rounded-lg border" />
                ) : (
                  <button onClick={() => generarImagenActividad(idx, act.instrucciones)} disabled={generandoImagen === idx}
                    className="text-xs border rounded-lg py-1.5 hover:bg-gray-50 disabled:opacity-60">
                    {generandoImagen === idx ? "Generando imagen..." : "Generar imagen de apoyo (IA)"}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="text-sm space-y-1">
            <p><span className="font-semibold">Evaluación:</span> {contenido.evaluacion}</p>
            <p><span className="font-semibold">Tarea:</span> {contenido.tarea}</p>
            <p><span className="font-semibold">Refuerzo:</span> {contenido.refuerzo}</p>
          </div>

          {estado === "pendiente_aprobacion" && !mostrarMejora && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">¿Estás de acuerdo con este contenido?</p>
              <div className="flex gap-2">
                <button onClick={aprobar} disabled={cargando} className="a360-gradiente text-white text-sm font-semibold rounded-lg px-4 py-2">
                  Sí, estoy de acuerdo
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
                placeholder="Ej: hazlo más corto, o cambia la actividad de análisis por un debate" />
              <button onClick={pedirMejora} disabled={cargando || !instrucciones.trim()}
                className="self-start a360-gradiente text-white text-sm font-semibold rounded-lg px-4 py-2 disabled:opacity-60">
                {cargando ? "Regenerando..." : "Regenerar con esta mejora"}
              </button>
            </div>
          )}

          {estado === "aprobado" && (
            <div className="border-t pt-4 flex gap-2">
              <button onClick={guardarEnDiaADia} className="text-sm font-semibold border rounded-lg px-4 py-2 hover:bg-gray-50">
                Guardar en Día a día
              </button>
              <button onClick={exportarPptx} className="text-sm font-semibold border rounded-lg px-4 py-2 hover:bg-gray-50">
                Exportar a PowerPoint
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
