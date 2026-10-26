import { getSettings } from '../api/public.js';

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export async function renderChrome() {
  const header = document.querySelector('[data-site-header]');
  const footer = document.querySelector('[data-site-footer]');
  const brandName = 'Prime Assets Nigeria';
  if (header) {
    const skip=el('a','skip-link','Skip to main content');skip.href='#main-content';header.append(skip);
    const wrap = el('div', 'container nav-wrap');
    const brand = el('a', 'brand'); brand.href = 'index.html'; brand.setAttribute('aria-label', `${brandName} home`);
    const mark = el('span', 'brand-mark', 'PA'); mark.setAttribute('aria-hidden', 'true'); brand.append(mark, el('span', '', brandName));
    const toggle = el('button', 'nav-toggle', 'Menu'); toggle.type = 'button'; toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-controls', 'primary-nav');
    const nav = el('nav', 'nav-links'); nav.id = 'primary-nav'; nav.setAttribute('aria-label', 'Main navigation');
    const links = [['Home','index.html'],['Properties','properties.html'],['About','about.html'],['Contact','contact.html']];
    for (const [label, href] of links) { const a = el('a','',label); a.href = href; if (location.pathname.endsWith(href)) a.setAttribute('aria-current','page'); nav.append(a); }
    toggle.addEventListener('click', () => { const open = nav.classList.toggle('open'); toggle.setAttribute('aria-expanded', String(open)); });
    wrap.append(brand, toggle, nav); header.append(wrap);
  }
  if (footer) {
    const container = el('div','container'); const grid = el('div','footer-grid');
    const about = el('div'); const footerBrand=el('h2','',brandName);footerBrand.dataset.brandName='';about.append(footerBrand,el('p','muted','Real estate and asset listings across Nigeria. Contact our team to confirm current availability and details.'));
    const explore = el('div'); explore.append(el('h3','','Explore')); const ul = el('ul');
    for (const [name, href] of [['Browse properties','properties.html'],['About us','about.html'],['Contact','contact.html'],['Admin sign in','admin/login.html']]) { const li=el('li'); const a=el('a','',name); a.href=href; li.append(a); ul.append(li); }
    explore.append(ul);
    const contact = el('div'); contact.append(el('h3','','Contact details'));
    const details = el('p','muted','Company details are being configured.'); details.dataset.footerDetails=''; contact.append(details);
    const social=el('div');social.dataset.socialLinks='';contact.append(social);
    grid.append(about,explore,contact); const copy=el('div','copyright',`© ${new Date().getFullYear()} ${brandName}`);copy.dataset.copyright='';container.append(grid,copy); footer.append(container);
  }
  try {
    const settings = await getSettings();
    const brandName = asText(settings.brand_name) || 'Prime Assets Nigeria';
    document.querySelectorAll('[data-brand-name]').forEach((node)=>node.textContent=brandName);
    const copyright=document.querySelector('[data-copyright]');if(copyright)copyright.textContent=`© ${new Date().getFullYear()} ${brandName}`;
    const brand = document.querySelector('.brand');
    if (brand) {
      brand.setAttribute('aria-label', `${brandName} home`);
      const text = brand.querySelector('span:last-child');
      if (text) text.textContent = brandName;
      const logoUrl = safeImageUrl(asText(settings.logo_url));
      if (logoUrl) {
        const image = document.createElement('img'); image.src = logoUrl; image.alt = '';
        brand.querySelector('.brand-mark')?.replaceWith(image);
      }
    }
    const details = document.querySelector('[data-footer-details]');
    if (details && settings) {
      const lines = [settings.company_email, settings.company_phone, settings.address].map(asText).filter(Boolean);
      details.replaceChildren(...lines.map((line) => el('span','',line)));
      details.style.whiteSpace='pre-line';
      details.textContent=lines.join('\n') || 'Contact details are being configured.';
    }
    const socials=document.querySelector('[data-social-links]');
    if(socials){socials.replaceChildren();const lines=asText(settings.social_links).split('\n').map((line)=>line.split('|').map((part)=>part.trim())).filter(([label,url])=>label&&url);for(const [label,value]of lines){const href=safeExternalUrl(value);if(!href)continue;const link=el('a','',label);link.href=href;link.target='_blank';link.rel='noopener noreferrer';link.style.marginRight='.8rem';socials.append(link);}}
    for (const node of document.querySelectorAll('[data-config-notice]')) node.hidden = true;
  } catch (error) {
    for (const node of document.querySelectorAll('[data-config-notice]')) { node.hidden = false; node.textContent = error.message; }
  }
}

function asText(value) { return typeof value === 'string' ? value : (value && typeof value.text === 'string' ? value.text : ''); }
function safeImageUrl(value) { try { const url=new URL(value,location.href); return ['https:','http:'].includes(url.protocol)?url.href:''; } catch { return ''; } }
function safeExternalUrl(value) { try { const url=new URL(value); return ['https:','http:'].includes(url.protocol)?url.href:''; } catch { return ''; } }

export function showConfigurationError(error, target = document.querySelector('[data-config-notice]')) {
  if (!target) return;
  target.hidden = false;
  target.textContent = error?.message || 'Unable to connect to the listings service.';
}

export function setPageMeta(title, description, image = '') {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', description);
  for (const [property, content] of [['og:title',title],['og:description',description],['og:image',image]]) {
    let tag = document.querySelector(`meta[property="${property}"]`);
    if (!tag) { tag=document.createElement('meta'); tag.setAttribute('property',property); document.head.append(tag); }
    tag.setAttribute('content',content);
  }
}
