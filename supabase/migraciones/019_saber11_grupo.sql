-- Permite asociar cada tanda de resultados de Saber 11 subida a un grupo
-- de grado once específico, para que el rector/coordinador pueda filtrar
-- el análisis por grupo (ej. "11-A" vs "11-B") además de por año.

alter table saber11_resultados_individuales
  add column if not exists grupo_id uuid references grupos(id) on delete set null;

create index if not exists idx_saber11_ind_grupo on saber11_resultados_individuales(grupo_id);
