"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type FormatoActual = { id: string; archivo_nombre: string; activo: boolean } | null;

export default function FormularioFormatoDiaADia({
  institucionId, docenteId, formatoActual,
}: { institucionId: string; docenteId: string; formatoActual: FormatoActual }) {
  const router = useRouter();
  const supabase = createClient();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function subir() {
    if (!archivo) { setError("Elige primero un archivo."); return; }
    setError(null); setGuardando(true);

    const ruta = `${docenteId}/formatos-dia-a-dia/${Date.now()}-${archivo.name}`;
    const { error: uploadError } = await supabase.storage.from("documentos").upload(ruta, archivo);
    if (uploadError) { setError("No pudimos subir el archivo: " + uploadError.message); setGuardando(false); return; }

    if (formatoActual) {
      await supabase.from("formatos_dia_a_dia").update({ activo: false }).eq("id", formatoActual.id);
    }
    const { error: insertError } = await supabase.from("formatos_dia_a_dia").insert({
      institucion_id: institucionId, docente_id: docenteId,
      archivo_url: ruta, archivo_nombre: archivo.name, activo: true,
    });

    setGuardando(false);
    if (insertError) { setError(insertError.message); return; }
    setArchivo(null);
    router.refresh();
  }

  return (
    <div className="bg-white border rounded-xl p-5 flex flex-col gap-3">
      <p className="text-sm font-semibold" style={{ color: "var(--a360-azul-oscuro)" }}>Formato de día a día</p>
      <p className="text-xs text-gray-500">
        Sube la plantilla (Word, PDF o imagen) que usa tu institución para el formato del día a día,
        para tenerla de referencia. Subir un archivo nuevo reemplaza al anterior como el activo.
      </p>

      {formatoActual && (
        <p className="text-sm">
          Formato actual: <span className="font-medium">{formatoActual.archivo_nombre}</span>
        </p>
      )}

      <input type="file" accept=".pdf,.doc,.docx,image/*" className="text-sm"
        onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button onClick={subir} disabled={guardando || !archivo}
        className="self-start a360-gradiente text-white text-sm font-semibold rounded-lg px-4 py-2 disabled:opacity-60">
        {guardando ? "Subiendo..." : "Subir formato"}
      </button>
    </div>
  );
}
