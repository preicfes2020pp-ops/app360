// Roles válidos dentro de AULA360. Fuente de verdad única — nunca hardcodear
// strings de rol sueltos en componentes; importar siempre de aquí.
export type RolAula360 = 'docente' | 'rector' | 'superadmin'

export const RUTA_POR_ROL: Record<RolAula360, string> = {
  docente: '/dashboard',
  rector: '/rector',
  superadmin: '/superadmin',
}
