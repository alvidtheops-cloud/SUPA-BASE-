# Prime Assets Nigeria

Production real-estate listings site using plain HTML/CSS/vanilla JavaScript and Supabase.

Start with [the architecture and schema plan](./docs/architecture.md) and [beginner setup and service notes](./docs/setup.md).

All business identity and contact values remain unconfigured until confirmed by the client. The site currently contains no sample inventory. Do not publish sample inventory as verified listings. The browser may contain only Supabase's public URL and anon key; never add a service-role key or other secret to frontend code.

## Local setup

1. Apply [the initial Supabase migration](./supabase/migrations/202610260001_initial_schema.sql) in the Supabase SQL Editor.
2. Enable email sign-ups in Supabase Auth. Public registration is open; every registered account receives full administrator access to all listings, agents, enquiries, and site settings.
3. Apply [the open-registration migration](./supabase/migrations/202610260002_open_admin_registration.sql) in the Supabase SQL Editor.
4. Confirm `js/config.js` contains the correct Supabase project URL and public anon/publishable key. Never place a service-role or secret key there.
5. Open this folder in VS Code and serve it over HTTP with Live Server. No npm install or bundler is required.
6. Log in at `admin/login.html`, configure verified company settings and agents, then add listings.

Read [the setup notes](./docs/setup.md) and [architecture/security plan](./docs/architecture.md) before deploying. Email notification, trusted spam rate limiting/Turnstile verification, custom domain, and production backups require external setup.

## Deploy to Netlify from GitHub

This is a static site; Netlify needs no build command. Set the publish directory to `.` (the repository root). Add this folder to a GitHub repository, then in Netlify choose **Add new site → Import an existing project** and connect that repository. Netlify will deploy each push to the selected branch. The active `_headers` file supplies basic browser security headers; update it if the Supabase project URL changes.
