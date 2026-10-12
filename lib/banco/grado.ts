// Convierte el nombre de un grado ("Sexto", "6°", "Undécimo", "11-A") en el número
// (0 a 11) que usa el banco de preguntas. Si no lo reconoce, devuelve null y el
// examen se genera con IA, como antes.
const PALABRAS: [string, number][] = [
  ["transicion", 0], ["preescolar", 0], ["jardin", 0],
  ["primero", 1], ["segundo", 2], ["tercero", 3], ["cuarto", 4], ["quinto", 5],
  ["sexto", 6], ["septimo", 7], ["octavo", 8], ["noveno", 9],
  ["decimo", 10], ["undecimo", 11], ["once", 11],
];

export function numeroDeGrado(nombre: string): number | null {
  const limpio = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  for (const [palabra, numero] of PALABRAS) {
    if (new RegExp(`\\b${palabra}\\b`).test(limpio)) return numero;
  }
  const digitos = limpio.match(/\b(\d{1,2})\b/);
  if (digitos) {
    const n = Number(digitos[1]);
    if (n >= 0 && n <= 11) return n;
  }
  return null;
}
