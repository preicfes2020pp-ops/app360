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

## VALIDACIÓN EN SUPABASE REAL ✅ (este chat, vía conector MCP)
Proyecto de Supabase creado por ti (`aula360`, ID `hmazqbwqodbiyburvczn`,
región us-east-1), **separado del de LlévameQ**. Confirmaste que estaba
vacío, lo verifiqué yo mismo antes de tocar nada (`list_tables` → 0
tablas), y corrí las 8 migraciones directamente contra ese proyecto.

**Bugs reales encontrados y corregidos** (esto es exactamente por lo que
valía la pena probar antes de seguir a Fase 5):
- 🔴 **Migración 006**: 4 tablas (`docentes`, `rectores`, `auditoria`,
  `asignaturas`) quedaron con RLS activado pero **sin ninguna política**
  — Postgres bloquea todo acceso por defecto en ese caso, ni el dueño
  legítimo podía leer su propia fila. Corregido.
- 🟡 **Migración 007**: todas las políticas RLS reescritas envolviendo
  `auth.uid()` en `(select auth.uid())` (evita reevaluación por fila,
  recomendación oficial de Supabase) + índices en columnas de llave
  foránea que faltaban.
- 🟡 **Migración 008**: índice faltante en `estudiantes.grado_id`.

Después de estas 3 migraciones de corrección: **0 alertas de seguridad**,
solo quedan avisos INFO de "índice sin usar" (esperado, no hay datos
todavía) y WARN de "múltiples políticas permisivas" (correcto
funcionalmente — cada rol tiene su propia política — es una
optimización menor, no un bug).

### Pendiente de tu parte para terminar de conectar
1. En tu proyecto Supabase → Settings → API: copia la Project URL y la
   anon key a tu `.env.local`.
2. `npm install` y `npm run dev` — ya no hace falta correr SQL a mano,
   las 8 migraciones ya están aplicadas en tu base real.
3. Crea tu primer usuario superadmin (Authentication → Add user, luego
   insertar su fila en `perfiles` con `rol='superadmin'`).

## ⚠️ HALLAZGO IMPORTANTE (otro chat/sesión avanzó el proyecto en paralelo)
Al conectar el MCP de Supabase en este chat para probar, la base de datos
real ya tenía **15 migraciones aplicadas** (nosotros solo conocíamos hasta
la 008). Otra sesión — probablemente Claude Code corriendo directo en el
computador del usuario — siguió construyendo directo contra Supabase
(y probablemente editando el código localmente), sin generar nunca un zip
que el usuario tuviera a mano. Se revisaron los 3 zips que el usuario sí
tenía guardados (`AULA360_Fase4`, `AULA360_fix2`, `AULA360_fix_build`) y
ninguno pasa de la migración 008 — es decir, **el código de esa sesión
paralela nunca llegó a un zip**, solo quedó (probablemente) en un
computador o carpeta que el usuario no ubicó.

Buenas noticias: las migraciones 001-008 (Fases 0-4) coinciden EXACTO
entre `fix2` y la base real — ese código sigue siendo válido y es la base
de este mismo zip. Lo que cambió fue el diseño de Exámenes (Fase 5) y se
agregaron features nuevas que este chat no conocía:
- `009_fix_recursion_rls_perfiles` / `010_mover_funciones_a_esquema_privado`:
  arreglos de RLS (funciones `privado.institucion_de()` / `privado.rol_de()`
  para evitar recursión — mejor que el patrón que usábamos antes).
- `011_examenes_icfes`: arquitectura **relacional**, no la que yo había
  construido antes. Banco de preguntas real (`preguntas`, con columnas
  `irt_dificultad`/`irt_discriminacion`/`irt_adivinacion` ya previstas
  para calibración IRT futura), examen (`examenes`) y su enlace ordenado
  (`examen_preguntas`). Cada versión (A/B/C) es una fila separada en
  `examenes` que comparte `tema` + `asignacion_id`.
