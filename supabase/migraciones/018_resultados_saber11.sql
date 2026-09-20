-- ============================================================
-- AULA360 — Resultados reales de Pruebas Saber 11 (ICFES)
-- ============================================================
-- Permite a rectores y coordinadores subir los PDF individuales de
-- resultados de cada estudiante (disponibles pocas semanas después del
-- examen) y, un año después, el reporte agregado oficial del ICFES para
-- la institución. Con los individuales, AULA360 calcula su propio
-- análisis institucional sin depender de que llegue el reporte oficial.

-- ---------- Resultados individuales (uno por estudiante por año) ----------
create table if not exists saber11_resultados_individuales (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id) on delete cascade,
  estudiante_id uuid references estudiantes(id) on delete set null,

  nombre_completo text not null,
  tipo_documento text,
  numero_documento text not null,
  numero_registro text,
  anio int not null,
  fecha_aplicacion date,
  fecha_publicacion date,
  establecimiento_educativo text,

  puntaje_global int not null,
  percentil_global_nacional int,
  percentil_global_etnico int,

  lectura_critica_puntaje int,
  lectura_critica_percentil_nacional int,
  lectura_critica_percentil_etnico int,

  matematicas_puntaje int,
  matematicas_percentil_nacional int,
  matematicas_percentil_etnico int,

  sociales_ciudadanas_puntaje int,
  sociales_ciudadanas_percentil_nacional int,
  sociales_ciudadanas_percentil_etnico int,

  ciencias_naturales_puntaje int,
  ciencias_naturales_percentil_nacional int,
  ciencias_naturales_percentil_etnico int,

  ingles_puntaje int,
  ingles_percentil_nacional int,
  ingles_percentil_etnico int,

  pdf_path text not null,
  subido_por uuid references perfiles(id),
  creado_en timestamptz not null default now(),

  -- Un mismo estudiante no puede tener dos resultados guardados para el
  -- mismo año dentro de la misma institución (volver a subir su PDF
  -- actualiza el registro, no lo duplica).
  unique (institucion_id, numero_documento, anio)
);

create index if not exists idx_saber11_ind_institucion on saber11_resultados_individuales(institucion_id);
create index if not exists idx_saber11_ind_anio on saber11_resultados_individuales(anio);
create index if not exists idx_saber11_ind_estudiante on saber11_resultados_individuales(estudiante_id);

alter table saber11_resultados_individuales enable row level security;

drop policy if exists "rector y coordinador gestionan resultados individuales" on saber11_resultados_individuales;
create policy "rector y coordinador gestionan resultados individuales" on saber11_resultados_individuales
  for all
  using (
    institucion_id = privado.institucion_de((select auth.uid()))
    and privado.rol_de((select auth.uid())) = any (array['rector'::text, 'coordinador'::text, 'superadmin'::text])
  )
  with check (
    institucion_id = privado.institucion_de((select auth.uid()))
    and privado.rol_de((select auth.uid())) = any (array['rector'::text, 'coordinador'::text, 'superadmin'::text])
  );

-- ---------- Reportes agregados oficiales del ICFES (uno por año) ----------
create table if not exists saber11_reportes_agregados (
  id uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id) on delete cascade,
  anio int not null,
  pdf_path text not null,
  subido_por uuid references perfiles(id),
  creado_en timestamptz not null default now(),
  unique (institucion_id, anio)
);

create index if not exists idx_saber11_agg_institucion on saber11_reportes_agregados(institucion_id);

alter table saber11_reportes_agregados enable row level security;

drop policy if exists "rector y coordinador gestionan reportes agregados" on saber11_reportes_agregados;
create policy "rector y coordinador gestionan reportes agregados" on saber11_reportes_agregados
  for all
  using (
    institucion_id = privado.institucion_de((select auth.uid()))
    and privado.rol_de((select auth.uid())) = any (array['rector'::text, 'coordinador'::text, 'superadmin'::text])
  )
  with check (
    institucion_id = privado.institucion_de((select auth.uid()))
    and privado.rol_de((select auth.uid())) = any (array['rector'::text, 'coordinador'::text, 'superadmin'::text])
  );

-- ---------- Storage: bucket privado para los PDF ----------
-- Privado (no público): son datos personales de estudiantes (nombre,
-- documento, etnia reportada), no deben quedar accesibles por URL directa.
insert into storage.buckets (id, name, public)
values ('saber11-pdfs', 'saber11-pdfs', false)
on conflict (id) do nothing;

-- Convención de rutas: {institucion_id}/individuales/{anio}/{archivo}.pdf
--                       {institucion_id}/agregados/{anio}.pdf
-- El primer segmento de la ruta siempre es el institucion_id, así que la
-- política solo compara ese segmento contra la institución del usuario.

drop policy if exists "rector y coordinador gestionan pdfs saber11 de su institucion" on storage.objects;
create policy "rector y coordinador gestionan pdfs saber11 de su institucion" on storage.objects
  for all
  using (
    bucket_id = 'saber11-pdfs'
    and (storage.foldername(name))[1] = (privado.institucion_de((select auth.uid())))::text
    and privado.rol_de((select auth.uid())) = any (array['rector'::text, 'coordinador'::text, 'superadmin'::text])
  )
  with check (
    bucket_id = 'saber11-pdfs'
    and (storage.foldername(name))[1] = (privado.institucion_de((select auth.uid())))::text
    and privado.rol_de((select auth.uid())) = any (array['rector'::text, 'coordinador'::text, 'superadmin'::text])
  );
