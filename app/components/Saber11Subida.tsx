"use client";

import { useRef, useState } from "react";

type Creado = { archivo: string; nombre: string; anio: number; puntajeGlobal: number };
type Fallido = { archivo: string; motivo: string };
type Grupo = { id: string; nombre: string; jornada: string | null; anio_lectivo: number | null };

// Next.js tipa el atributo HTML no estándar 'webkitdirectory' de forma
// distinta según la versión; se castea el input a 'any' solo para ese
// atributo puntual, en vez de para todo el elemento.

export default function Saber11Subida({ grupos }: { grupos: Grupo[] }) {
  const [arrastrando, setArrastrando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [creados, setCreados] = useState<Creado[]>([]);
  const [fallidos, setFallidos] = useState<Fallido[]>([]);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [grupoId, setGrupoId] = useState<string>("");
  const inputArchivosRef = useRef<HTMLInputElement>(null);
  const inputCarpetaRef = useRef<HTMLInputElement>(null);

  const anioActual = new Date().getFullYear();
  const [anioAgregado, setAnioAgregado] = useState(anioActual - 1);
  const [subiendoAgregado, setSubiendoAgregado] = useState(false);
  const [mensajeAgregado, setMensajeAgregado] = useState<string | null>(null);

  async function subirIndividuales(archivos: FileList | File[]) {
    const soloPdfs = Array.from(archivos).filter(
      (a) => a.type === "application/pdf" || a.name.toLowerCase().endsWith(".pdf")
    );
    if (soloPdfs.length === 0) {
      setErrorGeneral("No se encontró ningún PDF en lo que seleccionaste.");
      return;
    }

    setSubiendo(true);
    setErrorGeneral(null);
    setCreados([]);
    setFallidos([]);

    try {
      const formData = new FormData();
      soloPdfs.forEach((archivo) => formData.append("pdfs", archivo));
      if (grupoId) formData.append("grupoId", grupoId);

      const respuesta = await fetch("/api/saber11/individuales", { method: "POST", body: formData });
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
      if (inputArchivosRef.current) inputArchivosRef.current.value = "";
      if (inputCarpetaRef.current) inputCarpetaRef.current.value = "";
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
    <div className="flex flex-col gap-6 no-imprimir">
      {/* --- Subida de resultados individuales --- */}
      <div className="bg-white border rounded-xl p-6">
        <h2 className="font-bold mb-1" style={{ color: "var(--a360-azul-oscuro)" }}>
          Subir resultados individuales
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Arrastra aquí los PDF de "Reporte de resultados" de cada estudiante, selecciona varios
          archivos, o sube una carpeta completa de una vez. AULA360 los lee automáticamente y
          calcula el análisis institucional.
        </p>

        <div className="mb-4">
          <label className="block text-sm text-gray-500 mb-1">
            Grupo al que pertenecen estos resultados (opcional)
          </label>
          <select
            value={grupoId}
            onChange={(e) => setGrupoId(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full max-w-sm"
          >
            <option value="">Sin asignar a un grupo</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
                {g.jornada ? ` — ${g.jornada}` : ""}
                {g.anio_lectivo ? ` (${g.anio_lectivo})` : ""}
              </option>
            ))}
          </select>
          {grupos.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Todavía no tienes grupos de grado once registrados. Puedes subir los resultados igual,
              sin asignarlos a un grupo, y vincularlos más adelante.
            </p>
          )}
        </div>

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
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
            arrastrando ? "border-blue-400 bg-blue-50" : "border-gray-300"
          }`}
        >
          <p className="text-gray-500 mb-4">
            {subiendo
              ? "Procesando PDFs, esto puede tardar un momento..."
              : "Arrastra los PDF aquí, o elige una opción abajo"}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              disabled={subiendo}
              onClick={() => inputArchivosRef.current?.click()}
              className="rounded-lg px-4 py-2 text-sm font-medium border disabled:opacity-50"
              style={{ borderColor: "var(--a360-azul-oscuro)", color: "var(--a360-azul-oscuro)" }}
            >
              Elegir archivos PDF
            </button>
            <button
              type="button"
              disabled={subiendo}
              onClick={() => inputCarpetaRef.current?.click()}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--a360-azul-oscuro)" }}
            >
              Elegir una carpeta completa
            </button>
          </div>

          <input
            ref={inputArchivosRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && subirIndividuales(e.target.files)}
          />
          <input
            ref={inputCarpetaRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && subirIndividuales(e.target.files)}
            {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
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
          súbelo aquí en PDF o en Excel (el ICFES entrega los reportes agregados en ambos formatos)
          para tenerlo archivado junto al análisis que ya calculó AULA360. Puedes subir hasta los
          últimos 10 años.
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
            <label className="block text-sm text-gray-500 mb-1">Archivo (PDF o Excel)</label>
            <input
              name="pdfAgregado"
              type="file"
              accept="application/pdf,.pdf,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              required
              className="text-sm"
            />
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
