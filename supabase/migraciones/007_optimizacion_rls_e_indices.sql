-- Reescribe las políticas RLS envolviendo auth.uid() en (select auth.uid())
-- para que se evalúe una sola vez por consulta, no por fila (recomendación
-- oficial de Supabase — detectado por el advisor de rendimiento). Agrega
-- también índices a llaves foráneas que no los tenían.

drop policy if exists "misma institucion" on instituciones;
create policy "misma institucion" on instituciones
  for select using (
    id = (select institucion_id from perfiles where id = (select auth.uid()))
    or exists (select 1 from perfiles p where p.id = (select auth.uid()) and p.rol = 'superadmin')
  );

drop policy if exists "superadmin gestiona instituciones" on instituciones;
create policy "superadmin gestiona instituciones" on instituciones
  for all using (exists (select 1 from perfiles p where p.id = (select auth.uid()) and p.rol = 'superadmin'));

drop policy if exists "perfil propio" on perfiles;
create policy "perfil propio" on perfiles for select using (id = (select auth.uid()));

drop policy if exists "perfil propio update" on perfiles;
create policy "perfil propio update" on perfiles for update using (id = (select auth.uid()));

drop policy if exists "superadmin todo perfiles" on perfiles;
create policy "superadmin todo perfiles" on perfiles
  for all using (exists (select 1 from perfiles p where p.id = (select auth.uid()) and p.rol = 'superadmin'));

drop policy if exists "usuario crea su propio perfil" on perfiles;
create policy "usuario crea su propio perfil" on perfiles
  for insert with check (id = (select auth.uid()));

drop policy if exists "rector ve docentes de su institucion" on perfiles;
create policy "rector ve docentes de su institucion" on perfiles
  for select using (
    institucion_id = (select institucion_id from perfiles p where p.id = (select auth.uid()) and p.rol in ('rector','superadmin'))
  );

drop policy if exists "docente gestiona su fila" on docentes;
create policy "docente gestiona su fila" on docentes for all using (perfil_id = (select auth.uid()));

drop policy if exists "rector lee docentes de su institucion" on docentes;
create policy "rector lee docentes de su institucion" on docentes
  for select using (
    exists (
      select 1 from perfiles p1 join perfiles p2 on p2.institucion_id = p1.institucion_id
      where p1.id = (select auth.uid()) and p1.rol in ('rector','superadmin') and p2.id = docentes.perfil_id
    )
  );

drop policy if exists "rector gestiona su fila" on rectores;
create policy "rector gestiona su fila" on rectores for all using (perfil_id = (select auth.uid()));

drop policy if exists "superadmin gestiona rectores" on rectores;
create policy "superadmin gestiona rectores" on rectores
  for all using (exists (select 1 from perfiles p where p.id = (select auth.uid()) and p.rol = 'superadmin'));

drop policy if exists "grados misma institucion" on grados;
create policy "grados misma institucion" on grados
  for all using (institucion_id = (select institucion_id from perfiles where id = (select auth.uid())));

drop policy if exists "grupos misma institucion" on grupos;
create policy "grupos misma institucion" on grupos
  for all using (institucion_id = (select institucion_id from perfiles where id = (select auth.uid())));

drop policy if exists "areas misma institucion" on areas;
create policy "areas misma institucion" on areas
  for all using (institucion_id = (select institucion_id from perfiles where id = (select auth.uid())));

drop policy if exists "asignaturas misma institucion" on asignaturas;
create policy "asignaturas misma institucion" on asignaturas
  for all using (
    exists (select 1 from areas a where a.id = asignaturas.area_id
      and a.institucion_id = (select institucion_id from perfiles where id = (select auth.uid())))
  );

drop policy if exists "estudiantes misma institucion" on estudiantes;
create policy "estudiantes misma institucion" on estudiantes
  for all using (institucion_id = (select institucion_id from perfiles where id = (select auth.uid())));

drop policy if exists "asignaciones docente propio o rector" on asignaciones_docente;
create policy "asignaciones docente propio o rector" on asignaciones_docente
  for select using (
    docente_id = (select auth.uid())
    or institucion_id = (select institucion_id from perfiles p where p.id = (select auth.uid()) and p.rol in ('rector','superadmin'))
  );

drop policy if exists "rector crea asignaciones de su institucion" on asignaciones_docente;
create policy "rector crea asignaciones de su institucion" on asignaciones_docente
  for insert with check (
    institucion_id = (select institucion_id from perfiles p where p.id = (select auth.uid()) and p.rol in ('rector','superadmin'))
  );

drop policy if exists "rector borra asignaciones de su institucion" on asignaciones_docente;
create policy "rector borra asignaciones de su institucion" on asignaciones_docente
  for delete using (
    institucion_id = (select institucion_id from perfiles p where p.id = (select auth.uid()) and p.rol in ('rector','superadmin'))
  );

