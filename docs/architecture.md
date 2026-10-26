# Prime Assets Nigeria — Architecture (Phase 1)

This document defines the production architecture and database/security design. It is a plan for Phase 2 migrations and later frontend work; no schema or backend has been deployed yet.

## Product and stack

- Public pages and admin screens: semantic HTML, CSS, and vanilla JavaScript ES modules. No framework, build step, package manager, or npm runtime dependency.
- Data, password authentication, and image object storage: Supabase Postgres, Auth, and Storage. Browser access uses the official `supabase-js` library from a pinned CDN release.
- Hosting: static hosting with commercial use explicitly permitted by the current applicable terms. Review those terms again before launch.
- Business conversion: browse inventory and contact an agent. There are no online payments.
- The public anon key and Supabase project URL are public client configuration. Never put a service-role key, database password, email provider secret, or other privileged secret in browser code or a public repository.

Vanilla JS keeps the delivered site small, inspectable, and dependency-light. It also means routing, form state, validation, DOM updates, and admin interactions need deliberate hand-written structure and maintenance. Supabase provides managed database/auth/storage services and client SDKs, but browser clients are untrusted: RLS, constraints, and Storage policies enforce security. UI route guards are for navigation convenience only.

## Page and folder map

```text
/
├── index.html
├── properties.html
├── property.html
├── about.html
├── contact.html
├── admin/
│   ├── login.html
│   └── dashboard.html
├── css/
│   ├── base.css
│   ├── components.css
│   └── pages/
├── js/
│   ├── config.js                 # public Supabase URL / anon key placeholders only
│   ├── supabaseClient.js
│   ├── auth.js
│   ├── validation.js
│   ├── format.js
│   ├── whatsapp.js
│   ├── api/
│   └── ui/
├── assets/
├── docs/
└── supabase/
    └── migrations/
```

`property.html?slug=...` reads a real published row and its associated images/agent. Site identity, logo, email, phones, address, socials, and hours come from public rows in `site_settings`; deployable fallback identity/contact details must be clearly marked as placeholders and not represented as verified company information. Inventory examples, if ever added, must be labelled `SAMPLE` and never pass as verified availability.

Search filters are reflected in URL parameters and query the database with pagination. For display, format Naira with `Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' })`. Locations retain state, city, neighbourhood, and address separately. Use `attributes jsonb` for category-specific details so land does not receive bedroom fields. Store/validate Nigerian phone contacts in E.164 form, e.g. `[PHONE_E164]`.

Images use lazy loading on public cards and details, explicit width/height or aspect ratio, descriptive alt text, and client-side resizing before upload. Client resizing is a performance aid, not a security boundary; validate file size and MIME type at the upload policy/API boundary too.

## Relational schema proposal

All IDs are UUIDs generated in Postgres. Timestamps are `timestamptz` in UTC. Tables that change have a shared `updated_at` trigger. Public/admin access below is enforced by RLS, not by page visibility.

### `admins`

- `user_id uuid primary key references auth.users(id) on delete cascade`
- `created_at timestamptz not null default now()`
- `created_by uuid null references auth.users(id) on delete set null`
- One membership row per administrator. No public insert/update/delete. Existing administrators manage membership via a secured invitation/bootstrap process; first administrator is created manually in Supabase Auth then inserted by trusted dashboard SQL.
- RLS: admins may read the roster. Membership writes only by admins (and initial trusted SQL). Do not expose a route to public sign-up.

### `agents`

- `id uuid primary key`; `name text not null`; `phone text not null`; `whatsapp_phone text null`; `email text null`; `bio text null`; `is_active boolean not null default true`; timestamps.
- Check phone fields when present with `^\\+[1-9][0-9]{7,14}$`; validate user-facing values before write as well.
- Index active agents. Public select is limited to active agents referenced by published inventory; admins manage all rows.
- `properties.agent_id` references agent with `on delete set null`, preserving property records if an agent is removed.

### `properties`

- `id uuid primary key`; `slug text not null unique`; `title text not null`; `description text not null`; `category text not null check in ('residential','land','commercial','other')`.
- `price numeric(14,2) null check (price is null or price >= 0)`; `hide_price boolean not null default false`; `currency text not null default 'NGN' check (currency = 'NGN')`.
- `status text not null check in ('active','closed','coming_soon')`; `expected_date date null`; `featured boolean not null default false`; `published boolean not null default false`.
- `state text not null`; `city text null`; `neighbourhood text null`; `address text null`.
- `measurement_value numeric(14,3) null check (measurement_value is null or measurement_value >= 0)`; `measurement_unit text null check in ('sqm','acres','hectares')`.
- `attributes jsonb not null default '{}'::jsonb`; `features text[] not null default '{}'`; `agent_id uuid null references agents(id) on delete set null`; timestamps.
- Check constraint: `status = 'coming_soon'` requires `expected_date is not null`; other statuses may have no expected date. A future-date check is performed on every admin save in UI and ideally through a database write function/trigger comparing against current date. A static CHECK on `current_date` is unsuitable because it does not re-evaluate as time passes. Once the date passes, keep status `coming_soon`; public display says “Expected date passed, contact us” and dashboard flags it. Never auto-promote to active.
- Price may be null when `hide_price = true`; UI shows “Contact for price”. Do not infer a hidden value as public price.
- Public browser access uses `public.public_properties`, a security-barrier view that masks `price` to null whenever `hide_price` is true. Browser roles do not have direct SELECT privilege on the source table; price filters therefore cannot expose a hidden amount.
- Index unique slug; `(published, status, created_at desc)`; category; state/city; price; agent ID; and a GIN trigram index for title `ILIKE` keyword search.
- Public select only when `published = true`; admins select all and write all. A closed or coming-soon listing is visually distinct and unavailable for enquiry/WhatsApp as required.

