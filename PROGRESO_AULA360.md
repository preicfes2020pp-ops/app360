# Progreso — AULA360

> Este archivo se actualiza al final de cada fase. Si el chat se corta,
> vuelve a subir este archivo (o el proyecto completo) en una nueva
> conversación y dile a Claude: "continúa desde este PROGRESO.md".

## Decisiones del proyecto
- Proyecto Supabase **separado** del de LlévameQ (dominios distintos).
- Regla de oro heredada de LlévameQ: **nunca inventar datos ni botones
  falsos; nunca destruir trabajo existente; construir por fases.**
- La IA nunca reemplaza al docente: todo contenido generado pasa por
  aprobación explícita (sección 3 del prompt maestro) — se implementa
  en la fase del Generador Pedagógico IA, aún no construida.

## Stack confirmado (heredado de LlévameQ, admin/APP_ADMIN_v4_mejoras)
- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- Supabase (`@supabase/ssr`) — cliente browser en `lib/supabase.ts`,
  cliente server en `lib/supabase-server.ts` (RLS correcto en servidor)
- `recharts` para gráficos (se usará desde la fase de Análisis Estadístico)

## FASE 0 — Identidad, Auth, Roles y Esquema Base ✅ COMPLETADA (este chat)
- [x] Estructura del proyecto Next.js 16 creada, mismo patrón que LlévameQ.
- [x] Logo oficial integrado en `public/logo.png`, favicon y metadata.
- [x] Paleta de color extraída del logo (`app/globals.css`): azul
      institucional, verde, dorado como acento.
- [x] Esquema SQL inicial (`supabase/migraciones/001_esquema_inicial.sql`):
      `instituciones`, `perfiles` (con rol docente/rector/superadmin),
      `docentes`, `rectores`, `grados`, `grupos`, `areas`, `asignaturas`,
      `estudiantes`, `asignaciones_docente`, `auditoria`.
- [x] RLS activado con aislamiento multi-tenant real:
      Institución → Docente → Grupo → Estudiantes (sección 9-10 del prompt).
- [x] Login real contra Supabase Auth (`app/login`), que lee el rol desde
      `perfiles` (NO se asume el rol del lado del cliente) y redirige a
      `/dashboard`, `/rector` o `/superadmin` según corresponda.
- [x] Tres dashboards reales (no maquetas): cada uno consulta Supabase en
      el servidor y muestra conteos reales (grupos, docentes, estudiantes,
      instituciones). Las tarjetas de funciones aún no construidas
      (actividades IA, exámenes, auditoría) se muestran atenuadas con el
      texto "Disponible en la próxima fase" — nunca como botón que no hace nada.
- [x] `Sidebar` por rol que SOLO enlaza a páginas que ya existen.

