// Optional deployment helper. The static site itself does not require Node or npm.
// Run with SITE_ORIGIN, SUPABASE_URL and the public SUPABASE_ANON_KEY set.
import { writeFile } from 'node:fs/promises';

const origin = process.env.SITE_ORIGIN;
const supabaseUrl = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
if (!origin || !supabaseUrl || !anonKey) {
  throw new Error('Set SITE_ORIGIN, SUPABASE_URL and SUPABASE_ANON_KEY before generating the sitemap.');
}

const site = new URL(origin);
if (!['http:', 'https:'].includes(site.protocol) || site.protocol !== 'https:') {
  throw new Error('SITE_ORIGIN must be an HTTPS origin, for example https://www.example.com.');
}
const api = new URL('/rest/v1/public_properties', supabaseUrl);
api.searchParams.set('select', 'slug,updated_at');
api.searchParams.set('published', 'eq.true');
api.searchParams.set('order', 'updated_at.desc');
const response = await fetch(api, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
if (!response.ok) throw new Error(`Supabase sitemap query failed (${response.status}). Check public view access and URL/key configuration.`);
const properties = await response.json();

const staticPages = ['', 'properties.html', 'about.html', 'contact.html'];
const urls = staticPages.map((path) => ({ loc: new URL(path, site).href }));
for (const property of properties) {
  if (!property.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(property.slug)) continue;
  urls.push({
    loc: `${new URL('property.html', site).href}?slug=${encodeURIComponent(property.slug)}`,
    lastmod: property.updated_at,
  });
}
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map(({ loc, lastmod }) => `  <url><loc>${escapeXml(loc)}</loc>${lastmod ? `<lastmod>${escapeXml(new Date(lastmod).toISOString())}</lastmod>` : ''}</url>`).join('\n') +
  '\n</urlset>\n';
await writeFile(new URL('../sitemap.xml', import.meta.url), xml, 'utf8');
process.stdout.write(`Wrote sitemap.xml with ${urls.length} URLs.\n`);

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}
