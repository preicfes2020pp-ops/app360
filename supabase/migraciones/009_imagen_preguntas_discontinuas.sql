-- Ya aplicada directamente en Supabase (producción) desde este chat.
-- La numeración real de la base de datos ya iba en 015 antes de que
-- empezáramos a reconstruir el código en este chat (ver PROGRESO_AULA360.md,
-- sección "HALLAZGO IMPORTANTE"), así que este archivo es solo un registro
-- local de este cambio puntual, no representa el historial completo real.

alter table preguntas add column if not exists imagen_url text;
