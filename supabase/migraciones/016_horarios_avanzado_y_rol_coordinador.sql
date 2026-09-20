-- ============================================================
-- Consolidado de las migraciones sin numerar aplicadas directamente
-- en Supabase para el módulo avanzado de horarios: nuevo rol
-- "coordinador", aulas, disponibilidad de docentes, versiones de
-- horario con aprobación del rector, y conflictos.
-- Reconstruido desde el historial real de la base de datos.
-- ============================================================

-- ---------- Nuevo rol: coordinador ----------
alter table public.perfiles drop constraint perfiles_rol_check;
alter table public.perfiles add constraint perfiles_rol_check
  check (rol = any (array['docente'::text, 'rector'::text, 'coordinador'::text, 'superadmin'::text]));

-- ---------- Aulas ----------
create table public.aulas (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references public.instituciones(id),
  nombre text not null,
  capacidad integer,
  sede text,
  tipo text not null default 'normal'
    check (tipo = any (array['normal','laboratorio','informatica','ingles','educacion_fisica','auditorio','especializada'])),
  recursos jsonb default '[]'::jsonb,
  activa boolean not null default true,
  creado_en timestamptz not null default now()
);

-- ---------- Disponibilidad de docentes ----------
create table public.disponibilidad_docentes (
  id uuid primary key default gen_random_uuid(),
  docente_id uuid not null references public.perfiles(id),
  dia_semana integer not null check (dia_semana between 1 and 6),
  franja_id uuid not null references public.franjas_horarias(id),
  disponible boolean not null default true,
  unique (docente_id, dia_semana, franja_id)
);

-- ---------- Versiones de horario (borrador -> aprobación -> publicado) ----------
create table public.versiones_horario (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references public.instituciones(id),
  numero_version integer not null,
  anio_lectivo integer not null,
  estado text not null default 'borrador'
    check (estado = any (array['borrador','pendiente_aprobacion','aprobado','devuelto','publicado'])),
  puntuacion numeric,
  creado_por uuid references public.perfiles(id),
  creado_en timestamptz not null default now(),
  unique (institucion_id, anio_lectivo, numero_version)
);

-- ---------- Conflictos detectados en una versión de horario ----------
create table public.conflictos_horario (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.versiones_horario(id),
  tipo text not null,
  severidad text not null default 'advertencia'
    check (severidad = any (array['critico','advertencia','resuelto'])),
  descripcion text not null,
  entidad_afectada jsonb,
  resuelto boolean not null default false,
  creado_en timestamptz not null default now()
);

-- ---------- Decisiones del rector sobre una versión ----------
create table public.aprobaciones_horario (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.versiones_horario(id),
  rector_id uuid not null references public.perfiles(id),
  decision text not null check (decision = any (array['aprobado','devuelto'])),
  comentario text,
  creado_en timestamptz not null default now()
);

-- ---------- Ampliaciones a tablas existentes ----------
alter table public.horario_clases
  add column version_id uuid references public.versiones_horario(id),
  add column aula_id uuid references public.aulas(id);

alter table public.asignaturas
  add column intensidad_horaria_semanal integer check (intensidad_horaria_semanal > 0);

alter table public.instituciones
  add column dias_clase integer[] default array[1,2,3,4,5],
  add column hora_inicio_jornada time,
  add column hora_fin_jornada time,
  add column duracion_bloque_minutos integer default 60,
  add column jornada text default 'unica'
    check (jornada = any (array['manana','tarde','unica','completa']));

alter table public.franjas_horarias
  add column es_bloque_clase boolean not null default true;

update public.franjas_horarias
set es_bloque_clase = false
where nombre ilike 'descanso%' or nombre ilike 'almuerzo%' or nombre ilike 'recreo%';

alter table public.asignaturas
  add column aula_tipo_requerido text
  check (aula_tipo_requerido is null or aula_tipo_requerido = any (
    array['normal','laboratorio','informatica','ingles','educacion_fisica','auditorio','especializada']
  ));