- `012_horarios` / `013_horas_semanales_asignacion`: sistema de horarios
  (`franjas_horarias`, `horario_clases`, `horarios_emergentes`,
  `horario_emergente_clases`) — **sin código de UI conocido, pendiente**.
- `014_temas_extraidos_plan_area`: extracción de temas estructurados del
  plan de área (`area_plan_temas`) — **sin código de UI conocido, pendiente**.
- `015_formato_dia_a_dia`: plantilla de formato subida por el docente
  para el día a día (`formatos_dia_a_dia`) — **sin código de UI conocido,
  pendiente**.

## FASE 5 — Exámenes tipo ICFES ✅ RECONSTRUIDA en este chat (esquema real)
Reconstruida desde cero contra las tablas reales `preguntas` /
`examenes` / `examen_preguntas` (no las que yo había inventado antes).
- [x] `lib/ai/anthropic.ts` → `generarPreguntasExamen`: pide a la IA
      mínimo 20 preguntas (continuo/discontinuo/mixto), valida
      automáticamente y reintenta hasta 3 veces; el número de intentos se
      guarda en `examenes.intentos_validacion` (columna que ya existía,
      pensada exactamente para esto).
- [x] `/dashboard/examenes`: genera preguntas → se guardan en el banco
      `preguntas` → se enlazan a un examen versión "A" en
      `examenes`/`examen_preguntas` → aprobación obligatoria (aprobar o
      pedir mejora y regenerar).
- [x] Al aprobar: se crean las versiones **B y C** (nuevas filas en
      `examenes`, mismas preguntas del banco pero en otro orden —
      `lib/barajarOrdenPreguntas.ts`). Importante: la tabla real no tiene
      columna para barajar también las opciones A-D, así que el
      anti-copia aquí es solo por **orden de preguntas**, no de opciones.
      Si se quiere barajar opciones también, hace falta agregar una
      columna nueva — no lo hice unilateralmente para no chocar con el
      diseño de la otra sesión.
- [x] Impresión con membrete: `/dashboard/examenes/imprimir/[id]` (cada
      id es una versión específica) y `/dashboard/examenes/imprimir/[id]/claves`
      (hoja de respuestas, solo docente).
- [x] Como `examenes` no tiene columna de "historial", pedir mejora
      **no conserva** el intento anterior (a diferencia del Generador de
      Clases) — coherente con el esquema real tal cual está.
- [x] La agrupación de A/B/C en la tabla de "Tus exámenes" es una
      heurística por (`asignacion_id` + `tema` idénticos), porque no hay
      una columna que las enlace explícitamente. Si un docente repite
      el mismo tema literal para dos exámenes distintos de la misma
      clase, se agruparían por error — riesgo bajo, pero queda anotado.

### Sin construir todavía (para no inventar sobre features ajenas)
- **Horarios** (`franjas_horarias`, `horario_clases`, `horarios_emergentes`):
  la tabla ya existe en producción pero no hay código de UI en este zip.
- **Formatos día a día** (`formatos_dia_a_dia`) y **temas extraídos del
  plan de área** (`area_plan_temas`): mismo caso, tabla real sin UI aquí.
- Calificación por OCR, rúbricas e informes (lo que antes llamé Fases 6-7):
  quedaron sin construir en este zip porque dependían de mi versión vieja
  de `examenes_icfes`. Se reconstruyen en un próximo paso ya apuntando a
  `examenes`/`preguntas` reales.

### Pendiente de tu parte
1. **Antes que nada**: sigue buscando esa carpeta del proyecto en tu
   computador (la de la sesión paralela) — si aparece, esas 3 features
   (horarios, formatos, temas extraídos) probablemente ya tengan código
   funcionando que no hay que reconstruir de cero.
2. Mientras tanto, puedes probar YA la Fase 5 reconstruida: no requiere
   ninguna migración nueva (las tablas ya existen), solo reemplazar el
   código con este zip, `npm install`, `npm run dev`, y probar
   `/dashboard/examenes`.

