-- ============================================================
-- Fase 6: extracción real del plan de área con IA.
-- Un plan de área cubre VARIOS temas a lo largo del periodo — esta
-- tabla guarda cada tema por separado, con sus propios referentes de
-- calidad, para que el Generador de Clase pueda buscar el tema exacto
-- que el docente escribe y sacar de ahí sus DBA/estándares reales.
-- ============================================================

create table if not exists area_plan_temas (
  id uuid primary key default gen_random_uuid(),
  area_plan_id uuid not null references area_plans(id) on delete cascade,
  orden int not null default 0,
  tema text not null,
  competencias text,
  estandares text,
  derechos_basicos_aprendizaje text,
  evidencias text,
  objetivos text,
  creado_en timestamptz not null default now()
);

create index if not exists idx_area_plan_temas_plan on area_plan_temas(area_plan_id);
create index if not exists idx_area_plan_temas_tema on area_plan_temas(tema);

alter table area_plan_temas enable row level security;

drop policy if exists "docente gestiona temas de sus planes de area" on area_plan_temas;
create policy "docente gestiona temas de sus planes de area" on area_plan_temas
  for all using (
    exists (select 1 from area_plans ap where ap.id = area_plan_id and ap.docente_id = (select auth.uid()))
  );

drop policy if exists "rector lee temas de planes de area de su institucion" on area_plan_temas;
create policy "rector lee temas de planes de area de su institucion" on area_plan_temas
  for select using (
    exists (
      select 1 from area_plans ap
      where ap.id = area_plan_id and ap.institucion_id = privado.institucion_de((select auth.uid()))
    )
  );
