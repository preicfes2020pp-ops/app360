"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function FormularioGrado({ institucionId }: { institucionId: string }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    const supabase = createClient();
    const { error: err } = await supabase.from("grados").insert({ institucion_id: institucionId, nombre });
    setGuardando(false);
    if (err) { setError(err.message); return; }
    setNombre("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input required placeholder="Ej: 6°" className="border rounded-lg px-3 py-2 text-sm flex-1"
        value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <button disabled={guardando} className="a360-gradiente text-white text-sm font-semibold rounded-lg px-4">
        {guardando ? "..." : "Agregar grado"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