drop policy if exists "rector lee auditoria de su institucion" on auditoria;
create policy "rector lee auditoria de su institucion" on auditoria
  for select using (
    institucion_id = (select institucion_id from perfiles p where p.id = (select auth.uid()) and p.rol in ('rector','superadmin'))
  );

drop policy if exists "usuario inserta su propia auditoria" on auditoria;
create policy "usuario inserta su propia auditoria" on auditoria
  for insert with check (usuario_id = (select auth.uid()));

drop policy if exists "docente gestiona sus planes de area" on area_plans;
create policy "docente gestiona sus planes de area" on area_plans for all using (docente_id = (select auth.uid()));

drop policy if exists "rector lee planes de area de su institucion" on area_plans;
create policy "rector lee planes de area de su institucion" on area_plans
  for select using (
    institucion_id = (select institucion_id from perfiles p where p.id = (select auth.uid()) and p.rol in ('rector','superadmin'))
  );

drop policy if exists "docente gestiona su dia a dia" on daily_plans;
create policy "docente gestiona su dia a dia" on daily_plans for all using (docente_id = (select auth.uid()));

drop policy if exists "rector lee dia a dia de su institucion" on daily_plans;
create policy "rector lee dia a dia de su institucion" on daily_plans
  for select using (
    institucion_id = (select institucion_id from perfiles p where p.id = (select auth.uid()) and p.rol in ('rector','superadmin'))
  );

drop policy if exists "docente gestiona su asistencia" on attendance;
create policy "docente gestiona su asistencia" on attendance for all using (docente_id = (select auth.uid()));

drop policy if exists "rector lee asistencia de su institucion" on attendance;
create policy "rector lee asistencia de su institucion" on attendance
  for select using (
    institucion_id = (select institucion_id from perfiles p where p.id = (select auth.uid()) and p.rol in ('rector','superadmin'))
  );

drop policy if exists "docente gestiona el detalle de su asistencia" on attendance_estudiante;
create policy "docente gestiona el detalle de su asistencia" on attendance_estudiante
  for all using (exists (select 1 from attendance a where a.id = attendance_id and a.docente_id = (select auth.uid())));

drop policy if exists "rector lee detalle de asistencia de su institucion" on attendance_estudiante;
create policy "rector lee detalle de asistencia de su institucion" on attendance_estudiante
  for select using (
    exists (
      select 1 from attendance a join perfiles p on p.id = (select auth.uid())
      where a.id = attendance_id and p.rol in ('rector','superadmin') and a.institucion_id = p.institucion_id
    )
  );

drop policy if exists "docente gestiona sus generaciones ia" on ai_generaciones;
create policy "docente gestiona sus generaciones ia" on ai_generaciones for all using (docente_id = (select auth.uid()));

drop policy if exists "rector lee generaciones ia de su institucion" on ai_generaciones;
create policy "rector lee generaciones ia de su institucion" on ai_generaciones
  for select using (
    institucion_id = (select institucion_id from perfiles p where p.id = (select auth.uid()) and p.rol in ('rector','superadmin'))
  );

create index if not exists idx_areas_institucion on areas(institucion_id);
create index if not exists idx_asignaturas_area on asignaturas(area_id);
create index if not exists idx_grupos_institucion on grupos(institucion_id);
create index if not exists idx_grupos_grado on grupos(grado_id);
create index if not exists idx_estudiantes_institucion on estudiantes(institucion_id);
create index if not exists idx_asignaciones_institucion on asignaciones_docente(institucion_id);
create index if not exists idx_asignaciones_grado on asignaciones_docente(grado_id);
create index if not exists idx_asignaciones_grupo on asignaciones_docente(grupo_id);
create index if not exists idx_asignaciones_area on asignaciones_docente(area_id);
create index if not exists idx_asignaciones_asignatura on asignaciones_docente(asignatura_id);
create index if not exists idx_auditoria_institucion on auditoria(institucion_id);
create index if not exists idx_auditoria_usuario on auditoria(usuario_id);
create index if not exists idx_area_plans_institucion on area_plans(institucion_id);
create index if not exists idx_area_plans_area on area_plans(area_id);
create index if not exists idx_area_plans_grado on area_plans(grado_id);
create index if not exists idx_daily_plans_institucion on daily_plans(institucion_id);
create index if not exists idx_daily_plans_asignacion on daily_plans(asignacion_id);
create index if not exists idx_attendance_institucion on attendance(institucion_id);
create index if not exists idx_attendance_docente on attendance(docente_id);
create index if not exists idx_attendance_estudiante_estudiante on attendance_estudiante(estudiante_id);
create index if not exists idx_ai_generaciones_institucion on ai_generaciones(institucion_id);
create index if not exists idx_ai_generaciones_asignacion on ai_generaciones(asignacion_id);
