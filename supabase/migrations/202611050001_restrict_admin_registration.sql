-- Admin accounts must be created and approved outside the public website.
-- Existing Auth users must be explicitly added to public.admins by a trusted administrator.

drop policy if exists admins_self_register on public.admins;
revoke insert on public.admins from authenticated;
