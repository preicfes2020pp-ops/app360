// Genera un codigo de invitacion corto, facil de leer y compartir por
// WhatsApp. Evita caracteres ambiguos (0/O, 1/I/L) para que nadie lo
// transcriba mal a mano.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generarCodigoInvitacion(longitud = 8): string {
  let codigo = "";
  for (let i = 0; i < longitud; i++) {
    codigo += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return codigo;
}
