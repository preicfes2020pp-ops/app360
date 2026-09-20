import { generarImagen } from "@/lib/ai/gemini";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

// Genera una imagen (tabla/gráfico/diagrama) para una pregunta "discontinua"
// a partir de su contexto en texto, la sube al bucket privado "documentos"
// (mismo bucket que el Plan de Área, sección 14) en la carpeta del propio
// docente, y devuelve la ruta guardable + una URL firmada para mostrarla
// de inmediato en la vista previa del docente.
export async function generarImagenPregunta(
  supabase: SupabaseClient,
  docenteId: string,
  contexto: string
): Promise<{ ruta: string; urlFirmada: string } | null> {
  try {
    const buffer = await generarImagen(
      `Una tabla o gráfico de datos educativo, claro y sencillo, en blanco y negro apto para imprimir en un examen, que ilustre exactamente esta información: ${contexto}`
    );
    const ruta = `${docenteId}/preguntas-imagenes/${randomUUID()}.png`;
    const { error: errorSubida } = await supabase.storage.from("documentos").upload(ruta, buffer, { contentType: "image/png" });
    if (errorSubida) return null;

    const { data: firmada } = await supabase.storage.from("documentos").createSignedUrl(ruta, 60 * 60 * 24 * 365);
    if (!firmada) return null;

    return { ruta, urlFirmada: firmada.signedUrl };
  } catch (e) {
    // Si la generación de imagen falla (cuota, error del proveedor, etc.),
    // la pregunta se guarda igual, solo sin imagen — nunca se bloquea todo
    // el examen por esto. Queda en el log del servidor para poder revisarlo.
    console.error("No se pudo generar la imagen de la pregunta:", e);
    return null;
  }
}
