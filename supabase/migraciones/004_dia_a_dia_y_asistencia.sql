-- ============================================================
-- AULA360 — Fase 3: Día a día y Asistencia (secciones 15-17)
-- ============================================================

-- ---------- DÍA A DÍA (planeación diaria) ----------
create table if not exists daily_plans (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id) on delete cascade,
  docente_id uuid not null references perfiles(id) on delete cascade,
  asignacion_id uuid not null references asignaciones_docente(id) on delete cascade,
  fecha date not null,
  tema text not null,
  objetivo text,
  competencia text,
  estandar text,
  actividades text,
  recursos text,
  evaluacion text,
  tarea text,
  observaciones text,
  creado_en timestamptz not null default now()
);

create index if not exists idx_daily_plans_docente on daily_plans(docente_id);
alter table daily_plans enable row level security;

drop policy if exists "docente gestiona su dia a dia" on daily_plans;
create policy "docente gestiona su dia a dia" on daily_plans
  for all using (docente_id = auth.uid());

drop policy if exists "rector lee dia a dia de su institucion" on daily_plans;
create policy "rector lee dia a dia de su institucion" on daily_plans
  for select using (
    institucion_id = (select institucion_id from perfiles p where p.id = auth.uid() and p.rol in ('rector','superadmin'))
  );

-- ---------- ASISTENCIA (sección 16-17) ----------
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id) on delete cascade,
  docente_id uuid not null references perfiles(id) on delete cascade,
  asignacion_id uuid not null references asignaciones_docente(id) on delete cascade,
  fecha date not null,
  creado_en timestamptz not null default now(),
  unique(asignacion_id, fecha)
);

create table if not exists attendance_estudiante (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references attendance(id) on delete cascade,
  estudiante_id uuid not null references estudiantes(id) on delete cascade,
  estado text not null check (estado in ('presente','ausente','excusa','retardo')),
  observaciones text,
  unique(attendance_id, estudiante_id)
);

alter table attendance enable row level security;
alter table attendance_estudiante enable row level security;

drop policy if exists "docente gestiona su asistencia" on attendance;
create policy "docente gestiona su asistencia" on attendance
  for all using (docente_id = auth.uid());

drop policy if exists "rector lee asistencia de su institucion" on attendance;
create policy "rector lee asistencia de su institucion" on attendance
  for select using (
    institucion_id = (select institucion_id from perfiles p where p.id = auth.uid() and p.rol in ('rector','superadmin'))
  );

drop policy if exists "docente gestiona el detalle de su asistencia" on attendance_estudiante;
create policy "docente gestiona el detalle de su asistencia" on attendance_estudiante
  for all using (
    exists (select 1 from attendance a where a.id = attendance_id and a.docente_id = auth.uid())
  );

drop policy if exists "rector lee detalle de asistencia de su institucion" on attendance_estudiante;
create policy "rector lee detalle de asistencia de su institucion" on attendance_estudiante
  for select using (
    exists (
      select 1 from attendance a
      join perfiles p on p.id = auth.uid()
      where a.id = attendance_id and p.rol in ('rector','superadmin') and a.institucion_id = p.institucion_id
    )
  );