alter table public.horario_emergente_clases
  add column docente_sustituto_id uuid references public.perfiles(id),
  add column aula_id uuid references public.aulas(id),
  add column sin_cubrir boolean not null default false;

alter table public.horarios_emergentes
  add column tipo text not null default 'sustitucion'
    check (tipo = any (array['sustitucion','horario_alternativo'])),
  add column version_alternativa_id uuid references public.versiones_horario(id),
  add column estado text not null default 'borrador'
    check (estado = any (array['borrador','pendiente_aprobacion','aprobado','devuelto'])),
  add column aprobado_por uuid references public.perfiles(id),
  add column aprobado_en timestamptz,
  add column comentario_aprobacion text;

-- ---------- Políticas RLS ----------
alter table public.aulas enable row level security;

create policy "coordinador gestiona aulas de su institucion" on public.aulas
  for all
  using (institucion_id = privado.institucion_de((select auth.uid()))
    and privado.rol_de((select auth.uid())) = any (array['coordinador'::text,'superadmin'::text]))
  with check (institucion_id = privado.institucion_de((select auth.uid()))
    and privado.rol_de((select auth.uid())) = any (array['coordinador'::text,'superadmin'::text]));

create policy "rector y coordinador leen aulas de su institucion" on public.aulas
  for select
  using (institucion_id = privado.institucion_de((select auth.uid()))
    and privado.rol_de((select auth.uid())) = any (array['rector'::text,'coordinador'::text,'superadmin'::text]));

alter table public.disponibilidad_docentes enable row level security;

create policy "docente gestiona su propia disponibilidad" on public.disponibilidad_docentes
  for all
  using (docente_id = (select auth.uid()))
  with check (docente_id = (select auth.uid()));

create policy "coordinador gestiona disponibilidad de su institucion" on public.disponibilidad_docentes
  for all
  using (exists (
    select 1 from public.perfiles p
    where p.id = disponibilidad_docentes.docente_id
      and p.institucion_id = privado.institucion_de((select auth.uid()))
  ) and privado.rol_de((select auth.uid())) = any (array['coordinador'::text,'superadmin'::text]))
  with check (exists (
    select 1 from public.perfiles p
    where p.id = disponibilidad_docentes.docente_id
      and p.institucion_id = privado.institucion_de((select auth.uid()))
  ) and privado.rol_de((select auth.uid())) = any (array['coordinador'::text,'superadmin'::text]));

create policy "rector lee disponibilidad de su institucion" on public.disponibilidad_docentes
  for select
  using (exists (
    select 1 from public.perfiles p
    where p.id = disponibilidad_docentes.docente_id
      and p.institucion_id = privado.institucion_de((select auth.uid()))
  ) and privado.rol_de((select auth.uid())) = any (array['rector'::text,'superadmin'::text]));

alter table public.versiones_horario enable row level security;

create policy "coordinador gestiona versiones de su institucion" on public.versiones_horario
  for all
  using (institucion_id = privado.institucion_de((select auth.uid()))
    and privado.rol_de((select auth.uid())) = any (array['coordinador'::text,'superadmin'::text]))
  with check (institucion_id = privado.institucion_de((select auth.uid()))
    and privado.rol_de((select auth.uid())) = any (array['coordinador'::text,'superadmin'::text]));

create policy "rector lee y decide versiones de su institucion" on public.versiones_horario
  for select
  using (institucion_id = privado.institucion_de((select auth.uid()))
    and privado.rol_de((select auth.uid())) = any (array['rector'::text,'superadmin'::text]));

create policy "rector actualiza estado de version para aprobar o devolver" on public.versiones_horario
  for update
  using (institucion_id = privado.institucion_de((select auth.uid()))
    and privado.rol_de((select auth.uid())) = any (array['rector'::text,'superadmin'::text]))
  with check (institucion_id = privado.institucion_de((select auth.uid()))
    and privado.rol_de((select auth.uid())) = any (array['rector'::text,'superadmin'::text]));

-- Nota: la política "docente lee version publicada de su institucion"
-- se creó y luego se eliminó a propósito (ver más abajo) — los docentes
-- ya no consultan versiones_horario directamente.

