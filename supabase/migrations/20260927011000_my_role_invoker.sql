-- my_role() pasa a SECURITY INVOKER: cada cuenta solo puede leer su propia fila de app.users.
alter table app.users enable row level security;
grant select on app.users to authenticated;
create policy "ver_mi_cuenta" on app.users for select to authenticated using (user_id = auth.uid());

create or replace function public.my_role() returns text
language sql stable security invoker set search_path = '' as
$$ select role from app.users where user_id = auth.uid() $$;
