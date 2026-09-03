-- Corrige 4 tablas que quedaron con RLS activado pero sin ninguna
-- política (bug real, detectado por el advisor de seguridad de Supabase
-- al aplicar esta migración en un proyecto real: sin política, el acceso
-- queda bloqueado por defecto para todos, incluido el dueño legítimo).

drop policy if exists "docente gestiona su fila" on docentes;
create policy "docente gestiona su fila" on docentes
  for all using (perfil_id = auth.uid());

drop policy if exists "rector lee docentes de su institucion" on docentes;
create policy "rector lee docentes de su institucion" on docentes
  for select using (
    exists (
      select 1 from perfiles p1
      join perfiles p2 on p2.institucion_id = p1.institucion_id
      where p1.id = auth.uid() and p1.rol in ('rector','superadmin') and p2.id = docentes.perfil_id
    )
  );

drop policy if exists "rector gestiona su fila" on rectores;
create policy "rector gestiona su fila" on rectores
  for all using (perfil_id = auth.uid());

drop policy if exists "superadmin gestiona rectores" on rectores;
create policy "superadmin gestiona rectores" on rectores
  for all using (
    exists (select 1 from perfiles p where p.id = auth.uid() and p.rol = 'superadmin')
  );

drop policy if exists "asignaturas misma institucion" on asignaturas;
create policy "asignaturas misma institucion" on asignaturas
  for all using (
    exists (
      select 1 from areas a
      where a.id = asignaturas.area_id
        and a.institucion_id = (select institucion_id from perfiles where id = auth.uid())
    )
  );

drop policy if exists "rector lee auditoria de su institucion" on auditoria;
create policy "rector lee auditoria de su institucion" on auditoria
  for select using (
    institucion_id = (select institucion_id from perfiles p where p.id = auth.uid() and p.rol in ('rector','superadmin'))
  );

drop policy if exists "usuario inserta su propia auditoria" on auditoria;
create policy "usuario inserta su propia auditoria" on auditoria
  for insert with check (usuario_id = auth.uid());
