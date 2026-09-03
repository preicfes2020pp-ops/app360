-- ============================================================
-- AULA360 — Fase 2: Asignación docente y Plan de Área
-- ============================================================
-- (asignaciones_docente ya existía desde 001; aquí solo se agrega
-- lo necesario para permitir crearlas desde el panel del rector,
-- y la tabla + storage del Plan de Área, sección 14.)

-- El rector puede CREAR asignaciones para docentes de su institución
-- (001 solo permitía SELECT propio del docente o del rector).
drop policy if exists "rector crea asignaciones de su institucion" on asignaciones_docente;
create policy "rector crea asignaciones de su institucion" on asignaciones_docente
  for insert with check (
    institucion_id = (select institucion_id from perfiles p where p.id = auth.uid() and p.rol in ('rector','superadmin'))
  );

drop policy if exists "rector borra asignaciones de su institucion" on asignaciones_docente;
create policy "rector borra asignaciones de su institucion" on asignaciones_docente
  for delete using (
    institucion_id = (select institucion_id from perfiles p where p.id = auth.uid() and p.rol in ('rector','superadmin'))
  );

-- ---------- PLAN DE ÁREA (sección 14) ----------
create table if not exists area_plans (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id) on delete cascade,
  docente_id uuid not null references perfiles(id) on delete cascade,
  area_id uuid not null references areas(id),
  grado_id uuid not null references grados(id),
  periodo text not null, -- ej: "Periodo 1 - 2026"
  archivo_url text,       -- PDF/Word/JPG/PNG subido por el docente
  archivo_nombre text,
  -- Estado de la extracción automática: hoy siempre 'manual' porque la
  -- extracción por IA todavía no está integrada (ver PROGRESO_AULA360.md).
  estado_extraccion text not null default 'manual' check (estado_extraccion in ('manual','pendiente_ia','ia_completada')),
  competencias text,
  estandares text,
  derechos_basicos_aprendizaje text,
  evidencias text,
  temas text,
  objetivos text,
  metodologia text,
  evaluacion text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_area_plans_docente on area_plans(docente_id);

alter table area_plans enable row level security;

-- Un docente gestiona (CRUD) sus propios planes de área.
drop policy if exists "docente gestiona sus planes de area" on area_plans;
create policy "docente gestiona sus planes de area" on area_plans
  for all using (docente_id = auth.uid());

-- El rector puede LEER los planes de área de los docentes de su institución
-- (sección 5: "Ver contenidos creados por sus docentes").
drop policy if exists "rector lee planes de area de su institucion" on area_plans;
create policy "rector lee planes de area de su institucion" on area_plans
  for select using (
    institucion_id = (select institucion_id from perfiles p where p.id = auth.uid() and p.rol in ('rector','superadmin'))
  );

-- ---------- STORAGE: documentos (planes de área, formatos, etc.) ----------
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false) -- privado: se accede por URL firmada, no público
on conflict (id) do nothing;

-- Cada docente solo puede subir/leer/borrar dentro de su propia carpeta
-- {docente_id}/... dentro del bucket "documentos".
drop policy if exists "docente gestiona sus documentos" on storage.objects;
create policy "docente gestiona sus documentos" on storage.objects
  for all using (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'documentos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