### `property_images`

- `id uuid primary key`; `property_id uuid not null references properties(id) on delete cascade`; `storage_path text not null unique`; `alt_text text not null`; `sort_order integer not null default 0 check (sort_order >= 0)`; `is_cover boolean not null default false`; `created_at`, `updated_at`.
- `(property_id, sort_order)` index; partial unique index on `property_id where is_cover` so each listing has at most one cover.
- Public select only if parent property is published; admins manage rows. Property deletion cascades database rows, but Storage objects do not cascade automatically: admin workflow must delete objects via Storage API or a trusted cleanup function before/with row deletion and report failures.

### `site_settings`

- `key text primary key`; `value jsonb not null`; `updated_at timestamptz not null default now()`; `updated_by uuid null references auth.users(id) on delete set null`.
- Public-readable keys must be allowlisted (brand name, logo path, company email/phones, address, social links, hours, service/SEO text). No secrets or private operational settings go here.
- Admin-only insert/update/delete. Public reads only allowlisted public keys.

### `enquiries`

- `id uuid primary key`; `name text not null`; `contact text not null`; `subject text not null`; `message text not null`; `property_id uuid null references properties(id) on delete set null`.
- `status text not null default 'new' check in ('new','in_progress','closed')`; `created_at timestamptz not null default now()`; `updated_at timestamptz null`; optional `source text` with bounded values if useful.
- Database check constraints enforce non-empty trimmed values and bounded lengths (initial limits: name 1–120, contact 3–254, subject 1–160, message 1–5000). Application validation complements but does not replace these checks. Store contact as free text because the form may accept email or phone.
- Index `(status, created_at desc)` and `property_id`.
- Public insert only; no public select/update/delete. Admins read and update status. Property deletion preserves the enquiry and sets reference null.

## RLS, functions, and Storage boundary

Enable RLS on every application table and grant only necessary table privileges. Define `public.is_admin()` as a narrowly scoped `SECURITY DEFINER` function that checks `auth.uid()` against `public.admins`, with a fixed safe `search_path`, schema-qualified references, controlled execute grants, and a non-login owner. Review for policy recursion and privilege escalation in Phase 2. `auth.uid()` alone does not confer admin rights.

Policy intent:

- Anonymous/authenticated visitors: select published rows through the price-masking `public_properties` view; select images whose parent is published; select active agents needed by published properties; select allowlisted public settings; insert bounded enquiries only.
- Admin users: select all rows and perform explicitly required insert/update/delete on properties, images, agents, settings and enquiries; manage admin membership through a separately reviewed policy/workflow.
- All other anonymous/authenticated access is denied by default. Test policies using actual anon and non-admin accounts, not only the admin UI.

Storage uses a dedicated `listing-images` public bucket with an 8 MB object limit and image MIME allowlist. Public bucket URLs can be fetched by anyone who knows the URL, including for unpublished records, so only public listing photos may be stored there. Upload/update/delete are admin-only, and write policies validate the object path against an existing property. Enforce MIME type and size in the bucket and upload code. RLS does not protect an exposed service-role key; that key must never ship to the browser.

## Authentication and operational security

Disable Supabase Auth public sign-ups. Create the first Auth user manually, then add that user's UUID to `admins` using trusted Supabase SQL. Invite subsequent admins through Supabase and add each to `admins`. Login is email/password; admin screens check session on load and offer logout, but RLS is the real authorization gate. No hardcoded credentials.

The browser must render untrusted database/user content using `textContent`, DOM APIs, and safe URL validation; never concatenate user strings into `innerHTML`. Add CSP and security headers through host configuration after enumerating the pinned Supabase/CDN origins and any image hosts. Enquiry honeypot is supplementary, not a rate limiter. Rate limiting should use a trusted Edge Function (for example, a per-IP and per-contact sliding window backed by a database table); this and Cloudflare Turnstile server-side verification are explicitly external configuration and are not implemented in the browser-only client. Transactional email (for example, Resend) also needs an Edge Function/webhook and provider/domain setup. Do not claim a message was emailed without a confirmed provider response.

## SEO and status behavior

JS-rendered details set document title, meta description, and Open Graph tags from loaded data, but crawlers/social scrapers may not execute the page JavaScript. Phase 7 should add a lightweight sitemap generated from published rows and assess static per-listing HTML prerendering as the strongest static-host mitigation without a framework. A Coming Soon date is future-validated when saved; after it passes, the status stays Coming Soon, gets a dashboard warning, and is described honestly on the public listing. Closed listings are unmistakably closed and have no enquiry or WhatsApp CTA.
