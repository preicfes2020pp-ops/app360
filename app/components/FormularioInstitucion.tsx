"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function FormularioInstitucion() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [nit, setNit] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("instituciones").insert({
      nombre, nit, ciudad, departamento,
    });
    setGuardando(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNombre(""); setNit(""); setCiudad(""); setDepartamento("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <input required placeholder="Nombre de la institución" className="border rounded-lg px-3 py-2 text-sm"
        value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <input placeholder="NIT" className="border rounded-lg px-3 py-2 text-sm"
        value={nit} onChange={(e) => setNit(e.target.value)} />
      <input placeholder="Ciudad" className="border rounded-lg px-3 py-2 text-sm"
        value={ciudad} onChange={(e) => setCiudad(e.target.value)} />
      <input placeholder="Departamento" className="border rounded-lg px-3 py-2 text-sm"
        value={departamento} onChange={(e) => setDepartamento(e.target.value)} />
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <button type="submit" disabled={guardando}
        className="sm:col-span-2 a360-gradiente text-white font-semibold rounded-lg py-2 disabled:opacity-60">
        {guardando ? "Guardando..." : "Registrar institución"}
      </button>
    </form>
  );
}
