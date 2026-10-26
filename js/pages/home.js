import { renderChrome, showConfigurationError } from '../ui/site.js';
import { getListings } from '../api/public.js';
import { renderCards } from '../ui/propertyCards.js';
await renderChrome();
const params = new URLSearchParams('sort=newest');
try {
  const [featured, recent] = await Promise.all([
    getListings({ params: new URLSearchParams('sort=newest'), pageSize: 6, featured: true }),
    getListings({ params, pageSize: 3 }),
  ]);
  renderCards(document.querySelector('[data-featured-listings]'), featured.data, 'Featured listings will appear when the administrator publishes them.');
  const recentSection=document.createElement('section'); recentSection.className='section';
  const container=document.createElement('div'); container.className='container';
  const eyebrow=document.createElement('span'); eyebrow.className='eyebrow'; eyebrow.textContent='Just added';
  const title=document.createElement('h2'); title.textContent='Recent listings';
  const grid=document.createElement('div'); grid.className='property-grid'; renderCards(grid,recent.data,'New listings will appear here when published.');
  container.append(eyebrow,title,grid); recentSection.append(container);
  document.querySelector('main').children[1].after(recentSection);
} catch (error) { showConfigurationError(error); }