## HORARIOS ✅ CONSTRUIDA en este chat (esquema real, sin migración nueva)
Contra las tablas reales `franjas_horarias` / `horario_clases` /
`horarios_emergentes` / `horario_emergente_clases`, que ya existían en
producción sin ningún código de UI conocido.
- [x] `/rector/horarios`: administra las franjas horarias del colegio
      (nombre + hora inicio/fin) y arma el horario semanal **por grupo**:
      una cuadrícula franja × día (lunes a viernes) donde cada celda es
      la clase (docente + área/asignatura) que dicta ahí. Guarda en
      tiempo real, celda por celda.
- [x] `/rector/horarios-emergentes`: crea un horario especial temporal
      (motivo, fecha de inicio, días de duración — ej. una jornada
      pedagógica) sin tocar el horario normal, y arma su propia
      cuadrícula por grupo igual que el horario regular.
- [x] `/dashboard/horario` (docente): vista de solo lectura de su propio
      horario semanal, más cualquier horario emergente activo que
      incluya alguna de sus clases.
- [x] Sidebar: "Mi horario" (docente), "Horarios" y "Horarios
      emergentes" (rector).

### Simplificado a propósito en esta fase
- `dia_semana` se asume 1=lunes … 5=viernes (semana escolar de 5 días);
  no hay fin de semana en la cuadrícula. Si el colegio real necesita
  sábados, se ajusta fácil (agregar el día 6 a la lista `DIAS`).
- Una celda del horario regular solo puede tener UNA clase por
  grupo+día+franja (si eliges otra asignación en la misma celda,
  reemplaza la anterior) — es el comportamiento esperado de un horario
  escolar normal, no una limitación accidental.
- El horario emergente no "desactiva" automáticamente el horario normal
  en las fechas que cubre — ambos quedan visibles por separado. Si se
  quiere que el emergente oculte el normal automáticamente en esas
  fechas, es un ajuste de UI a futuro, no de base de datos.

## NOTA TEMPORAL: Exámenes ICFES corriendo con Gemini, no Anthropic
El usuario no tiene saldo cargado en console.anthropic.com todavía (solo
cuenta de claude.ai, que es distinta). Como Gemini sí tiene nivel
gratuito, se extrajo el prompt y el validador de preguntas a
`lib/ai/examenes-compartido.ts` (compartido entre proveedores) y se
agregó `generarPreguntasExamenGemini` en `lib/ai/gemini.ts` con el mismo
contrato exacto que `generarPreguntasExamen` de `lib/ai/anthropic.ts`.
Las rutas `app/api/ai/generar-examen/route.ts` y
`app/api/ai/aprobar-examen/route.ts` importan hoy la versión de Gemini.

**Para volver a Anthropic cuando haya saldo cargado**: en esos dos
archivos, cambiar el import de `generarPreguntasExamenGemini` (de
`@/lib/ai/gemini`) por `generarPreguntasExamen` (de `@/lib/ai/anthropic`)
— misma firma, no hay que tocar nada más. El Generador de Clases
(`/dashboard/generador-ia`) NO se tocó y sigue usando Anthropic, así que
seguirá sin funcionar hasta que haya saldo ahí.

## Imágenes reales para preguntas discontinuas ✅ (este chat)
A pedido explícito del usuario: las preguntas "discontinuas" **y también
las "mixtas"** ahora generan una imagen real (tabla/gráfico) con Gemini,
en vez de solo describirla en palabras. Se agregó la columna
`preguntas.imagen_url` (migración `009_imagen_preguntas_discontinuas.sql`,
ya aplicada en producción), y `lib/generarImagenPregunta.ts` que genera
la imagen, la sube al bucket privado `documentos` (carpeta del docente)
y devuelve una URL firmada para mostrarla de inmediato. El prompt del
generador se ajustó para que, en preguntas discontinuas/mixtas, el
"contexto" describa datos concretos y graficables (cifras, categorías,
ejes) en vez de una descripción ambigua, para que la imagen generada
tenga sentido real. Si la generación de imagen falla (cuota, error del
proveedor), la pregunta se guarda igual, solo sin imagen — nunca bloquea
el examen completo. Se ve tanto en la vista previa del docente como en
la impresión (URL firmada generada en el momento).

