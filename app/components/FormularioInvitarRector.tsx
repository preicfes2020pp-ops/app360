"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FormularioInvitarRector({
  instituciones,
}: {
  instituciones: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [institucionId, setInstitucionId] = useState("");
  const [nombreCompleto, setNombreCompleto] = useState("");
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    setEnviando(true);
    const res = await fetch("/api/superadmin/invitar-rector", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ institucionId, nombreCompleto, correo }),
    });
    const data = await res.json();
    setEnviando(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo enviar la invitacion.");
      return;
    }
    setMensaje(`Invitacion enviada a ${correo} para ${data.institucion}.`);
    setNombreCompleto("");
    setCorreo("");
    setInstitucionId("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <select required className="border rounded-lg px-3 py-2 text-sm sm:col-span-2"
        value={institucionId} onChange={(e) => setInstitucionId(e.target.value)}>
        <option value="">Selecciona la institucion...</option>
        {instituciones.map((inst) => (
          <option key={inst.id} value={inst.id}>{inst.nombre}</option>
        ))}
      </select>
      <input required placeholder="Nombre completo del rector" className="border rounded-lg px-3 py-2 text-sm"
        value={nombreCompleto} onChange={(e) => setNombreCompleto(e.target.value)} />
      <input required type="email" placeholder="Correo del rector" className="border rounded-lg px-3 py-2 text-sm"
        value={correo} onChange={(e) => setCorreo(e.target.value)} />
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      {mensaje && <p className="text-sm text-green-600 sm:col-span-2">{mensaje}</p>}
      <button type="submit" disabled={enviando}
        className="sm:col-span-2 a360-gradiente text-white font-semibold rounded-lg py-2 disabled:opacity-60">
        {enviando ? "Enviando invitacion..." : "Invitar rector"}
      </button>
    </form>
  );
}