alter table public.conflictos_horario enable row level security;

create policy "coordinador gestiona conflictos de su institucion" on public.conflictos_horario
  for all
  using (exists (
    select 1 from public.versiones_horario v
    where v.id = conflictos_horario.version_id
      and v.institucion_id = privado.institucion_de((select auth.uid()))
  ) and privado.rol_de((select auth.uid())) = any (array['coordinador'::text,'superadmin'::text]))
  with check (exists (
    select 1 from public.versiones_horario v
    where v.id = conflictos_horario.version_id
      and v.institucion_id = privado.institucion_de((select auth.uid()))
  ) and privado.rol_de((select auth.uid())) = any (array['coordinador'::text,'superadmin'::text]));

create policy "rector lee conflictos de su institucion" on public.conflictos_horario
  for select
  using (exists (
    select 1 from public.versiones_horario v
    where v.id = conflictos_horario.version_id
      and v.institucion_id = privado.institucion_de((select auth.uid()))
  ) and privado.rol_de((select auth.uid())) = any (array['rector'::text,'superadmin'::text]));

alter table public.aprobaciones_horario enable row level security;

create policy "rector registra su propia decision" on public.aprobaciones_horario
  for insert
  with check (rector_id = (select auth.uid())
    and exists (
      select 1 from public.versiones_horario v
      where v.id = aprobaciones_horario.version_id
        and v.institucion_id = privado.institucion_de((select auth.uid()))
    )
    and privado.rol_de((select auth.uid())) = any (array['rector'::text,'superadmin'::text]));

create policy "rector y coordinador leen aprobaciones de su institucion" on public.aprobaciones_horario
  for select
  using (exists (
    select 1 from public.versiones_horario v
    where v.id = aprobaciones_horario.version_id
      and v.institucion_id = privado.institucion_de((select auth.uid()))
  ) and privado.rol_de((select auth.uid())) = any (array['rector'::text,'coordinador'::text,'superadmin'::text]));

-- Se quitó el acceso de lectura de los docentes a versiones_horario
-- (ya no la consultan directamente).
drop policy if exists "docente lee version publicada de su institucion" on public.versiones_horario;

-- Se restringió la lectura de aulas: reemplaza la política abierta
-- "usuarios leen aulas de su institucion" por una limitada a
-- rector/coordinador/superadmin.
drop policy if exists "usuarios leen aulas de su institucion" on public.aulas;

create policy "coordinador gestiona horarios emergentes" on public.horarios_emergentes
  for all
  using (institucion_id = privado.institucion_de((select auth.uid()))
    and privado.rol_de((select auth.uid())) = 'coordinador'::text)
  with check (institucion_id = privado.institucion_de((select auth.uid()))
    and privado.rol_de((select auth.uid())) = 'coordinador'::text);

create policy "coordinador gestiona clases de horarios emergentes" on public.horario_emergente_clases
  for all
  using (exists (
    select 1 from public.horarios_emergentes he
    where he.id = horario_emergente_clases.horario_emergente_id
      and he.institucion_id = privado.institucion_de((select auth.uid()))
  ) and privado.rol_de((select auth.uid())) = 'coordinador'::text)
  with check (exists (
    select 1 from public.horarios_emergentes he
    where he.id = horario_emergente_clases.horario_emergente_id
      and he.institucion_id = privado.institucion_de((select auth.uid()))
  ) and privado.rol_de((select auth.uid())) = 'coordinador'::text);

-- ---------- NOTA IMPORTANTE ----------
-- En el historial real de la base de datos, después de estas políticas
-- se aplicaron varias migraciones de DATOS DE PRUEBA (una institución,
-- una franja horaria, un aula y un docente específicos, más la creación
-- de una cuenta "coordinador de prueba" y el cambio de contraseña de
-- una cuenta superadmin). Esas migraciones tenían contraseñas en texto
-- plano y no se incluyen aquí por seguridad. Si necesitas datos de
-- prueba similares, créalos manualmente desde el panel de Supabase con
-- contraseñas nuevas, no reutilices las que aparecían ahí.
