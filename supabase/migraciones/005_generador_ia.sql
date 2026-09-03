-- ============================================================
-- AULA360 — Fase 4: Generador Pedagógico IA (secciones 3, 18-19, 52)
-- ============================================================

create table if not exists ai_generaciones (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id) on delete cascade,
  docente_id uuid not null references perfiles(id) on delete cascade,
  asignacion_id uuid not null references asignaciones_docente(id) on delete cascade,
  tema text not null,
  tiempo_clase_minutos int not null,
  nivel_dificultad text not null check (nivel_dificultad in ('basico','intermedio','avanzado')),
  contenido jsonb not null,           -- última versión generada (ClaseGenerada)
  estado text not null default 'pendiente_aprobacion'
    check (estado in ('pendiente_aprobacion','aprobado')),
  -- Historial de intercambios docente↔IA: cada mejora solicitada queda
  -- registrada, nunca se sobrescribe en silencio (sección 3 y 51).
  historial jsonb not null default '[]'::jsonb,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists idx_ai_generaciones_docente on ai_generaciones(docente_id);
alter table ai_generaciones enable row level security;

drop policy if exists "docente gestiona sus generaciones ia" on ai_generaciones;
create policy "docente gestiona sus generaciones ia" on ai_generaciones
  for all using (docente_id = auth.uid());

drop policy if exists "rector lee generaciones ia de su institucion" on ai_generaciones;
create policy "rector lee generaciones ia de su institucion" on ai_generaciones
  for select using (
    institucion_id = (select institucion_id from perfiles p where p.id = auth.uid() and p.rol in ('rector','superadmin'))
  );

-- Bucket para imágenes de apoyo generadas por IA (Gemini).
insert into storage.buckets (id, name, public)
values ('imagenes-ia', 'imagenes-ia', true)
on conflict (id) do nothing;

drop policy if exists "lectura publica imagenes ia" on storage.objects;
create policy "lectura publica imagenes ia" on storage.objects
  for select using (bucket_id = 'imagenes-ia');

drop policy if exists "docente sube sus imagenes ia" on storage.objects;
create policy "docente sube sus imagenes ia" on storage.objects
  for insert with check (
    bucket_id = 'imagenes-ia'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