### ⚠️ Limitación real descubierta al probar: el nivel gratuito de
### Gemini NO incluye generación de imágenes (límite = 0)
Probado en vivo: `gemini-3.1-flash-image` devuelve 429 con
`"limit": 0` para cuentas sin facturación activa — no es que se agote
la cuota, es que el nivel gratuito no incluye nada de este modelo. Por
eso, mientras el usuario no active facturación en Google AI Studio (el
costo por imagen es bajo, pero no es gratis) o cargue saldo en
Anthropic, las preguntas discontinuas/mixtas seguirán mostrando solo el
texto descriptivo — que es exactamente el comportamiento de respaldo
que ya estaba diseñado para cuando la imagen falla, así que el examen
nunca se rompe por esto. Se ajustó `generarImagen` para NO reintentar
ante error 429 (antes perdía ~57 segundos reintentando algo que nunca
iba a funcionar sin facturación) — solo reintenta ante caídas 5xx
puntuales del servidor.

## NOTA TEMPORAL: Generador de Clases también corriendo con Gemini
Mismo motivo que Exámenes ICFES (usuario sin saldo en Anthropic todavía).
Se extrajo el prompt a `lib/ai/clase-compartida.ts` (compartido entre
proveedores) y se agregó `generarClaseGemini` en `lib/ai/gemini.ts`, con
el mismo contrato que `generarClase` de `lib/ai/anthropic.ts`. Las rutas
`app/api/ai/generar-clase/route.ts` y `app/api/ai/aprobar/route.ts` usan
hoy la versión de Gemini.

**Para volver a Anthropic cuando haya saldo**: en esos dos archivos,
cambiar el import de `generarClaseGemini` (de `@/lib/ai/gemini`) por
`generarClase` (de `@/lib/ai/anthropic`) — misma firma, no hay que tocar
nada más. Con esto, TODA la IA de texto del proyecto (clases y exámenes)
corre hoy sobre Gemini; Anthropic queda listo para retomarse con solo
cambiar esos 4 imports en total (2 de exámenes + 2 de clases) el día que
haya saldo cargado.

## Arreglos de impresión y hoja de respuestas del estudiante ✅ (este chat)
A partir de pruebas reales del usuario:
- [x] **Tablas ASCII rotas al imprimir**: cuando falla la imagen (ver nota
      de Gemini arriba), la IA a veces describía los datos con líneas de
      guiones tipo tabla ("|---|---|"), que se salían del margen de la
      hoja impresa. Se le prohibió explícitamente ese formato en el
      prompt (`lib/ai/examenes-compartido.ts`) — ahora describe los datos
      en prosa o lista simple. Además, como seguro adicional pase lo que
      pase, se forzó el ajuste de línea (`break-words`,
      `overflow-wrap: anywhere`) en el texto de contexto tanto en la
      vista previa como en la impresión, para que nada pueda salirse de
      la hoja sin importar qué genere la IA.
- [x] **Hoja de respuestas del estudiante** (nueva, distinta de la clave
      del docente): `/dashboard/examenes/imprimir/[id]/hoja-respuestas`
      — óvalos en blanco (A/B/C/D) por cada pregunta. Se distingue de la
      "Clave de respuestas (docente)" (la que ya existía, con las
      respuestas correctas — nunca se le entrega al estudiante).
      Enlazada tanto en la vista previa recién aprobada como en la tabla
      "Tus exámenes".
