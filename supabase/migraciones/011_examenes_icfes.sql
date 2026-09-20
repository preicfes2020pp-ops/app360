-- ============================================================
-- AULA360 — Fase 5: Exámenes tipo ICFES (secciones 20-27)
-- ============================================================

-- Banco de preguntas (sección 24): cada pregunta se guarda una sola vez
-- y puede reutilizarse en varios exámenes.
create table if not exists preguntas (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id) on delete cascade,
  docente_id uuid not null references perfiles(id) on delete cascade,
  area_id uuid not null references areas(id),
  grado_id uuid not null references grados(id),
  tema text not null,
  competencia text,
  tipo_texto text not null check (tipo_texto in ('continuo','discontinuo','mixto')),
  contexto text,                          -- el texto/situación que acompaña la pregunta
  enunciado text not null,
  opciones jsonb not null,                -- [{"id":"a","texto":"..."}, ...] 4 opciones
  respuesta_correcta text not null,       -- id de la opción correcta (ej: "b")
  explicacion text not null,
  nivel_dificultad text not null check (nivel_dificultad in ('basico','intermedio','avanzado')),
  -- Diseño inspirado en IRT (sección 23): estos campos quedan NULL hasta que
  -- existan suficientes respuestas reales para estimarlos estadísticamente.
  -- NUNCA se debe mostrar un valor aquí como si fuera una calibración real.
  irt_dificultad numeric,
  irt_discriminacion numeric,
  irt_adivinacion numeric,
  veces_usada int not null default 0,
  creado_en timestamptz not null default now()
);

create index if not exists idx_preguntas_docente on preguntas(docente_id);
create index if not exists idx_preguntas_institucion on preguntas(institucion_id);
create index if not exists idx_preguntas_area on preguntas(area_id);
create index if not exists idx_preguntas_grado on preguntas(grado_id);
create index if not exists idx_preguntas_tema on preguntas(tema);

alter table preguntas enable row level security;

drop policy if exists "docente gestiona sus preguntas" on preguntas;
create policy "docente gestiona sus preguntas" on preguntas
  for all using (docente_id = (select auth.uid()));

drop policy if exists "rector lee preguntas de su institucion" on preguntas;
create policy "rector lee preguntas de su institucion" on preguntas
  for select using (institucion_id = privado.institucion_de((select auth.uid())));

-- Exámenes (secciones 20-21, 25): agrupa preguntas del banco en una versión
-- concreta (A, B, C o macro) para una clase.
create table if not exists examenes (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id) on delete cascade,
  docente_id uuid not null references perfiles(id) on delete cascade,
  asignacion_id uuid not null references asignaciones_docente(id) on delete cascade,
  tema text not null,                     -- para examen macro: temas separados por coma
  version text not null check (version in ('A','B','C','macro')),
  tipo text not null default 'tema' check (tipo in ('tema','macro')),
  estado text not null default 'pendiente_aprobacion' check (estado in ('pendiente_aprobacion','aprobado')),
  intentos_validacion int not null default 1,
  creado_en timestamptz not null default now()
);

create index if not exists idx_examenes_docente on examenes(docente_id);
create index if not exists idx_examenes_asignacion on examenes(asignacion_id);
create index if not exists idx_examenes_institucion on examenes(institucion_id);

alter table examenes enable row level security;

drop policy if exists "docente gestiona sus examenes" on examenes;
create policy "docente gestiona sus examenes" on examenes
  for all using (docente_id = (select auth.uid()));

drop policy if exists "rector lee examenes de su institucion" on examenes;
create policy "rector lee examenes de su institucion" on examenes
  for select using (institucion_id = privado.institucion_de((select auth.uid())));

-- Relación examen <-> preguntas, con el orden en que aparecen (sección 25:
-- en el examen macro los temas van intercalados, no en bloques).
create table if not exists examen_preguntas (
  id uuid primary key default gen_random_uuid(),
  examen_id uuid not null references examenes(id) on delete cascade,
  pregunta_id uuid not null references preguntas(id) on delete cascade,
  orden int not null,
  unique(examen_id, orden)
);

create index if not exists idx_examen_preguntas_examen on examen_preguntas(examen_id);
create index if not exists idx_examen_preguntas_pregunta on examen_preguntas(pregunta_id);

alter table examen_preguntas enable row level security;

drop policy if exists "docente gestiona items de sus examenes" on examen_preguntas;
create policy "docente gestiona items de sus examenes" on examen_preguntas
  for all using (
    exists (select 1 from examenes e where e.id = examen_id and e.docente_id = (select auth.uid()))
  );

drop policy if exists "rector lee items de examenes de su institucion" on examen_preguntas;
create policy "rector lee items de examenes de su institucion" on examen_preguntas
  for select using (
    exists (
      select 1 from examenes e
      where e.id = examen_id and e.institucion_id = privado.institucion_de((select auth.uid()))
    )
  );
