// Genera el código único de grado/grupo (sección 11): ej. A360-6A-2026
export function generarCodigoGrupo(nombreGrupo: string, anioLectivo: number) {
  const limpio = nombreGrupo.trim().toUpperCase().replace(/\s+/g, "");
  return `A360-${limpio}-${anioLectivo}`;
}

// Genera un código público de identificación del docente (sección 8).
// No es contraseña ni documento: solo un identificador visible dentro del sistema.
export function generarCodigoDocente() {
  const sufijo = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `DOC-${sufijo}`;
}
