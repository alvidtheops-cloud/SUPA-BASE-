# Prime Assets Nigeria — Phase 1 Setup Notes

## Verified service and cost snapshot

Checked against official provider pages on 26 October 2026. Re-check immediately before purchase and deployment; plans, quotas, and terms change. USD prices exclude taxes, domain cost, and any currency/card conversion fees.

| Service | Current official information | Planning decision |
|---|---|---|
| Supabase Free | $0; 2 active free projects; 500 MB database quota, 1 GB file storage, 5 GB egress, 50,000 MAU listed. Free projects may pause after 7 days of low activity. | Fine for setup/acceptance work. Not a dependable production availability plan for a commercial inventory site because of pausing, limited support and quota. |
| Supabase Pro | Starts at $25/month; includes one default compute instance, 8 GB disk per project, 250 GB egress and 100 GB storage in current pricing table. Daily backups retained 7 days. Additional compute/projects and overages may add cost. | Budget at least $25/month for the production organization/project as displayed, then estimate actual image, egress, compute and backup needs. Database backups do not back up Storage objects. |
| Netlify Free | Current pricing lists $0 and 300 usage credits/month. Netlify's own Free-plan announcement explicitly says commercial projects may be deployed. Its current subscription terms reserve broad discretion to disable/remove free-tier projects without notice and provide no service-level commitment; usage limits can pause a site. | **Best verified free-tier candidate in this review** for a small static commercial site, if the client accepts no SLA and usage-related suspension risk. Recheck current terms and credit usage before launch; hosting isn't guaranteed free forever. |
| Cloudflare Pages Free | Official Pages docs list 500 builds/month, one concurrent build, up to 100 custom domains/project and 20,000 files/site. Cloudflare's Free plan is described as for personal or hobby projects, so the reviewed sources do not establish it as appropriate for this commercial client. | Not selected as the commercial free-tier recommendation. Revisit if Cloudflare confirms eligibility for this use or the client chooses a paid plan. |
| Domain | Registrar and extension dependent; annual renewal varies. | `[DOMAIN]` is a placeholder. Confirm ownership, renewal contact, DNS control, and renewal budget with client. |
| Transactional email | Provider-dependent; Resend or another service needs an account, verified sending domain, credentials kept server-side, and an Edge Function/webhook. | External configuration. Price and sending limits need verification when provider is selected. |
| Backups | Supabase Free does not include managed daily backups; docs recommend manual regular exports. Pro includes daily backups for 7 days. Storage objects are not included in database backups. | Set up and test database export plus separate Storage object backup/restore procedure before production. Paid plan does not replace restore drills. |

**Production risk:** Supabase Free can pause a low-activity project after a week, taking the site data API/auth/storage offline until resumed. A public website should not depend on someone remembering to unpause it. Upgrade before launch if continuity matters; Pro removes inactivity pausing and includes daily DB backups, but Storage backup, availability objectives, support needs and actual quotas still need explicit planning. Never promise any free tier is permanent.

### Official sources

- [Supabase pricing](https://supabase.com/pricing)
- [Supabase billing and plan quotas](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Supabase free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Supabase database backups](https://supabase.com/docs/guides/platform/backups)
- [Netlify pricing](https://www.netlify.com/pricing/)
- [Netlify announcement explicitly allowing commercial projects on Free](https://www.netlify.com/blog/introducing-netlify-free-plan/)
- [Netlify self-serve subscription agreement](https://www.netlify.com/legal/self-serve-subscription-agreement)
- [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
- [Cloudflare plan positioning](https://www.cloudflare.com/plans/)

## Beginner setup workflow (later implementation phases)

1. Install VS Code and open the project folder. Install a static preview extension such as Live Server if desired. The site is plain files and needs no `npm install` or build command.
2. Create a Supabase account and project under the client's ownership. Save the project URL and public anon/publishable key as placeholders until configuration. Keep the database password, service-role/secret key, and email provider secret out of source code.
3. Apply checked-in SQL migration files from Supabase SQL Editor in order (the migration files will be written in Phase 2). Review each migration before applying it. Do not paste secrets into migrations.
4. Disable public Auth sign-up. Create the first admin user in Supabase Auth and add its Auth UUID to the `admins` table through trusted dashboard SQL after migrations exist.
5. Configure Storage bucket limits and policies from the reviewed migration/policy plan. Test reads/uploads/deletes as anonymous, non-admin, and admin users.
6. Set only `SUPABASE_URL` and the public anon key in the frontend configuration placeholder file. These values are public, but should still be the correct project values. Never place privileged credentials there.
7. Run locally with Live Server or another static HTTP server (ES modules often fail from `file://`). Test loading, login, policy denial and CRUD using real Supabase rows. Do not use fake saves or localStorage as a database.
8. Deploy static files to a host whose current terms allow this commercial use. Set the custom domain and HTTPS. Configure CSP/security headers for the exact required origins. A static host does not provide email sending or trusted Turnstile verification by itself.
9. Before launch, verify quotas, Supabase project billing plan, domain renewal, backups, Storage backup/restore, host limits, logs and alert ownership with the client.

For the remaining manual checks, use [the phased acceptance checklist](./acceptance-checklist.md). A recommended host header template is provided in [`_headers.example`](../_headers.example); replace the Supabase host placeholder and verify headers in the deployed response before enabling it.

After the client supplies the production domain and Supabase configuration, an optional dependency-free Node helper can generate a sitemap from published database rows: set `SITE_ORIGIN`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`, then run `node scripts/generate-sitemap.mjs`. This helper is only for deployment content generation; serving and running the site still requires no Node/npm. The sitemap includes query-string listing URLs; JS-only listing content can still have limited previews, so per-listing prerendering remains a separate static-site enhancement if search/social indexing needs it.

## Placeholder register

| Setting | Placeholder | Source of final value |
|---|---|---|
| Brand logo | `[LOGO]` | Client-approved logo asset |
| Domain | `[DOMAIN]` | Client-owned registered domain |
| Company email | `[EMAIL]` | Client-approved business inbox |
| Agent/company phones | `[PHONE_E164]` | Client-confirmed E.164 numbers |
| Supabase project URL | `[SUPABASE_URL]` | Project API settings |
| Supabase public anon key | `[SUPABASE_ANON_KEY]` | Project API settings; public client key only |
| First admin email | `[INITIAL_ADMIN_EMAIL]` | Client-selected operator |

Do not publish placeholder values as real company contact details or represent sample listings as verified inventory.

## Common setup issues to explain during implementation

- Blank ES module page opened from `file://`: serve it over local HTTP with Live Server.
- Supabase permission error: inspect RLS and policy role/operation; never “fix” it by exposing the service-role key.
- Auth succeeds but dashboard denies data: confirm the user's Auth UUID is present in `admins` and policy function works.
- Image upload succeeds but page cannot display it: check object path, bucket visibility policy, published listing policy and URL generation.
- Emails or Turnstile checks do not work: these require trusted external configuration and server-side verification; a browser-only secret/token check is insufficient.
- Supabase project stopped responding after inactivity: check Free plan pausing and restore from the dashboard; production should use a plan that does not pause.
