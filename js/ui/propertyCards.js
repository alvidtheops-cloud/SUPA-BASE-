import { formatCategory, formatLocation, formatPrice, formatStatus } from '../format.js';
import { publicImageUrl } from '../api/public.js';
import { el } from './site.js';

export function renderPropertyCard(property) {
  const article = el('article','property-card');
  const link = el('a'); link.href=`property.html?slug=${encodeURIComponent(property.slug)}`;
  const cover=el('div','cover');
  const image=(property.property_images || []).slice().sort((a,b)=>Number(b.is_cover)-Number(a.is_cover)||a.sort_order-b.sort_order)[0];
  if (image) { const img=el('img'); img.src=publicImageUrl(image.storage_path); img.alt=image.alt_text; img.loading='lazy'; img.width=800; img.height=600; cover.append(img); }
  else cover.append(el('div','placeholder-cover','IMAGE NOT PROVIDED'));
  const body=el('div','card-body'); const top=el('div','card-topline'); top.append(el('span','eyebrow',formatCategory(property.category)),el('span',`status status-${property.status}`,formatStatus(property.status)));
  body.append(top,el('h3','',property.title),el('p','location',formatLocation(property)),el('p','price',formatPrice(property)));
  link.append(cover,body); article.append(link); return article;
}

export function renderCards(container, properties, emptyMessage='No listings found.') {
  container.replaceChildren();
  if (!properties.length) { const empty=el('div','empty-state'); empty.append(el('h3','','No properties to show'),el('p','muted',emptyMessage)); container.append(empty); return; }
  container.append(...properties.map(renderPropertyCard));
}

