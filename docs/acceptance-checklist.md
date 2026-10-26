# Acceptance checklist

Use this checklist with a real Supabase project and separate anonymous, authenticated non-admin, and administrator browser sessions. The repository does not contain a Supabase URL/key or business data, so live database acceptance requires client configuration.

## Phase 2 — schema, auth, Storage, RLS

- [ ] Migration applies once without SQL errors.
- [ ] Public sign-up is disabled; first admin is created manually and added by UUID.
- [ ] Anonymous can read published properties, public settings and related public agents/images only.
- [ ] A published property with `hide_price = true` returns `price: null` through the public view and cannot be inferred through price filters.
- [ ] Anonymous cannot read drafts, enquiries, admin roster or write listings/settings/agents/images.
- [ ] Anonymous can insert bounded enquiries only with default `new` status and a null/published property.
- [ ] Authenticated non-admin is denied admin operations; admin can manage intended tables.
- [ ] Invalid E.164 contacts, negative prices, invalid status, invalid slug and past Coming Soon date changes are rejected.
- [ ] Storage upload rejects disallowed MIME/oversize files; anonymous and non-admin upload/delete are denied.

## Phase 3 — public layout/home

- [ ] Header/footer and homepage render at mobile and desktop widths; menu is keyboard operable.
- [ ] Homepage displays real featured/recent published rows or honest empty states.
- [ ] No placeholder contact details or unlabelled sample inventory appear.
- [ ] Brand, logo and contact settings update public chrome without source edits.

## Phase 4 — search, cards, details

- [ ] Category/state/city/title/price/status filters combine, paginate and survive refresh/share via URL.
- [ ] Clear filters resets values and query parameters; no-match state is clear.
- [ ] Sort order matches newest/lowest/highest requested behavior.
- [ ] Listing page loads by slug, shows only relevant JSON attributes, gallery, price visibility, agent and related records.
- [ ] Closed and Coming Soon cards/details are unmistakable; neither has enquiry/WhatsApp actions.
- [ ] Active listing WhatsApp message names the property and is URL encoded.

## Phase 5 — admin inventory

- [ ] Dashboard totals match stored inventory; overdue Coming Soon dates are flagged and never auto-promoted.
- [ ] Admin can create/edit/publish/unpublish/delete listings and agents; changes persist after refresh and sign-out.
- [ ] Upload validates/compresses images; cover selection and ordering persist; deleting a listing removes Storage objects and rows.
- [ ] Site settings persist and are visible publicly without code changes.
- [ ] Small-screen dashboard remains usable; destructive actions require confirmation.

## Phase 6 — enquiries

- [ ] Public forms validate and store records; public cannot read them; admin can read/update status.
- [ ] Honeypot is present. Actual rate limiting, Turnstile verification and email notifications require a configured Edge Function/provider and are not considered live until verified.
- [ ] UI does not claim an email was sent.

## Phases 7–8 — accessibility, SEO, performance, security, deployment

- [ ] Keyboard/focus and screen-reader labels checked; reduced-motion respected; contrast reviewed.
- [ ] Images are lazy-loaded with dimensions and alt text; no untrusted values reach `innerHTML`.
- [ ] Dynamic title/description/Open Graph behavior checked; sitemap and per-listing prerender mitigation decided for actual domain.
- [ ] CSP and other security headers tested on chosen host with exact project/CDN origins.
- [ ] Anon/non-admin/admin RLS tests and end-to-end flows pass in deployed staging.
- [ ] Backup restore (including separate Storage objects) is exercised before production launch.
- [ ] Hosting free-tier commercial terms, quotas, support and client ownership are confirmed immediately before launch.
