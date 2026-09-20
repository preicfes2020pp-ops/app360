alter table asignaciones_docente
  add column if not exists horas_semanales int not null default 2 check (horas_semanales between 1 and 20);
