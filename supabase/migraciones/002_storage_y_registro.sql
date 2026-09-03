-- ============================================================
-- AULA360 — Fase 1: Storage para fotos, y ajustes para registro
-- ============================================================

-- Bucket para fotos de perfil (docentes/rectores). Público de lectura
-- porque son avatares, pero solo el dueño puede subir/reemplazar la suya.
insert into storage.buckets (id, name, public)
values ('fotos-perfil', 'fotos-perfil', true)
on conflict (id) do nothing;

drop policy if exists "lectura publica fotos perfil" on storage.objects;
create policy "lectura publica fotos perfil" on storage.objects
  for select using (bucket_id = 'fotos-perfil');

drop policy if exists "usuario sube su propia foto" on storage.objects;
create policy "usuario sube su propia foto" on storage.objects
  for insert with check (
    bucket_id = 'fotos-perfil'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "usuario reemplaza su propia foto" on storage.objects;
create policy "usuario reemplaza su propia foto" on storage.objects
  for update using (
    bucket_id = 'fotos-perfil'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Permitir que cualquier usuario autenticado pueda crear su propio perfil
-- la primera vez que se registra (INSERT), no solo leerlo/actualizarlo.
drop policy if exists "usuario crea su propio perfil" on perfiles;
create policy "usuario crea su propio perfil" on perfiles
  for insert with check (id = auth.uid());

-- Una institución activa debe poder ser LEÍDA por cualquier usuario
-- autenticado (para el combo "selecciona tu institución" en el registro),
-- sin exponer instituciones inactivas.
drop policy if exists "instituciones activas visibles para registro" on instituciones;
create policy "instituciones activas visibles para registro" on instituciones
  for select using (activa = true);

-- El rector puede crear/editar grados, grupos y estudiantes de SU institución
-- (ya cubierto por la policy "for all" de la migración 001, se deja explícito
-- aquí que superadmin también puede gestionar instituciones).
drop policy if exists "superadmin gestiona instituciones" on instituciones;
create policy "superadmin gestiona instituciones" on instituciones
  for all using (
    exists (select 1 from perfiles p where p.id = auth.uid() and p.rol = 'superadmin')
  );

-- El rector puede ver los docentes de su propia institución (para el listado
-- del panel de rector, sección 5).
drop policy if exists "rector ve docentes de su institucion" on perfiles;
create policy "rector ve docentes de su institucion" on perfiles
  for select using (
    institucion_id = (select institucion_id from perfiles p where p.id = auth.uid() and p.rol in ('rector','superadmin'))
  );
