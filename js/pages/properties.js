import { getListings } from '../api/public.js';
import { renderChrome, showConfigurationError } from '../ui/site.js';
import { renderCards } from '../ui/propertyCards.js';
await renderChrome();
const form=document.querySelector('[data-filters]');
const grid=document.querySelector('[data-listings]');
const count=document.querySelector('[data-result-count]');
const pager=document.querySelector('[data-pagination]');
const pageSize=12;
let page=Math.max(0,Number(new URLSearchParams(location.search).get('page')||0));
function applyParams(params) {
  for (const name of ['q','state','city','category','min','max','status','sort']) {
    const control=form.elements.namedItem(name);
    if (control && params.has(name)) control.value=params.get(name);
  }
}
applyParams(new URLSearchParams(location.search));
function paramsFromForm() {
  const params=new URLSearchParams();
  for (const [key,value] of new FormData(form)) if (String(value).trim()) params.set(key,String(value).trim());
  return params;
}
async function load() {
  const params=new URLSearchParams(location.search);
  params.delete('page');
  try {
    const result=await getListings({params,page,pageSize});
    renderCards(grid,result.data,'Try clearing a filter or changing your search.');
    count.textContent=`${result.count} ${result.count===1?'listing':'listings'} found`;
    pager.replaceChildren();
    if (page>0) { const prev=document.createElement('button'); prev.type='button'; prev.className='button secondary'; prev.textContent='Previous'; prev.addEventListener('click',()=>{page--;writePage();}); pager.append(prev); }
    if ((page+1)*pageSize<result.count) { const next=document.createElement('button'); next.type='button'; next.className='button'; next.textContent='Next'; next.addEventListener('click',()=>{page++;writePage();}); pager.append(next); }
  } catch(error) { showConfigurationError(error); count.textContent='Listings could not be loaded.'; }
}
function writePage() { const params=new URLSearchParams(location.search); if(page)params.set('page',String(page));else params.delete('page'); history.pushState({},'',`${location.pathname}?${params}`); load(); }
form.addEventListener('submit',(event)=>{event.preventDefault();page=0;const params=paramsFromForm();history.pushState({},'',`${location.pathname}?${params}`);load();});
form.addEventListener('reset',()=>setTimeout(()=>{page=0;history.pushState({},'',location.pathname);load();},0));
addEventListener('popstate',()=>{page=Math.max(0,Number(new URLSearchParams(location.search).get('page')||0));applyParams(new URLSearchParams(location.search));load();});
load();