- [x] **Personalizada por estudiante** (ajuste tras prueba real): en vez
      de líneas en blanco para que el estudiante escriba a mano su
      nombre/documento, la hoja imprime **una página por cada estudiante
      del grupo** (tomados de la tabla `estudiantes`, que el rector ya
      carga en Fase 0-1 con nombre completo y número de documento), ya
      diligenciada con nombre, documento, grado/grupo y el nombre del
      docente — solo queda en blanco la fecha (se llena el día del
      examen). Todas las hojas del grupo salen en un mismo documento,
      una por página (`break-after-page`), listas para separar e
      imprimir. Si el grupo no tiene estudiantes cargados, se muestra un
      aviso claro en vez de una hoja vacía. Texto de instrucción
      actualizado a "lápiz HB2" (antes decía "lapicero").

- [x] **El examen completo también se personaliza por estudiante** (mismo
      ajuste, extendido a pedido del usuario): `/dashboard/examenes/imprimir/[id]`
      ahora imprime el cuadernillo completo de preguntas **una vez por
      cada estudiante del grupo**, con su nombre/documento/grado-grupo/
      docente ya diligenciados, igual que la hoja de respuestas. Las
      imágenes de las preguntas se firman una sola vez y se comparten
      entre todas las copias (no se regeneran por estudiante). **Ojo**:
      esto multiplica el tamaño del PDF por el número de estudiantes del
      grupo — para un grupo de 30 con un examen de 20 preguntas es un
      documento largo, pero es exactamente el comportamiento pedido
      (cuadernillos individuales listos para repartir).

## Estimación IRT en todas las preguntas ✅ (este chat)
A pedido explícito: cada pregunta generada (del generador genérico Y del
de inglés) ahora incluye una estimación inicial de los 3 parámetros IRT
(modelo logístico 3PL, igual al que usa el ICFES real): `irt_dificultad`
(b, -3 a 3), `irt_discriminacion` (a, 0.5-2.0), `irt_adivinacion` (c,
≈1/número de opciones). **Importante, para no generar falsas
expectativas**: esto es una *estimación experta de la IA al momento de
crear la pregunta*, NO una calibración estadística real — esa solo se
obtiene con resultados reales de muchos estudiantes a lo largo del
tiempo (ver nota ya existente sobre esto en la sección de Fase 6). Las
columnas ya existían en la tabla `preguntas` (creadas por la sesión
paralela), simplemente ahora se llenan.

## Subida de estudiantes y formato de día a día por el docente ✅ (este chat)
- [x] **Estudiantes**: `/dashboard/estudiantes` — se descubrió que la
      regla de seguridad de la tabla `estudiantes` ya permitía a
      cualquier miembro de la institución (no solo al rector) cargar el
      listado, así que solo hacía falta la página. Reutiliza el mismo
      componente de carga masiva por CSV que ya tenía el rector
      (`GestionEstudiantes.tsx`), pero acotado a los grados/grupos donde
      el docente tiene clase asignada.
- [x] **Formato de día a día**: `/dashboard/dia-a-dia` ahora tiene arriba
      un cuadro para subir el archivo de formato/plantilla institucional
      (Word/PDF/imagen) a la tabla real `formatos_dia_a_dia` (existía sin
      interfaz). Subir uno nuevo desactiva el anterior como "activo".
- [x] **Plan de área**: ya existía desde la Fase 2 (`/dashboard/plan-de-area`),
      no hizo falta construir nada nuevo, solo se confirmó que sigue ahí.

## Examen de inglés — formato oficial Saber 11.° ✅ (este chat)
A pedido explícito, investigado contra fuentes oficiales del ICFES
(Marco de referencia de la Prueba de Inglés Saber 11°/TyT/Pro, y la
ficha de Niveles de Desempeño de septiembre 2025) en vez de inventar la
estructura. Complementado con el examen de ejemplo real que el usuario
subió (un simulacro con la misma estructura de 7 partes y 45 preguntas).

