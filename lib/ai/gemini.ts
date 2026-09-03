// Adaptador de Google Gemini (imagen) para el "AULA360 AI Engine".
// Se usa para generar imágenes de apoyo para actividades (diagramas,
// infografías) — sección 22, textos discontinuos/mixtos.
// SOLO se importa desde código de servidor: usa GEMINI_API_KEY.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODELO_IMAGEN = "gemini-2.5-flash-image";

export async function generarImagen(descripcion: string): Promise<Buffer> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY no está configurada. Agrégala a tus variables de entorno para generar imágenes de apoyo."
    );
  }

  const respuesta = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_IMAGEN}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Genera una imagen educativa, clara y apropiada para un aula de clase colombiana, sin texto en español incrustado con errores: ${descripcion}`,
          }],
        }],
      }),
    }
  );

  if (!respuesta.ok) {
    const detalle = await respuesta.text();
    throw new Error(`Error del proveedor de IA (Gemini): ${respuesta.status} ${detalle}`);
  }

  const data = await respuesta.json();
  const parteImagen = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  if (!parteImagen) throw new Error("Gemini no devolvió ninguna imagen.");

  return Buffer.from(parteImagen.inlineData.data, "base64");
}
