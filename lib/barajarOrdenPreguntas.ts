// Baraja el ORDEN de las preguntas para las versiones B/C de un examen
// (anti-copia entre estudiantes de un mismo salón). La tabla real
// `examen_preguntas` solo guarda el orden de cada pregunta dentro del
// examen (columna "orden") — no hay una columna para barajar también las
// opciones A-D, así que esta fase de anti-copia se limita al orden de
// las preguntas, no al orden interno de las opciones.

function mulberry32(semilla: number) {
  let a = semilla;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function semillaDeTexto(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (Math.imul(31, h) + texto.charCodeAt(i)) | 0;
  return h;
}

export function barajarOrdenPreguntas<T>(preguntaIds: T[], examenBaseId: string, letra: "B" | "C"): T[] {
  const azar = mulberry32(semillaDeTexto(`${examenBaseId}-${letra}`));
  const copia = [...preguntaIds];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}
