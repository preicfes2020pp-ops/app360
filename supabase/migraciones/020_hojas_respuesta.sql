-- Hojas de respuesta subidas por el docente (foto o PDF escaneado) y su
-- calificación automática. "respuestas" guarda, por cada pregunta del
-- examen (en su columna "orden"), la letra que detectó Gemini o null si
-- el estudiante la dejó sin marcar o marcó más de una opción.

create table if not exists hojas_respuesta (
  id uuid primary key default gen_random_uuid(),
  examen_id uuid not null references examenes(id) on delete cascade,
  estudiante_id uuid not null references estudiantes(id) on delete cascade,
  archivo_path text not null,
  respuestas jsonb not null default '[]'::jsonb,
  correctas int,
  incorrectas int,
  sin_marcar int,
  puntaje_porcentaje numeric(5,2),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'calificada', 'error')),
  error_detalle text,
  subido_por uuid references perfiles(id),
  calificado_en timestamptz,
  creado_en timestamptz not null default now(),
  unique (examen_id, estudiante_id)
);

create index if not exists idx_hojas_respuesta_examen on hojas_respuesta(examen_id);
create index if not exists idx_hojas_respuesta_estudiante on hojas_respuesta(estudiante_id);

alter table hojas_respuesta enable row level security;

drop policy if exists "docente gestiona hojas de sus examenes" on hojas_respuesta;
create policy "docente gestiona hojas de sus examenes" on hojas_respuesta
  for all
  using (
    exists (select 1 from examenes e where e.id = examen_id and e.docente_id = (select auth.uid()))
  )
  with check (
    exists (select 1 from examenes e where e.id = examen_id and e.docente_id = (select auth.uid()))
  );

drop policy if exists "rector lee hojas de examenes de su institucion" on hojas_respuesta;
create policy "rector lee hojas de examenes de su institucion" on hojas_respuesta
  for select
  using (
    exists (
      select 1 from examenes e
      where e.id = examen_id and e.institucion_id = privado.institucion_de((select auth.uid()))
    )
  );

-- Storage: bucket privado para las hojas de respuesta subidas.
insert into storage.buckets (id, name, public)
values ('hojas-respuesta', 'hojas-respuesta', false)
on conflict (id) do nothing;

-- Convención de ruta: {examen_id}/{estudiante_id}.{ext}
drop policy if exists "docentes gestionan hojas de respuesta" on storage.objects;
create policy "docentes gestionan hojas de respuesta" on storage.objects
  for all
  using (
    bucket_id = 'hojas-respuesta'
    and privado.rol_de((select auth.uid())) = any (array['docente'::text, 'rector'::text, 'coordinador'::text, 'superadmin'::text])
  )
  with check (
    bucket_id = 'hojas-respuesta'
    and privado.rol_de((select auth.uid())) = any (array['docente'::text, 'rector'::text, 'coordinador'::text, 'superadmin'::text])
  );
