"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { generarCodigoGrupo } from "@/lib/codigoGrupo";

type Grado = { id: string; nombre: string };

export default function FormularioGrupo({ institucionId, grados }: { institucionId: string; grados: Grado[] }) {
  const router = useRouter();
  const [gradoId, setGradoId] = useState("");
  const [nombre, setNombre] = useState("");
  const [jornada, setJornada] = useState("Única");
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ultimoCodigo, setUltimoCodigo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const supabase = createClient();
    const codigo = generarCodigoGrupo(nombre, anio);
    const { error: err } = await supabase.from("grupos").insert({
      institucion_id: institucionId, grado_id: gradoId, nombre, jornada, anio_lectivo: anio, codigo_grupo: codigo,
    });
    setGuardando(false);
    if (err) {
      setError(err.message.includes("duplicate") ? "Ya existe un grupo con ese código para ese año." : err.message);
      return;
    }
    setUltimoCodigo(codigo);
    setNombre("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-3">
      <select required className="border rounded-lg px-3 py-2 text-sm" value={gradoId} onChange={(e) => setGradoId(e.target.value)}>
        <option value="">Grado</option>
        {grados.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
      </select>
      <input required placeholder="Grupo (ej: 6A)" className="border rounded-lg px-3 py-2 text-sm"
        value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <input placeholder="Jornada" className="border rounded-lg px-3 py-2 text-sm"
        value={jornada} onChange={(e) => setJornada(e.target.value)} />
      <input required type="number" placeholder="Año lectivo" className="border rounded-lg px-3 py-2 text-sm"
        value={anio} onChange={(e) => setAnio(parseInt(e.target.value))} />
      {error && <p className="text-sm text-red-600 sm:col-span-4">{error}</p>}
      {ultimoCodigo && <p className="text-sm text-green-600 sm:col-span-4">Grupo creado con código: {ultimoCodigo}</p>}
      <button disabled={guardando || grados.length === 0}
        className="sm:col-span-4 a360-gradiente text-white text-sm font-semibold rounded-lg py-2 disabled:opacity-60">
        {guardando ? "Guardando..." : "Crear grupo"}
      </button>
      {grados.length === 0 && <p className="text-xs text-amber-600 sm:col-span-4">Primero crea al menos un grado.</p>}
    </form>
  );
}
