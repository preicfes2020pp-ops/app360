"use client";

import { useRef, useState } from "react";

type Creado = { archivo: string; nombre: string; anio: number; puntajeGlobal: number };
type Fallido = { archivo: string; motivo: string };

export default function Saber11Subida() {
  const [arrastrando, setArrastrando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [creados, setCreados] = useState<Creado[]>([]);
  const [fallidos, setFallidos] = useState<Fallido[]>([]);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const anioActual = new Date().getFullYear();
  const [anioAgregado, setAnioAgregado] = useState(anioActual - 1);
  const [subiendoAgregado, setSubiendoAgregado] = useState(false);
  const [mensajeAgregado, setMensajeAgregado] = useState<string | null>(null);

  async function subirIndividuales(archivos: FileList | File[]) {
    const lista = Array.from(archivos);
    if (lista.length === 0) return;

    setSubiendo(true);
    setErrorGeneral(null);
    setCreados([]);
    setFallidos([]);

    try {
      const formData = new FormData();
      lista.forEach((archivo) => formData.append("pdfs", archivo));

      const respuesta = await fetch("/api/saber11/individuales", {
        method: "POST",
        body: formData,
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setErrorGeneral(datos.error ?? "Ocurrió un error al subir los archivos.");
        return;
      }

      setCreados(datos.creados ?? []);
      setFallidos(datos.fallidos ?? []);
    } catch {
      setErrorGeneral("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setSubiendo(false);
    }
  }

  async function subirAgregado(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const archivo = (form.elements.namedItem("pdfAgregado") as HTMLInputElement).files?.[0];
    if (!archivo) return;

    setSubiendoAgregado(true);
    setMensajeAgregado(null);

    try {
      const formData = new FormData();
      formData.append("pdf", archivo);
      formData.append("anio", String(anioAgregado));

      const respuesta = await fetch("/api/saber11/agregados", { method: "POST", body: formData });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setMensajeAgregado(`Error: ${datos.error ?? "no se pudo subir el archivo."}`);
        return;
      }
      setMensajeAgregado(`Reporte agregado de ${datos.anio} guardado correctamente.`);
      form.reset();
    } catch {
      setMensajeAgregado("No se pudo conectar con el servidor.");
    } finally {
      setSubiendoAgregado(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* --- Subida de resultados individuales --- */}
      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-bold mb-1" style={{ color: "var(--a360-azul-oscuro)" }}>
          Subir resultados individuales
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Arrastra aquí los PDF de "Reporte de resultados" de cada estudiante (puedes seleccionar
          varios a la vez). AULA360 los lee automáticamente y calcula el análisis institucional.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastrando(false);
            if (e.dataTransfer.files.length > 0) subirIndividuales(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            arrastrando ? "border-blue-400 bg-blue-50" : "border-gray-300"
          }`}
        >
          <p className="text-gray-500">
            {subiendo
              ? "Procesando PDFs, esto puede tardar un momento..."
              : "Arrastra los PDF aquí, o haz clic para elegirlos"}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && subirIndividuales(e.target.files)}
          />
        </div>

        {errorGeneral && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg p-3">{errorGeneral}</p>
        )}

        {(creados.length > 0 || fallidos.length > 0) && (
          <div className="mt-4 flex flex-col gap-3">
            {creados.length > 0 && (
              <div className="text-sm bg-green-50 text-green-800 rounded-lg p-3">
                <p className="font-medium mb-1">{creados.length} resultado(s) guardado(s):</p>
                <ul className="list-disc list-inside">
                  {creados.map((c) => (
                    <li key={c.archivo}>
                      {c.nombre} — {c.anio} — puntaje global {c.puntajeGlobal}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {fallidos.length > 0 && (
              <div className="text-sm bg-amber-50 text-amber-800 rounded-lg p-3">
                <p className="font-medium mb-1">
                  {fallidos.length} archivo(s) no se pudieron procesar (revisa e intenta subirlos de nuevo):
                </p>
                <ul className="list-disc list-inside">
                  {fallidos.map((f) => (
                    <li key={f.archivo}>
                      {f.archivo}: {f.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- Subida del reporte agregado oficial --- */}
      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-bold mb-1" style={{ color: "var(--a360-azul-oscuro)" }}>
          Archivar reporte agregado del ICFES
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Cuando el ICFES publique el reporte oficial de la institución (usualmente un año después),
          súbelo aquí para tenerlo archivado junto al análisis que ya calculó AULA360. Puedes subir
          hasta los últimos 10 años.
        </p>
        <form onSubmit={subirAgregado} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Año</label>
            <select
              value={anioAgregado}
              onChange={(e) => setAnioAgregado(parseInt(e.target.value, 10))}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              {Array.from({ length: 10 }, (_, i) => anioActual - i).map((anio) => (
                <option key={anio} value={anio}>
                  {anio}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Archivo PDF</label>
            <input name="pdfAgregado" type="file" accept="application/pdf" required className="text-sm" />
          </div>
          <button
            type="submit"
            disabled={subiendoAgregado}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--a360-azul-oscuro)" }}
          >
            {subiendoAgregado ? "Subiendo..." : "Guardar reporte"}
          </button>
        </form>
        {mensajeAgregado && <p className="mt-3 text-sm text-gray-600">{mensajeAgregado}</p>}
      </div>
    </div>
  );
}
