-- Corrige "infinite recursion detected in policy for relation perfiles"
-- (error real de Postgres 42P17, encontrado al probar el primer login real).
-- Causa: dos políticas de la tabla `perfiles` consultaban la propia tabla
-- `perfiles` dentro de su condición. Postgres evalúa TODAS las políticas
-- de una tabla en cada consulta, así que esa subconsulta reactivaba las
-- mismas políticas una y otra vez.
--
-- Solución: funciones SECURITY DEFINER, propiedad del dueño de la tabla
-- (que ignora RLS), para consultar el rol/institución de un usuario sin
-- volver a pasar por las políticas de `perfiles`.

create or replace function public.rol_de(usuario_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select rol from perfiles where id = usuario_id;
$$;

create or replace function public.institucion_de(usuario_id uuid)
returns uuid
language sql
security definer
set search_path = public
as $$
  select institucion_id from perfiles where id = usuario_id;
$$;

-- Reescribe las 2 políticas de `perfiles` que se autorreferenciaban.
drop policy if exists "superadmin todo perfiles" on perfiles;
create policy "superadmin todo perfiles" on perfiles
  for all using (public.rol_de((select auth.uid())) = 'superadmin');

drop policy if exists "rector ve docentes de su institucion" on perfiles;
create policy "rector ve docentes de su institucion" on perfiles
  for select using (
    institucion_id = public.institucion_de((select auth.uid()))
    and public.rol_de((select auth.uid())) in ('rector','superadmin')
  );
