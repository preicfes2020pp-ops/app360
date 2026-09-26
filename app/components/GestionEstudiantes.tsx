"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase";

type Grado = { id: string; nombre: string };
type Grupo = { id: string; nombre: string; grado_id: string };

type FilaCsv = {
  nombre_completo: string;
  numero_documento?: string;
  grado?: string;
  grupo?: string;
  jornada?: string;
};

export default function GestionEstudiantes({
  institucionId, grados, grupos,
}: { institucionId: string; grados: Grado[]; grupos: Grupo[] }) {
  const router = useRouter();
  const supabase = createClient();

  // --- Alta manual ---
  const [nombre, setNombre] = useState("");
  const [documento, setDocumento] = useState("");
  const [gradoId, setGradoId] = useState("");
  const [grupoId, setGrupoId] = useState("");
  const [errorManual, setErrorManual] = useState<string | null>(null);
  const [guardandoManual, setGuardandoManual] = useState(false);

  async function altaManual(e: React.FormEvent) {
    e.preventDefault();
    setErrorManual(null);
    setGuardandoManual(true);
    const { error } = await supabase.from("estudiantes").insert({
      institucion_id: institucionId, nombre_completo: nombre,
      numero_documento: documento || null, grado_id: gradoId || null, grupo_id: grupoId || null,
    });
    setGuardandoManual(false);
    if (error) { setErrorManual(error.message); return; }
    setNombre(""); setDocumento("");
    router.refresh();
  }

  // --- Carga masiva CSV ---
  const [creadosCsv, setCreadosCsv] = useState<string[]>([]);
  const [fallidosCsv, setFallidosCsv] = useState<{ fila: string; motivo: string }[]>([]);
  const [errorCsv, setErrorCsv] = useState<string | null>(null);
  const [procesandoCsv, setProcesandoCsv] = useState<{ actual: number; total: number } | null>(null);

  function mapearGrado(nombreGrado?: string) {
    if (!nombreGrado?.trim()) return { id: null, provisto: false };
    const encontrado = grados.find((g) => g.nombre.toLowerCase() === nombreGrado.trim().toLowerCase());
    return { id: encontrado?.id ?? undefined, provisto: true };
  }
  function mapearGrupo(nombreGrupo?: string) {
    if (!nombreGrupo?.trim()) return { id: null, provisto: false };
    const encontrado = grupos.find((g) => g.nombre.toLowerCase() === nombreGrupo.trim().toLowerCase());
    return { id: encontrado?.id ?? undefined, provisto: true };
  }

  function onCsvSeleccionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorCsv(null);
    setCreadosCsv([]);
    setFallidosCsv([]);

    Papa.parse<FilaCsv>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (resultado) => {
        const filas = resultado.data.filter((f) => f.nombre_completo?.trim());
        if (filas.length === 0) {
          setErrorCsv('El archivo no tiene filas válidas. Encabezados esperados: nombre_completo, numero_documento, grado, grupo, jornada.');
          return;
        }
        if (filas.length > 500) {
          setErrorCsv('Solo se pueden subir hasta 500 estudiantes por archivo. Divide tu planilla en partes más pequeñas.');
          return;
        }

        const creados: string[] = [];
        const fallidos: { fila: string; motivo: string }[] = [];

        for (let i = 0; i < filas.length; i++) {
          setProcesandoCsv({ actual: i + 1, total: filas.length });
          const f = filas[i];
          const etiquetaFila = `Fila ${i + 2}: ${f.nombre_completo}`; // +2 = encabezado + índice base 1

          const grado = mapearGrado(f.grado);
          const grupo = mapearGrupo(f.grupo);

          if (grado.provisto && grado.id === undefined) {
            fallidos.push({ fila: etiquetaFila, motivo: `El grado "${f.grado}" no coincide con ningún grado ya creado.` });
            continue;
          }
          if (grupo.provisto && grupo.id === undefined) {
            fallidos.push({ fila: etiquetaFila, motivo: `El grupo "${f.grupo}" no coincide con ningún grupo ya creado.` });
            continue;
          }

          const { error } = await supabase.from("estudiantes").insert({
            institucion_id: institucionId,
            nombre_completo: f.nombre_completo.trim(),
            numero_documento: f.numero_documento?.trim() || null,
            grado_id: grado.id ?? null,
            grupo_id: grupo.id ?? null,
            jornada: f.jornada?.trim() || null,
          });

          if (error) {
            fallidos.push({ fila: etiquetaFila, motivo: error.message });
          } else {
            creados.push(f.nombre_completo.trim());
          }
        }

        setProcesandoCsv(null);
        setCreadosCsv(creados);
        setFallidosCsv(fallidos);
        if (creados.length > 0) router.refresh();
      },
      error: (err) => { setProcesandoCsv(null); setErrorCsv(err.message); },
    });
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={altaManual} className="bg-white border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input required placeholder="Nombre completo" className="border rounded-lg px-3 py-2 text-sm sm:col-span-2"
          value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <input placeholder="Documento" className="border rounded-lg px-3 py-2 text-sm"
          value={documento} onChange={(e) => setDocumento(e.target.value)} />
        <select className="border rounded-lg px-3 py-2 text-sm" value={gradoId} onChange={(e) => setGradoId(e.target.value)}>
          <option value="">Grado (opcional)</option>
          {grados.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
          <option value="">Grupo (opcional)</option>
          {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
        </select>
        {errorManual && <p className="text-sm text-red-600 sm:col-span-4">{errorManual}</p>}
        <button disabled={guardandoManual} className="sm:col-span-2 a360-gradiente text-white text-sm font-semibold rounded-lg py-2 disabled:opacity-60">
          {guardandoManual ? "Guardando..." : "Agregar estudiante"}
        </button>
      </form>

      <div className="bg-white border rounded-xl p-5">
        <p className="text-sm font-semibold mb-1">Carga masiva por CSV</p>
        <p className="text-xs text-gray-500 mb-3">
          Encabezados requeridos: <code>nombre_completo, numero_documento, grado, grupo, jornada</code>.
          Los valores de "grado" y "grupo" deben coincidir con nombres ya creados (ej: 6°, 11A). Hasta 500 estudiantes por archivo.
        </p>
        <label className="inline-block cursor-pointer text-sm font-medium border rounded-lg px-4 py-2 hover:bg-gray-50">
          {procesandoCsv ? `Procesando ${procesandoCsv.actual} de ${procesandoCsv.total}...` : "Seleccionar archivo .csv"}
          <input type="file" accept=".csv" className="hidden" onChange={onCsvSeleccionado} disabled={!!procesandoCsv} />
        </label>

        {errorCsv && <p className="text-sm text-red-600 mt-2">{errorCsv}</p>}

        {(creadosCsv.length > 0 || fallidosCsv.length > 0) && (
          <div className="mt-3 flex flex-col gap-2">
            {creadosCsv.length > 0 && (
              <p className="text-sm bg-green-50 text-green-800 rounded-lg p-3">
                {creadosCsv.length} estudiante(s) cargado(s) correctamente.
              </p>
            )}
            {fallidosCsv.length > 0 && (
              <div className="text-sm bg-amber-50 text-amber-800 rounded-lg p-3">
                <p className="font-medium mb-1">
                  {fallidosCsv.length} fila(s) no se pudieron cargar (revisa y vuelve a subir solo esas filas):
                </p>
                <ul className="list-disc list-inside">
                  {fallidosCsv.map((f, i) => (
                    <li key={i}>{f.fila}: {f.motivo}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
