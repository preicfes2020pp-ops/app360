"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import HorarioEmergenteClases from "./HorarioEmergenteClases";

type Grupo = { id: string; label: string };
type Franja = { id: string; nombre: string; hora_inicio: string; hora_fin: string };
type Emergente = { id: string; motivo: string; fecha_inicio: string; duracion_dias: number };

export default function FormularioHorarioEmergente({
  institucionId, grupos, franjas, emergentes,
}: { institucionId: string; grupos: Grupo[]; franjas: Franja[]; emergentes: Emergente[] }) {
  const supabase = createClient();
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [duracionDias, setDuracionDias] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);

  async function crear() {
    setError(null);
    if (!motivo.trim() || !fechaInicio) { setError("Indica el motivo y la fecha de inicio."); return; }
    setCargando(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error: err } = await supabase.from("horarios_emergentes").insert({
      institucion_id: institucionId, creado_por: user?.id, motivo, fecha_inicio: fechaInicio, duracion_dias: duracionDias,
    }).select("id").single();
    setCargando(false);
    if (err || !data) { setError(err?.message ?? "No se pudo crear."); return; }
    setMotivo(""); setFechaInicio(""); setDuracionDias(1);
    setExpandido(data.id);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input placeholder="Motivo (ej: Jornada pedagógica)" className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        <input type="date" className="border rounded-lg px-3 py-2 text-sm" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
        <input type="number" min={1} placeholder="Días de duración" className="border rounded-lg px-3 py-2 text-sm" value={duracionDias} onChange={(e) => setDuracionDias(parseInt(e.target.value) || 1)} />
        <button onClick={crear} disabled={cargando} className="sm:col-span-4 a360-gradiente text-white text-sm font-semibold rounded-lg py-2 disabled:opacity-60">
          {cargando ? "Creando..." : "Crear horario emergente"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-3">
        {emergentes.map((e) => (
          <div key={e.id} className="bg-white border rounded-xl p-4">
            <button onClick={() => setExpandido(expandido === e.id ? null : e.id)} className="w-full text-left flex justify-between items-center">
              <div>
                <p className="font-medium text-sm">{e.motivo}</p>
                <p className="text-xs text-gray-400">Desde {e.fecha_inicio} · {e.duracion_dias} día(s)</p>
              </div>
              <span className="text-sm" style={{ color: "var(--a360-azul)" }}>{expandido === e.id ? "Ocultar" : "Armar horario"}</span>
            </button>
            {expandido === e.id && (
              <div className="mt-4 border-t pt-4">
                <HorarioEmergenteClases horarioEmergenteId={e.id} grupos={grupos} franjas={franjas} />
              </div>
            )}
          </div>
        ))}
        {emergentes.length === 0 && <p className="text-sm text-gray-400">Aún no has creado ningún horario emergente.</p>}
      </div>
    </div>
  );
}
