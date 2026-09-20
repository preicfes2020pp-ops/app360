"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Franja = { id: string; nombre: string; hora_inicio: string; hora_fin: string; orden: number };

export default function FranjasHorarias({ institucionId, franjas }: { institucionId: string; franjas: Franja[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function agregar() {
    setError(null);
    if (!nombre.trim() || !horaInicio || !horaFin) { setError("Completa nombre, hora de inicio y hora de fin."); return; }
    setCargando(true);
    const orden = franjas.length > 0 ? Math.max(...franjas.map((f) => f.orden)) + 1 : 1;
    const { error: err } = await supabase.from("franjas_horarias").insert({
      institucion_id: institucionId, nombre, hora_inicio: horaInicio, hora_fin: horaFin, orden,
    });
    setCargando(false);
    if (err) { setError(err.message); return; }
    setNombre(""); setHoraInicio(""); setHoraFin("");
    router.refresh();
  }

  async function eliminar(id: string) {
    await supabase.from("franjas_horarias").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="bg-white border rounded-xl p-5 flex flex-col gap-3">
      <p className="text-sm font-semibold" style={{ color: "var(--a360-azul-oscuro)" }}>Franjas horarias</p>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input placeholder="Nombre (ej: Bloque 1)" className="border rounded-lg px-3 py-2 text-sm" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <input type="time" className="border rounded-lg px-3 py-2 text-sm" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
        <input type="time" className="border rounded-lg px-3 py-2 text-sm" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} />
        <button onClick={agregar} disabled={cargando} className="a360-gradiente text-white text-sm font-semibold rounded-lg px-4 py-2 disabled:opacity-60">
          {cargando ? "Agregando..." : "Agregar franja"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {franjas.map((f) => (
          <span key={f.id} className="text-xs border rounded-full px-3 py-1 flex items-center gap-2">
            {f.nombre} ({f.hora_inicio.slice(0, 5)}-{f.hora_fin.slice(0, 5)})
            <button onClick={() => eliminar(f.id)} className="text-red-500 font-bold">×</button>
          </span>
        ))}
        {franjas.length === 0 && <p className="text-xs text-gray-400">Sin franjas creadas todavía.</p>}
      </div>
    </div>
  );
}
