"use client";

import { useRef, useState } from "react";

type Estudiante = { id: string; nombre_completo: string; numero_documento: string | null };
type HojaExistente = {
  estudiante_id: string;
  correctas: number | null;
  incorrectas: number | null;
  sin_marcar: number | null;
  puntaje_porcentaje: number | null;
  estado: "pendiente" | "calificada" | "error";
  error_detalle: string | null;
};

type EstadoFila =
  | { tipo: "sin_subir" }
  | { tipo: "subiendo" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "calificada"; correctas: number; incorrectas: number; sinMarcar: number; puntajePorcentaje: number };

export default function CalificarExamen({
  examenId,
  estudiantes,
  hojasIniciales,
}: {
  examenId: string;
  estudiantes: Estudiante[];
  hojasIniciales: HojaExistente[];
}) {
  const inicial = new Map<string, EstadoFila>();
  for (const h of hojasIniciales) {
    if (h.estado === "calificada") {
      inicial.set(h.estudiante_id, {
        tipo: "calificada",
        correctas: h.correctas ?? 0,
        incorrectas: h.incorrectas ?? 0,
        sinMarcar: h.sin_marcar ?? 0,
        puntajePorcentaje: h.puntaje_porcentaje ?? 0,
      });
    } else if (h.estado === "error") {
      inicial.set(h.estudiante_id, { tipo: "error", mensaje: h.error_detalle ?? "Error desconocido." });
    }
  }

  const [estados, setEstados] = useState<Map<string, EstadoFila>>(inicial);
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  async function subir(estudianteId: string, archivo: File) {
    setEstados((prev) => new Map(prev).set(estudianteId, { tipo: "subiendo" }));

    try {
      const formData = new FormData();
      formData.append("examenId", examenId);
      formData.append("estudianteId", estudianteId);
      formData.append("archivo", archivo);

      const respuesta = await fetch("/api/examenes/calificar", { method: "POST", body: formData });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setEstados((prev) =>
          new Map(prev).set(estudianteId, { tipo: "error", mensaje: datos.error ?? "No se pudo calificar." })
        );
        return;
      }

      setEstados((prev) =>
        new Map(prev).set(estudianteId, {
          tipo: "calificada",
          correctas: datos.correctas,
          incorrectas: datos.incorrectas,
          sinMarcar: datos.sinMarcar,
          puntajePorcentaje: datos.puntajePorcentaje,
        })
      );
    } catch {
      setEstados((prev) =>
        new Map(prev).set(estudianteId, { tipo: "error", mensaje: "No se pudo conectar con el servidor." })
      );
    } finally {
      const input = inputsRef.current[estudianteId];
      if (input) input.value = "";
    }
  }

  if (estudiantes.length === 0) {
    return (
      <div className="bg-white border rounded-xl p-6 text-sm text-gray-500">
        Este grupo todavía no tiene estudiantes cargados. Ve a "Estudiantes" para subirlos primero.
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            <th className="p-3">Estudiante</th>
            <th className="p-3">Documento</th>
            <th className="p-3">Resultado</th>
            <th className="p-3">Hoja de respuestas</th>
          </tr>
        </thead>
        <tbody>
          {estudiantes.map((est) => {
            const estado = estados.get(est.id) ?? { tipo: "sin_subir" as const };
            return (
              <tr key={est.id} className="border-t align-top">
                <td className="p-3">{est.nombre_completo}</td>
                <td className="p-3">{est.numero_documento ?? "—"}</td>
                <td className="p-3">
                  {estado.tipo === "sin_subir" && <span className="text-gray-400">Sin calificar</span>}
                  {estado.tipo === "subiendo" && (
                    <span className="text-blue-600">Leyendo la hoja, un momento...</span>
                  )}
                  {estado.tipo === "error" && <span className="text-red-600">{estado.mensaje}</span>}
                  {estado.tipo === "calificada" && (
                    <div>
                      <p className="font-semibold" style={{ color: "var(--a360-azul-oscuro)" }}>
                        {estado.puntajePorcentaje}% — {estado.correctas} correctas
                      </p>
                      <p className="text-xs text-gray-500">
                        {estado.incorrectas} incorrectas · {estado.sinMarcar} sin marcar
                      </p>
                    </div>
                  )}
                </td>
                <td className="p-3">
                  <label
                    className={`inline-block cursor-pointer text-xs font-medium border rounded-lg px-3 py-1.5 hover:bg-gray-50 ${
                      estado.tipo === "subiendo" ? "opacity-50 pointer-events-none" : ""
                    }`}
                  >
                    {estado.tipo === "calificada" || estado.tipo === "error" ? "Volver a subir" : "Subir foto o PDF"}
                    <input
                      ref={(el) => {
                        inputsRef.current[est.id] = el;
                      }}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const archivo = e.target.files?.[0];
                        if (archivo) subir(est.id, archivo);
                      }}
                    />
                  </label>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
