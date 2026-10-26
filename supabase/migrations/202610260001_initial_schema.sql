-- Prime Assets Nigeria initial schema and browser security policies.
-- Apply from Supabase SQL Editor after creating the project.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users (id) on delete set null
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  whatsapp_phone text null check (whatsapp_phone is null or whatsapp_phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text null check (email is null or length(email) <= 254),
  bio text null check (bio is null or length(bio) <= 3000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and length(slug) <= 180),
  title text not null check (length(btrim(title)) between 1 and 180),
  description text not null check (length(btrim(description)) between 1 and 20000),
  category text not null check (category in ('residential', 'land', 'commercial', 'other')),
  price numeric(14,2) null check (price is null or price >= 0),
  hide_price boolean not null default false,
  currency text not null default 'NGN' check (currency = 'NGN'),
  status text not null default 'active' check (status in ('active', 'closed', 'coming_soon')),
  expected_date date null,
  featured boolean not null default false,
  published boolean not null default false,
  state text not null check (length(btrim(state)) between 1 and 100),
  city text null check (city is null or length(city) <= 120),
  neighbourhood text null check (neighbourhood is null or length(neighbourhood) <= 160),
  address text null check (address is null or length(address) <= 500),
  measurement_value numeric(14,3) null check (measurement_value is null or measurement_value >= 0),
  measurement_unit text null check (measurement_unit is null or measurement_unit in ('sqm', 'acres', 'hectares')),
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  features text[] not null default '{}',
  agent_id uuid null references public.agents (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_coming_soon_date check (status <> 'coming_soon' or expected_date is not null),
  constraint properties_measurement_pair check ((measurement_value is null) = (measurement_unit is null))
);

create table public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null check (length(btrim(alt_text)) between 1 and 300),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_cover boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index property_images_one_cover_per_property
  on public.property_images (property_id) where is_cover;
create index property_images_order_idx on public.property_images (property_id, sort_order);

create table public.site_settings (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{0,63}$'),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users (id) on delete set null
);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  contact text not null check (length(btrim(contact)) between 3 and 254),
  subject text not null check (length(btrim(subject)) between 1 and 160),
  message text not null check (length(btrim(message)) between 1 and 5000),
  property_id uuid null references public.properties (id) on delete set null,
  status text not null default 'new' check (status in ('new', 'in_progress', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Public projection masks exact prices when requested. Browser roles receive no
-- direct SELECT privilege on the source table, so hidden values are not leaked
-- in API responses or price filters.
create view public.public_properties with (security_barrier = true) as
select
  id, slug, title, description, category,
  case when hide_price then null::numeric else price end as price,
  hide_price, currency, status, expected_date, featured, published,
  state, city, neighbourhood, address, measurement_value, measurement_unit,
  attributes, features, agent_id, created_at, updated_at
from public.properties
where published = true;

create index properties_public_newest_idx on public.properties (published, status, created_at desc);
create index properties_category_idx on public.properties (category);
create index properties_state_city_idx on public.properties (state, city);
create index properties_price_idx on public.properties (price);
create index properties_agent_idx on public.properties (agent_id);
create index properties_title_search_idx on public.properties using gin (title extensions.gin_trgm_ops);
create index enquiries_status_created_idx on public.enquiries (status, created_at desc);
create index enquiries_property_idx on public.enquiries (property_id);
create index agents_active_idx on public.agents (is_active);

create trigger agents_set_updated_at before update on public.agents
  for each row execute function public.set_updated_at();
create trigger properties_set_updated_at before update on public.properties
  for each row execute function public.set_updated_at();
create trigger property_images_set_updated_at before update on public.property_images
  for each row execute function public.set_updated_at();
create trigger site_settings_set_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();
create trigger enquiries_set_updated_at before update on public.enquiries
  for each row execute function public.set_updated_at();

-- Validate Coming Soon dates on insert/status/date edits. If a date later passes,
-- unrelated edits remain possible and status is never changed automatically.
create or replace function public.validate_expected_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'coming_soon'
     and new.expected_date is not null
     and new.expected_date <= (now() at time zone 'Africa/Lagos')::date
     and (tg_op = 'INSERT' or new.status is distinct from old.status or new.expected_date is distinct from old.expected_date) then
    raise exception 'Expected date must be in the future when saving a Coming Soon status.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger properties_validate_expected_date before insert or update on public.properties
  for each row execute function public.validate_expected_date();

-- SECURITY DEFINER avoids recursive RLS lookup on admins. Function owner is the
-- migration role; fixed search_path and qualified relation are intentional.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins a where a.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

alter table public.admins enable row level security;
alter table public.agents enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.site_settings enable row level security;
alter table public.enquiries enable row level security;

-- Authenticated sessions are not automatically administrators.
create policy admins_select_admins on public.admins
  for select to authenticated using ((select public.is_admin()));
-- Membership changes are performed through trusted Supabase Dashboard SQL.

create policy agents_public_read_linked on public.agents
  for select to anon, authenticated
  using (is_active and exists (
    select 1 from public.public_properties p where p.agent_id = agents.id
  ));
create policy agents_admin_all on public.agents
  for all to authenticated using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy properties_public_read_published on public.properties
  for select to anon using (published);
create policy properties_admin_all on public.properties
  for all to authenticated using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy property_images_public_read_published on public.property_images
  for select to anon, authenticated using (
    exists (select 1 from public.public_properties p where p.id = property_id)
  );
create policy property_images_admin_all on public.property_images
  for all to authenticated using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy site_settings_public_read_allowlist on public.site_settings
  for select to anon, authenticated using (key in (
    'brand_name', 'logo_url', 'company_email', 'company_phone', 'whatsapp_phone',
    'address', 'social_links', 'business_hours', 'about_text', 'contact_intro', 'default_meta_description'
  ));
create policy site_settings_admin_all on public.site_settings
  for all to authenticated using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy enquiries_public_insert on public.enquiries
  for insert to anon, authenticated with check (
    status = 'new'
    and (property_id is null or exists (
      select 1 from public.public_properties p where p.id = property_id
    ))
  );
create policy enquiries_admin_read on public.enquiries
  for select to authenticated using ((select public.is_admin()));
create policy enquiries_admin_update on public.enquiries
  for update to authenticated using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Revoke broad default table grants, then grant only operations with policies.
revoke all on public.admins, public.agents, public.properties, public.property_images,
  public.site_settings, public.enquiries from anon, authenticated;
grant select on public.admins to authenticated;
grant select, insert, update, delete on public.agents, public.properties,
  public.property_images, public.site_settings to authenticated;
grant select on public.agents, public.property_images, public.site_settings to anon;
grant select on public.public_properties to anon, authenticated;
grant select, update on public.enquiries to authenticated;
grant insert (name, contact, subject, message, property_id) on public.enquiries to authenticated, anon;

-- Public listing images are served via Supabase's public object endpoint. Anyone
-- who knows an object's URL can fetch it; do not upload private documents here.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy listing_images_admin_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'listing-images'
    and (select public.is_admin())
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and exists (select 1 from public.properties p where p.id::text = (storage.foldername(name))[1])
  );
create policy listing_images_admin_update on storage.objects
  for update to authenticated using (
    bucket_id = 'listing-images' and (select public.is_admin())
  ) with check (
    bucket_id = 'listing-images'
    and (select public.is_admin())
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and exists (select 1 from public.properties p where p.id::text = (storage.foldername(name))[1])
  );
create policy listing_images_admin_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'listing-images' and (select public.is_admin())
  );

-- No seed inventory or contact data: settings are intentionally empty until the
-- client provides verified information. Bootstrap first admin manually:
-- insert into public.admins (user_id) values ('<auth-user-uuid>');
