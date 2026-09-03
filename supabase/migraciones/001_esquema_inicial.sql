-- ============================================================
-- AULA360 — Fase 0: Esquema inicial (identidad, roles, multi-tenant)
-- Ejecutar UNA VEZ en Supabase → SQL Editor → New query → Run
-- ============================================================
-- Cubre las secciones 4-13 y 53 del prompt maestro:
-- usuarios, roles, instituciones, docentes, rectores, estudiantes,
-- grados/grupos, áreas/asignaturas, asignaciones docente-grupo.
-- Las tablas de contenido (planeaciones, exámenes, IA, etc.) se
-- agregan en fases posteriores para no crear tablas vacías sin uso.

create extension if not exists "pgcrypto";

-- ---------- INSTITUCIONES (multi-tenant root) ----------
create table if not exists instituciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  nit text,
  ciudad text,
  departamento text,
  logo_url text,
  calendario_academico jsonb default '{}'::jsonb, -- periodos configurables (sección 63)
  activa boolean not null default true,
  creada_en timestamptz not null default now()
);

-- ---------- USUARIOS BASE ----------
-- perfiles: 1 fila por usuario de auth.users, con su rol y su institución.
create table if not exists perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  rol text not null check (rol in ('docente','rector','superadmin')),
  institucion_id uuid references instituciones(id) on delete restrict,
  nombre_completo text not null,
  numero_documento text,
  correo text not null,
  telefono text,
  foto_url text,
  codigo_aula360 text unique, -- código público de identificación (sección 8)
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create index if not exists idx_perfiles_institucion on perfiles(institucion_id);
create index if not exists idx_perfiles_rol on perfiles(rol);

-- ---------- DATOS ESPECÍFICOS DE DOCENTE ----------
create table if not exists docentes (
  perfil_id uuid primary key references perfiles(id) on delete cascade,
  area_principal text,
  informacion_profesional text
);

-- ---------- DATOS ESPECÍFICOS DE RECTOR ----------
create table if not exists rectores (
  perfil_id uuid primary key references perfiles(id) on delete cascade,
  cargo text default 'Rector'
);

-- ---------- GRADOS ----------
create table if not exists grados (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id) on delete cascade,
  nombre text not null, -- ej: "6°"
  creado_en timestamptz not null default now(),
  unique(institucion_id, nombre)
);

-- ---------- GRUPOS ----------
create table if not exists grupos (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id) on delete cascade,
  grado_id uuid not null references grados(id) on delete cascade,
  nombre text not null, -- ej: "6A"
  jornada text,
  anio_lectivo int not null,
  codigo_grupo text unique not null, -- ej: A360-6A-2026 (sección 11)
  creado_en timestamptz not null default now()
);

-- ---------- ÁREAS Y ASIGNATURAS ----------
create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id) on delete cascade,
  nombre text not null -- ej: "Ciencias Naturales"
);

create table if not exists asignaturas (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references areas(id) on delete cascade,
  nombre text not null -- ej: "Biología"
);

-- ---------- ESTUDIANTES ----------
create table if not exists estudiantes (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id) on delete cascade,
  nombre_completo text not null,
  numero_documento text,
  grado_id uuid references grados(id),
  grupo_id uuid references grupos(id),
  jornada text,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create index if not exists idx_estudiantes_grupo on estudiantes(grupo_id);

-- ---------- ASIGNACIÓN DOCENTE → GRADO/GRUPO/ÁREA/ASIGNATURA ----------
create table if not exists asignaciones_docente (
  id uuid primary key default gen_random_uuid(),
  docente_id uuid not null references perfiles(id) on delete cascade,
  institucion_id uuid not null references instituciones(id) on delete cascade,
  grado_id uuid not null references grados(id),
  grupo_id uuid not null references grupos(id),
  area_id uuid not null references areas(id),
  asignatura_id uuid not null references asignaturas(id),
  creado_en timestamptz not null default now(),
  unique(docente_id, grupo_id, asignatura_id)
);

-- ---------- AUDITORÍA (sección 51) ----------
create table if not exists auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references perfiles(id),
  institucion_id uuid references instituciones(id),
  accion text not null,
  entidad text,
  entidad_id uuid,
  detalle jsonb,
  creado_en timestamptz not null default now()
);

-- ============================================================
-- RLS — aislamiento multi-tenant: Institución → Docente → Grupo → Estudiantes
-- ============================================================
alter table instituciones enable row level security;
alter table perfiles enable row level security;
alter table docentes enable row level security;
alter table rectores enable row level security;
alter table grados enable row level security;
alter table grupos enable row level security;
alter table areas enable row level security;
alter table asignaturas enable row level security;
alter table estudiantes enable row level security;
alter table asignaciones_docente enable row level security;
alter table auditoria enable row level security;

-- Un usuario ve su propio perfil.
drop policy if exists "perfil propio" on perfiles;
create policy "perfil propio" on perfiles
  for select using (id = auth.uid());

drop policy if exists "perfil propio update" on perfiles;
create policy "perfil propio update" on perfiles
  for update using (id = auth.uid());

-- superadmin ve y edita todo (perfiles).
drop policy if exists "superadmin todo perfiles" on perfiles;
create policy "superadmin todo perfiles" on perfiles
  for all using (
    exists (select 1 from perfiles p where p.id = auth.uid() and p.rol = 'superadmin')
  );

-- Cualquier usuario autenticado solo ve datos de SU institución
-- (aplica a instituciones, grados, grupos, áreas, asignaturas, estudiantes, asignaciones).
drop policy if exists "misma institucion" on instituciones;
create policy "misma institucion" on instituciones
  for select using (
    id = (select institucion_id from perfiles where id = auth.uid())
    or exists (select 1 from perfiles p where p.id = auth.uid() and p.rol = 'superadmin')
  );

drop policy if exists "grados misma institucion" on grados;
create policy "grados misma institucion" on grados
  for all using (institucion_id = (select institucion_id from perfiles where id = auth.uid()));

drop policy if exists "grupos misma institucion" on grupos;
create policy "grupos misma institucion" on grupos
  for all using (institucion_id = (select institucion_id from perfiles where id = auth.uid()));

drop policy if exists "areas misma institucion" on areas;
create policy "areas misma institucion" on areas
  for all using (institucion_id = (select institucion_id from perfiles where id = auth.uid()));

drop policy if exists "estudiantes misma institucion" on estudiantes;
create policy "estudiantes misma institucion" on estudiantes
  for all using (institucion_id = (select institucion_id from perfiles where id = auth.uid()));

-- Un docente solo ve SUS asignaciones (grupos que le pertenecen); el rector ve todas las de su institución.
drop policy if exists "asignaciones docente propio o rector" on asignaciones_docente;
create policy "asignaciones docente propio o rector" on asignaciones_docente
  for select using (
    docente_id = auth.uid()
    or institucion_id = (select institucion_id from perfiles p where p.id = auth.uid() and p.rol in ('rector','superadmin'))
  );

-- Verifica que quedó aplicado:
-- select table_name, row_security from information_schema.tables
-- where table_schema = 'public' and row_security = 'YES';
