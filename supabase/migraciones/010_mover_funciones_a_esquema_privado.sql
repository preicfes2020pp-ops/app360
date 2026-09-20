-- Corrige alerta real: rol_de() e institucion_de() quedaron expuestas
-- como endpoints públicos de RPC (/rest/v1/rpc/rol_de, etc.), permitiendo
-- consultar el rol/institución de CUALQUIER usuario por su ID.
-- Solución: moverlas a un esquema que PostgREST no expone por defecto
-- (solo "public" se expone vía API), pero que las políticas RLS sí
-- pueden seguir usando con su nombre completo.

create schema if not exists privado;

create or replace function privado.rol_de(usuario_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select rol from perfiles where id = usuario_id;
$$;

create or replace function privado.institucion_de(usuario_id uuid)
returns uuid
language sql
security definer
set search_path = public
as $$
  select institucion_id from perfiles where id = usuario_id;
$$;

-- Las políticas ahora usan las versiones privadas.
drop policy if exists "superadmin todo perfiles" on perfiles;
create policy "superadmin todo perfiles" on perfiles
  for all using (privado.rol_de((select auth.uid())) = 'superadmin');

drop policy if exists "rector ve docentes de su institucion" on perfiles;
create policy "rector ve docentes de su institucion" on perfiles
  for select using (
    institucion_id = privado.institucion_de((select auth.uid()))
    and privado.rol_de((select auth.uid())) in ('rector','superadmin')
  );

-- Elimina las versiones públicas viejas (ya no las usa ninguna política).
drop function if exists public.rol_de(uuid);
drop function if exists public.institucion_de(uuid);
