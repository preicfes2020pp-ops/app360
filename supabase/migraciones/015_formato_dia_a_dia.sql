-- ============================================================
-- Fase 7: el docente sube su formato Word de día a día UNA VEZ,
-- con marcadores de texto ({TEMA}, {OBJETIVO}, etc.), y la plataforma
-- lo vuelve a llenar automáticamente cada vez que hay una planeación
-- nueva, en vez de usar un formato genérico.
-- ============================================================

create table if not exists formatos_dia_a_dia (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id) on delete cascade,
  docente_id uuid not null references perfiles(id) on delete cascade,
  archivo_url text not null,
  archivo_nombre text not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create index if not exists idx_formatos_dia_a_dia_docente on formatos_dia_a_dia(docente_id);

alter table formatos_dia_a_dia enable row level security;

drop policy if exists "docente gestiona su formato de dia a dia" on formatos_dia_a_dia;
create policy "docente gestiona su formato de dia a dia" on formatos_dia_a_dia
  for all using (docente_id = (select auth.uid()));

drop policy if exists "rector lee formatos de dia a dia de su institucion" on formatos_dia_a_dia;
create policy "rector lee formatos de dia a dia de su institucion" on formatos_dia_a_dia
  for select using (institucion_id = privado.institucion_de((select auth.uid())));
