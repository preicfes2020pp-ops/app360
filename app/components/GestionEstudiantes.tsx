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
  const [resultadoCsv, setResultadoCsv] = useState<string | null>(null);
  const [errorCsv, setErrorCsv] = useState<string | null>(null);
  const [procesandoCsv, setProcesandoCsv] = useState(false);

  function mapearGrado(nombreGrado?: string) {
    return grados.find((g) => g.nombre.toLowerCase() === (nombreGrado ?? "").trim().toLowerCase())?.id ?? null;
  }
  function mapearGrupo(nombreGrupo?: string) {
    return grupos.find((g) => g.nombre.toLowerCase() === (nombreGrupo ?? "").trim().toLowerCase())?.id ?? null;
  }

  function onCsvSeleccionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorCsv(null);
    setResultadoCsv(null);
    setProcesandoCsv(true);

    Papa.parse<FilaCsv>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (resultado) => {
        const filas = resultado.data.filter((f) => f.nombre_completo?.trim());
        if (filas.length === 0) {
          setErrorCsv('El archivo no tiene filas válidas. Encabezados esperados: nombre_completo, numero_documento, grado, grupo, jornada.');
          setProcesandoCsv(false);
          return;
        }
        const filasParaInsertar = filas.map((f) => ({
          institucion_id: institucionId,
          nombre_completo: f.nombre_completo.trim(),
          numero_documento: f.numero_documento?.trim() || null,
          grado_id: mapearGrado(f.grado),
          grupo_id: mapearGrupo(f.grupo),
          jornada: f.jornada?.trim() || null,
        }));

        const { error, count } = await supabase
          .from("estudiantes")
          .insert(filasParaInsertar, { count: "exact" });

        setProcesandoCsv(false);
        if (error) { setErrorCsv(error.message); return; }
        setResultadoCsv(`${count ?? filasParaInsertar.length} estudiantes cargados correctamente.`);
        router.refresh();
      },
      error: (err) => { setProcesandoCsv(false); setErrorCsv(err.message); },
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
          Los valores de "grado" y "grupo" deben coincidir con nombres ya creados (ej: 6°, 6A).
        </p>
        <label className="inline-block cursor-pointer text-sm font-medium border rounded-lg px-4 py-2 hover:bg-gray-50">
          {procesandoCsv ? "Procesando..." : "Seleccionar archivo .csv"}
          <input type="file" accept=".csv" className="hidden" onChange={onCsvSeleccionado} disabled={procesandoCsv} />
        </label>
        {resultadoCsv && <p className="text-sm text-green-600 mt-2">{resultadoCsv}</p>}
        {errorCsv && <p className="text-sm text-red-600 mt-2">{errorCsv}</p>}
      </div>
    </div>
  );
}