**Hallazgo importante para tener en cuenta**: el ICFES actualizó sus
niveles de desempeño. Ya NO son 5 niveles (A-, A1, A2, B1, B+, versión
antigua) sino **4 niveles vigentes: Pre A1, A1, A2, B1** — la prueba no
evalúa niveles B2 en adelante del MCER. El generador usa los 4 vigentes.

- [x] `lib/ai/ingles-compartido.ts`: especificación FIJA y verificada de
      las 7 partes oficiales (número de preguntas y de opciones por
      parte, nivel MCER, competencia evaluada) — la IA nunca decide esta
      estructura, solo llena el contenido dentro de cada parte exacta:
      Parte 1 (5, 3 op., ubicar avisos), Parte 2 (5, 8 op. compartidas,
      vocabulario), Parte 3 (5, 3 op., conversaciones), Parte 4 (8, 3
      op., texto con espacios general), Parte 5 (7, 3 op., lectura
      literal), Parte 6 (5, 4 op., lectura inferencial), Parte 7 (10, 4
      op., texto con espacios gramatical/léxico). Total 45 preguntas.
- [x] `/dashboard/examenes` → sección aparte "Examen de inglés (formato
      Saber 11°)", con su propio generador (`ExamenInglesGenerador.tsx`)
      — el docente solo elige la clase y un tema/contexto general (para
      las partes de lectura y texto con espacios); las partes 1-3 usan
      situaciones cotidianas variadas, como en el examen real.
      Aprobación obligatoria igual que el resto (aprobar o regenerar el
      examen completo con instrucciones de mejora).
- [x] Impresión agrupada por parte, con instrucciones en español y
      contenido en inglés (como el examen real): `/dashboard/examenes/imprimir-ingles/[id]`
      (personalizado por estudiante, igual que el examen genérico) y
      `/dashboard/examenes/imprimir-ingles/[id]/claves` (clave para el
      docente). La tabla "Tus exámenes" detecta automáticamente los
      exámenes de inglés (columna `tipo = 'ingles_saber11'`) y enlaza a
      estas páginas en vez de las genéricas.
- [x] Cada pregunta se guarda en la tabla real `preguntas` (una fila por
      pregunta, igual que el generador genérico) — la pertenencia a una
      parte NO se guarda en una columna nueva: se reconstruye por
      posición (orden 1-45) usando las cantidades fijas de
      `PARTES_INGLES_ICFES`, ya que el orden de las partes nunca cambia.

### Simplificado a propósito en esta fase
- **Sin versiones B/C (anti-copia)** para el examen de inglés: barajar el
  orden de las preguntas rompería la correspondencia entre los espacios
  numerados del texto (Partes 4 y 7) y el banco compartido de palabras
  de la Parte 2. Si se necesita anti-copia para inglés, es un desarrollo
  aparte (habría que barajar y renumerar el texto con espacios a la vez,
  no solo las preguntas).
- **Solo Gemini**, no hay versión Anthropic de este generador (se agregó
  directo en el proveedor que el usuario está usando ahora mismo).
  Cuando haya saldo en Anthropic, replicar `generarExamenInglesGemini` en
  `lib/ai/anthropic.ts` con el mismo contrato es sencillo si se necesita.
- Sin hoja de respuestas de óvalos específica para inglés todavía (la
  cantidad de opciones varía 3/4/8 según la parte, así que la hoja de
  óvalos genérica del examen normal no le sirve tal cual) — pendiente si
  se necesita.

## Fases futuras (mapeadas desde el prompt maestro, sin construir aún)
- Formatos de día a día y temas extraídos del plan de área (tablas ya
  existen; falta UI).
- Calificación por OCR + rúbricas + informes, adaptados al esquema real
  de exámenes.
- Fase 8: Panel rector completo (comentarios, recomendaciones, formatos
  institucionales, permisos).
- Fase 9: Notificaciones, auditoría completa, exportación multi-formato.
- Fase 10: App móvil (React Native/Expo) o, alternativa más rápida,
  convertir esta misma app web en PWA instalable.