## Pendiente de tu parte para poder probar Fase 0
1. Crear un proyecto en https://supabase.com (gratis).
2. Copiar `.env.local.example` a `.env.local` y completar
   `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (Configuración del proyecto → API).
3. Ejecutar `supabase/migraciones/001_esquema_inicial.sql` en
   Supabase → SQL Editor.
4. Crear manualmente (una sola vez, por SQL Editor o por el panel de Auth)
   tu primer usuario superadmin: crear el usuario en Authentication, luego
   insertar su fila correspondiente en `perfiles` con `rol = 'superadmin'`.
5. `npm install` y `npm run dev`.

## FASE 1 — Registro, Instituciones, Grados/Grupos/Estudiantes ✅ COMPLETADA (este chat)
- [x] `app/registro`: registro real de docente. Foto por galería o selfie
      (cámara real vía `getUserMedia`), con recorte funcional (pan + zoom
      sobre canvas, repetir/confirmar) en `app/components/FotoPerfil.tsx`.
      La foto confirmada se sube al bucket `fotos-perfil` de Supabase Storage.
- [x] Migración `002_storage_y_registro.sql`: bucket de fotos + políticas
      (cada usuario solo sube/reemplaza la suya), política para que el
      docente pueda insertar su propio perfil al registrarse, e
      instituciones activas visibles para el combo de registro.
- [x] `/superadmin/instituciones`: alta y listado real de instituciones
      (solo superadmin, protegido por RLS).
- [x] `/rector/grados`, `/rector/grupos`: alta y listado real. El código
      de grupo (`A360-6A-2026`) se genera automáticamente
      (`lib/codigoGrupo.ts`) y es único por año lectivo.
- [x] `/rector/estudiantes`: alta manual + **carga masiva por CSV** real
      (usa `papaparse`, agregado a `package.json`). Encabezados esperados:
      `nombre_completo, numero_documento, grado, grupo, jornada`. Los
      valores de grado/grupo se emparejan por nombre con los ya creados.
- [x] `/rector/docentes`: listado real de docentes de la institución
      (sección 5), con su código AULA360 y área.
- [x] Sidebar actualizado con los enlaces reales nuevos por rol.

### Dependencia importante para que el registro funcione
En Supabase → Authentication → Providers → Email, si "Confirm email"
está activado, el registro le pedirá al docente confirmar su correo
antes de poder iniciar sesión (el código ya maneja este caso mostrando
el mensaje correcto, en vez de fallar). Para pruebas rápidas en
desarrollo puedes desactivar esa opción.

### Pendiente de tu parte para probar Fase 1
1. Ejecutar `supabase/migraciones/002_storage_y_registro.sql`.
2. `npm install` (agrega `papaparse`).
3. Como superadmin, registra al menos una institución en `/superadmin/instituciones`.
4. Regístrate como docente en `/registro` eligiendo esa institución.
5. Como rector de esa institución (créalo manualmente en `perfiles` con
   `rol='rector'` mientras no exista un flujo de invitación), crea grados,
   grupos y estudiantes.

## FASE 2 — Asignación docente y Plan de Área ✅ COMPLETADA (este chat)
- [x] `/rector/areas`: alta real de áreas y asignaturas por institución.
- [x] `/rector/asignaciones`: el rector asigna Docente → Grado → Grupo →
      Área → Asignatura desde el panel (antes la tabla `asignaciones_docente`
      existía pero no tenía UI). Selects encadenados (el grupo se filtra
      por grado elegido, la asignatura por área elegida).
- [x] Migración `003_asignaciones_y_plan_area.sql`: políticas para que el
      rector pueda crear/borrar asignaciones de su institución.
- [x] Dashboard del docente ahora muestra sus clases reales (grado, grupo,
      área, asignatura), no solo un conteo.
- [x] **Plan de área** (sección 14) — `/dashboard/plan-de-area`: el docente
      sube su documento (PDF/Word/JPG/PNG) a Storage privado (`documentos`)
      y completa los campos estructurados (competencias, estándares, DBA,
      evidencias, temas, objetivos, metodología, evaluación).

### Dependencia pendiente, declarada explícitamente (sección 70)
La extracción AUTOMÁTICA del documento del plan de área (que la IA lea el
PDF/Word y prellene competencias/estándares/temas) **todavía no está
integrada** — requiere conectar un proveedor de IA/OCR real, lo cual se
hará en la Fase 4 (Generador Pedagógico IA), con la capa de abstracción
de proveedor que pide la sección 52. Por ahora el docente completa esos
campos manualmente (`estado_extraccion = 'manual'`); el campo ya existe
en la base de datos para pasar a `'ia_completada'` cuando se integre, sin
necesidad de migrar datos.

### Pendiente de tu parte para probar Fase 2
1. Ejecutar `supabase/migraciones/003_asignaciones_y_plan_area.sql`.
2. Como rector: crea áreas/asignaturas en `/rector/areas`, luego asigna
   docentes en `/rector/asignaciones`.
3. Como docente: verifica que tus clases aparecen en `/dashboard`, y sube
   un plan de área en `/dashboard/plan-de-area`.

## FASE 3 — Día a día y Asistencia con membrete ✅ COMPLETADA (este chat)
- [x] Migración `004_dia_a_dia_y_asistencia.sql`: tablas `daily_plans`,
      `attendance` y `attendance_estudiante`, con RLS (docente gestiona lo
      suyo, rector lee lo de su institución).
- [x] `/dashboard/dia-a-dia`: el docente registra su planeación diaria
      (fecha, tema, objetivo, competencia, estándar, actividades, recursos,
      evaluación, tarea, observaciones) ligada a una de sus clases
      asignadas, con historial real.
- [x] `/dashboard/asistencia`: flujo real de toma de asistencia — elige
      clase + fecha, carga la lista de estudiantes del grupo (o recupera
      la asistencia ya tomada ese día si existe), marca
      Presente/Ausente/Excusa/Retardo por estudiante con observación, y
      guarda (upsert, se puede corregir el mismo día sin duplicar).
- [x] **Asistencia descargable con membrete institucional** (sección 17):
      `/dashboard/asistencia/imprimir/[id]` genera una hoja con logo de
      la institución (o el de AULA360 si aún no subieron uno propio),
      datos institucionales, docente, grado/grupo/área/asignatura, fecha,
      lista completa con estados, espacio de firmas, y el pie
      "Elaborado con AULA360...". Se descarga como PDF con
      "Imprimir → Guardar como PDF" del navegador (sin depender de una
      librería externa de generación de PDF en el servidor).

### Pendiente de tu parte para probar Fase 3
1. Ejecutar `supabase/migraciones/004_dia_a_dia_y_asistencia.sql`.
2. Como docente (con al menos una clase asignada): registra una
   planeación en `/dashboard/dia-a-dia` y toma asistencia en
   `/dashboard/asistencia`, luego prueba "Ver / Descargar con membrete".

## FASE 4 — Generador Pedagógico IA ✅ COMPLETADA (este chat)
Decisión de proveedores (confirmada contigo): **Claude/Anthropic** para
texto (planeaciones, actividades), **Gemini** para imágenes de apoyo,
**exportación propia a .pptx** para diapositivas (no es IA, es
determinístico con `pptxgenjs`), **video pospuesto** — no está en
ninguna de las 70 secciones del prompt maestro, se evalúa más adelante
si surge una necesidad concreta.

- [x] **Capa de abstracción de IA** (sección 52), en `lib/ai/`:
      `anthropic.ts` (texto), `gemini.ts` (imágenes), `tipos.ts`
      (contratos compartidos). Ningún componente llama a un proveedor
      directamente — todo pasa por Route Handlers de servidor
      (`app/api/ai/*`), así que las API keys nunca llegan al navegador.
- [x] Migración `005_generador_ia.sql`: tabla `ai_generaciones` (guarda
      cada versión generada + historial completo de mejoras pedidas,
      nunca se sobrescribe en silencio) y bucket `imagenes-ia`.
- [x] `/dashboard/generador-ia`: el docente elige su clase (grado/grupo/
      área/asignatura), tema, minutos y dificultad → genera objetivo,
      competencia, estándar, **3 actividades realmente distintas**
      (comprensión/aplicación/análisis, sección 19), recursos,
      evaluación, tarea y refuerzo. Usa como contexto el plan de área
      más reciente del docente para esa área, si existe (integración
      con Fase 2).
- [x] **Flujo de aprobación obligatorio de la sección 3**: "¿Estás de
      acuerdo con este contenido?" → Sí/No. Si dice "No", pide
      "¿Qué deseas mejorar?" y regenera con esa instrucción — la versión
      anterior queda en el historial, no se pierde.
- [x] Botón "Generar imagen de apoyo (IA)" por actividad (Gemini),
      sube la imagen a Storage y la muestra.
- [x] Una vez aprobado: **"Guardar en Día a día"** (inserta en la tabla
      de la Fase 3, cerrando el ciclo Plan de área → IA → Día a día) y
      **"Exportar a PowerPoint"** (genera el .pptx en el navegador con
      `pptxgenjs`, sin servidor de por medio).

### Pendiente de tu parte para probar Fase 4
1. Ejecutar `supabase/migraciones/005_generador_ia.sql`.
2. `npm install` (agrega `pptxgenjs`).
3. Completar `ANTHROPIC_API_KEY` y `GEMINI_API_KEY` en `.env.local`
   (ver `.env.local.example`). Sin ellas, el generador de clase o el de
   imágenes responden con un error claro indicando qué falta — nunca
   fallan en silencio ni devuelven contenido inventado.

### Aún NO construido, para no confundirlo con lo anterior
Los **exámenes tipo ICFES** (sección 20-25: 3 exámenes, examen macro,
banco de preguntas, validador automático, IRT) son la Fase 5 —
deliberadamente separados porque llevan su propio validador pesado
(mínimo 20 ítems, textos continuos/discontinuos/mixtos, regeneración
automática si falla) que no quise mezclar con el generador de clases.

## FASE 5 — Próxima (pendiente, no iniciada)
Exámenes tipo ICFES (3 versiones + examen macro), validador automático,
banco de preguntas, diseño de ítems inspirado en IRT.

## Fases futuras (mapeadas desde el prompt maestro, sin construir aún)
- Fase 2: Plan de área (subida + extracción), formato de día a día.
- Fase 3: Asistencia con membrete institucional.
- Fase 4: Generador Pedagógico IA (capa de abstracción de proveedor de IA
  + flujo de aprobación docente obligatorio, sección 3).
- Fase 5: Exámenes tipo ICFES + validador automático + banco de preguntas
  + metodología IRT (diseño de ítems primero; calibración estadística
  solo cuando existan datos suficientes, sección 23).
- Fase 6: OCR de hojas de respuesta + calificación automática + rúbricas.
- Fase 7: Informes (PDF/Excel), estadística, planes de mejoramiento.
- Fase 8: Panel rector completo (comentarios, recomendaciones, formatos
  institucionales, permisos).
- Fase 9: Notificaciones, auditoría completa, exportación multi-formato.
- Fase 10: App móvil (React Native/Expo).
