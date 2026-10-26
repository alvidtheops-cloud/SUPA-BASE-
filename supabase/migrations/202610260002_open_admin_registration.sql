-- Public self-registration for administrators.
-- WARNING: every registered account receives full administrator permissions.
-- Apply only when open, global admin access is intentional.

drop policy if exists admins_self_register on public.admins;
create policy admins_self_register on public.admins
  for insert to authenticated
  with check (user_id = (select auth.uid()));

grant insert on public.admins to authenticated;
