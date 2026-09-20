-- ============================================================
-- Módulo de Horarios: franjas horarias, horario institucional,
-- horario por docente, y horarios emergentes.
-- ============================================================

-- ---------- FRANJAS HORARIAS ----------
-- El rector define los bloques de tiempo de su institución.
create table if not exists franjas_horarias (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id) on delete cascade,
  nombre text not null,        -- ej: "1ra hora"
  hora_inicio time not null,
  hora_fin time not null,
  orden int not null,
  creado_en timestamptz not null default now(),
  unique(institucion_id, orden)
);

alter table franjas_horarias enable row level security;

drop policy if exists "franjas misma institucion" on franjas_horarias;
create policy "franjas misma institucion" on franjas_horarias
  for all using (institucion_id = privado.institucion_de((select auth.uid())));

-- ---------- HORARIO NORMAL ----------
-- Una fila = una clase real: qué asignación (docente+grado+grupo+área+
-- asignatura) ocupa qué día y franja. dia_semana: 1=lunes ... 6=sábado.
create table if not exists horario_clases (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id) on delete cascade,
  asignacion_id uuid not null references asignaciones_docente(id) on delete cascade,
  dia_semana int not null check (dia_semana between 1 and 6),
  franja_id uuid not null references franjas_horarias(id) on delete cascade,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  -- Un grupo no puede tener 2 clases en la misma franja/día.
  unique(dia_semana, franja_id, asignacion_id)
);

create index if not exists idx_horario_clases_institucion on horario_clases(institucion_id);
create index if not exists idx_horario_clases_asignacion on horario_clases(asignacion_id);
create index if not exists idx_horario_clases_franja on horario_clases(franja_id);

alter table horario_clases enable row level security;

drop policy if exists "rector gestiona horario de su institucion" on horario_clases;
create policy "rector gestiona horario de su institucion" on horario_clases
  for all using (
    institucion_id = privado.institucion_de((select auth.uid()))
    and privado.rol_de((select auth.uid())) in ('rector','superadmin')
  );

drop policy if exists "docente lee su propio horario" on horario_clases;
create policy "docente lee su propio horario" on horario_clases
  for select using (
    exists (
      select 1 from asignaciones_docente ad
      where ad.id = asignacion_id and ad.docente_id = (select auth.uid())
    )
  );

-- ---------- HORARIOS EMERGENTES ----------
-- Un horario temporal aparte: no reemplaza el normal en la base de
-- datos, coexiste con causa, fecha de inicio y duración en días.
create table if not exists horarios_emergentes (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id) on delete cascade,
  creado_por uuid not null references perfiles(id),
  motivo text not null,
  fecha_inicio date not null,
  duracion_dias int not null check (duracion_dias > 0),
  creado_en timestamptz not null default now()
);

create index if not exists idx_horarios_emergentes_institucion on horarios_emergentes(institucion_id);

alter table horarios_emergentes enable row level security;

drop policy if exists "rector gestiona horarios emergentes" on horarios_emergentes;
create policy "rector gestiona horarios emergentes" on horarios_emergentes
  for all using (
    institucion_id = privado.institucion_de((select auth.uid()))
    and privado.rol_de((select auth.uid())) in ('rector','superadmin')
  );

drop policy if exists "docente lee horarios emergentes de su institucion" on horarios_emergentes;
create policy "docente lee horarios emergentes de su institucion" on horarios_emergentes
  for select using (institucion_id = privado.institucion_de((select auth.uid())));

-- Las clases dentro de un horario emergente (misma forma que horario_clases).
create table if not exists horario_emergente_clases (
  id uuid primary key default gen_random_uuid(),
  horario_emergente_id uuid not null references horarios_emergentes(id) on delete cascade,
  asignacion_id uuid not null references asignaciones_docente(id) on delete cascade,
  dia_semana int not null check (dia_semana between 1 and 6),
  franja_id uuid not null references franjas_horarias(id) on delete cascade,
  unique(horario_emergente_id, dia_semana, franja_id, asignacion_id)
);

create index if not exists idx_hec_horario on horario_emergente_clases(horario_emergente_id);

alter table horario_emergente_clases enable row level security;

drop policy if exists "rector gestiona clases de horarios emergentes" on horario_emergente_clases;
create policy "rector gestiona clases de horarios emergentes" on horario_emergente_clases
  for all using (
    exists (
      select 1 from horarios_emergentes he
      where he.id = horario_emergente_id
        and he.institucion_id = privado.institucion_de((select auth.uid()))
        and privado.rol_de((select auth.uid())) in ('rector','superadmin')
    )
  );

drop policy if exists "docente lee clases de horarios emergentes de su institucion" on horario_emergente_clases;
create policy "docente lee clases de horarios emergentes de su institucion" on horario_emergente_clases
  for select using (
    exists (
      select 1 from horarios_emergentes he
      where he.id = horario_emergente_id
        and he.institucion_id = privado.institucion_de((select auth.uid()))
    )
  );
