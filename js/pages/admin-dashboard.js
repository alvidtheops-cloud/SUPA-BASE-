import { requireAdmin, signOut } from '../auth.js';
import { requireSupabase } from '../supabaseClient.js';
import { deleteProperty, deletePropertyImage, deleteSetting, getAdminProperty, getAllSettings, getEnquiries, listAdminProperties, listAllAgents, removeAgent, saveAgent, saveSetting, setImageCover, swapImageOrder, updateEnquiryStatus, upsertProperty, uploadPropertyImage } from '../api/admin.js';
import { formatPrice, formatStatus } from '../format.js';
import { expectedDatePassed, validateComingSoon, validateImage, validatePhone, resizeImage } from '../validation.js';
import { el, showConfigurationError } from '../ui/site.js';

const content=document.querySelector('[data-admin-content]');
const message=document.querySelector('[data-admin-message]');
const dialog=document.querySelector('[data-editor-dialog]');
const editor=document.querySelector('[data-editor-form]');
let session;

try { session=await requireAdmin(); if(session)await renderView(); }
catch(error){showMessage(error.message||'Unable to verify administrator access.','error');}

document.querySelector('[data-logout]').addEventListener('click',async()=>{try{await signOut();}catch(error){showMessage(error.message,'error');}});
addEventListener('popstate',renderView);

async function renderView(){
  const view=new URLSearchParams(location.search).get('view')||'overview';
  document.querySelectorAll('[data-view]').forEach((link)=>link.setAttribute('aria-current',String(link.dataset.view===view?'page':'false')));
  const titles={overview:'Overview',listings:'Listings',agents:'Agents',enquiries:'Enquiries',settings:'Site settings'};
  document.querySelector('[data-view-title]').textContent=titles[view]||'Overview';
  content.replaceChildren();clearMessage();
  try{
    if(view==='overview')await renderOverview();
    else if(view==='listings')await renderListings();
    else if(view==='agents')await renderAgents();
    else if(view==='enquiries')await renderEnquiries();
    else if(view==='settings')await renderSettings();
    else await renderOverview();
  }catch(error){showMessage(error.message||'Could not load this dashboard view.','error');}
}

async function renderOverview(){
  const properties=await listAdminProperties();
  const metrics=el('div','metrics');
  for(const [label,value] of [['Total listings',properties.length],['Active',properties.filter((p)=>p.status==='active').length],['Closed',properties.filter((p)=>p.status==='closed').length],['Coming soon',properties.filter((p)=>p.status==='coming_soon').length]]){const card=el('div','metric');card.append(el('span','muted',label),el('strong','',String(value)));metrics.append(card);}
  const heading=el('div','admin-top');heading.style.marginTop='2rem';heading.append(el('h2','','Recent inventory'));
  const button=el('a','button','Add listing');button.href='?view=listings&new=1';heading.append(button);
  const table=makeTable(['Listing','Location','Price','Status','Visibility']);
  properties.slice(0,8).forEach((p)=>table.body.append(row([p.title,[p.city,p.state].filter(Boolean).join(', '),formatPrice(p),formatStatus(p.status),p.published?'Published':'Draft'])));
  content.append(metrics,heading,table.wrap);
  const overdue=properties.filter((p)=>p.status==='coming_soon'&&expectedDatePassed(p.expected_date));
  if(overdue.length){const warning=el('p','notice',`${overdue.length} Coming Soon listing date(s) have passed. Review inventory; status has not been changed.`);content.prepend(warning);}
}

async function renderListings(){
  const toolbar=el('div','admin-top');const search=makeInput('Search listings','search');const category=makeSelect('Category',[['','All categories'],['residential','Residential'],['land','Land'],['commercial','Commercial'],['other','Other assets']]);const status=makeSelect('Status',[['','All statuses'],['active','Active'],['closed','Closed'],['coming_soon','Coming soon']]);const add=el('button','button','Add listing');add.type='button';add.addEventListener('click',()=>openPropertyEditor());toolbar.append(search.wrap,category.wrap,status.wrap,add);content.append(toolbar);
  const table=makeTable(['Listing','Category','State / city','Price','Status','Published','Actions']);content.append(table.wrap);
  const load=async()=>{table.body.replaceChildren();const rows=await listAdminProperties({search:search.input.value.trim(),category:category.input.value,status:status.input.value});for(const p of rows){const tr=document.createElement('tr');for(const text of [p.title,p.category,[p.state,p.city].filter(Boolean).join(' / '),formatPrice(p),formatStatus(p.status),p.published?'Yes':'No'])tr.append(el('td','',text));const actions=el('td');const edit=el('button','button secondary','Edit');edit.type='button';edit.addEventListener('click',()=>openPropertyEditor(p.id));const del=el('button','button danger','Delete');del.type='button';del.addEventListener('click',()=>confirmDeleteProperty(p));const group=el('div','table-actions');group.append(edit,del);actions.append(group);tr.append(actions);table.body.append(tr);}};
  let timer;for(const input of [search.input,category.input,status.input])input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>load().catch((error)=>showMessage(error.message,'error')),250);});
  await load();
  if(new URLSearchParams(location.search).get('new')==='1')openPropertyEditor();
}

async function openPropertyEditor(id=null){
  editor.replaceChildren();const existing=id?await getAdminProperty(id):null;const agents=await listAllAgents();
  const title=el('h2','',existing?'Edit listing':'Add listing');
  const close=el('button','button secondary','Close');close.type='button';close.addEventListener('click',()=>dialog.close());
  const top=el('div','admin-top');top.append(title);
  if(existing){const preview=el('a','button secondary','Preview');preview.href=`../property.html?preview=${encodeURIComponent(existing.id)}`;preview.target='_blank';preview.rel='noopener noreferrer';top.append(preview);}
  top.append(close);
  const grid=el('div','editor-grid');
  const titleField=makeInput('Title','text',existing?.title||'');const slugField=makeInput('Slug','text',existing?.slug||'');const categoryField=makeSelect('Category',[['residential','Residential'],['land','Land / plots'],['commercial','Commercial'],['other','Other assets']],existing?.category||'residential');
  const stateField=makeInput('State','text',existing?.state||'');const cityField=makeInput('City','text',existing?.city||'');const neighbourhoodField=makeInput('Neighbourhood','text',existing?.neighbourhood||'');const addressField=makeInput('Address','text',existing?.address||'');
  const priceField=makeInput('Price in ₦ (leave empty for contact price)','number',existing?.price??'');priceField.input.min='0';priceField.input.step='0.01';
  const hideField=makeCheckbox('Hide exact price / contact for price',existing?.hide_price||false);
  const statusField=makeSelect('Status',[['active','Active'],['closed','Closed'],['coming_soon','Coming Soon']],existing?.status||'active');const dateField=makeInput('Expected date (Coming Soon)','date',existing?.expected_date||'');
  const unitField=makeSelect('Measurement unit',[['','Not specified'],['sqm','Square metres'],['acres','Acres'],['hectares','Hectares']],existing?.measurement_unit||'');const sizeField=makeInput('Measurement size','number',existing?.measurement_value??'');sizeField.input.min='0';sizeField.input.step='0.001';
  const agentField=makeSelect('Assigned agent',[['','No agent'],...agents.map((a)=>[a.id,a.name])],existing?.agent_id||'');
  const descField=makeTextarea('Description',existing?.description||'');const attrsField=makeTextarea('Property-specific fields (JSON object)',JSON.stringify(existing?.attributes||{},null,2));attrsField.input.placeholder='For example: {"bedrooms": 3, "bathrooms": 2}';
  const featuresField=makeTextarea('Features (one per line)',(existing?.features||[]).join('\n'));
  const publishedField=makeCheckbox('Published on public site',existing?.published||false);const featuredField=makeCheckbox('Feature on homepage',existing?.featured||false);
  const imagesField=document.createElement('div');imagesField.className='field wide';imagesField.append(el('label','','Images (JPEG, PNG, WebP or AVIF, max 8 MB each)'));const fileInput=document.createElement('input');fileInput.type='file';fileInput.multiple=true;fileInput.accept='image/jpeg,image/png,image/webp,image/avif';imagesField.append(fileInput);
  const currentPhotos=el('div','wide');if(existing?.property_images?.length){const ph=el('h3','','Current images');currentPhotos.append(ph);const sortedImages=existing.property_images.slice().sort((a,b)=>a.sort_order-b.sort_order);for(const [index,image] of sortedImages.entries()){const line=el('div','photo-row');const img=document.createElement('img');img.src=requireSupabase().storage.from('listing-images').getPublicUrl(image.storage_path).data.publicUrl;img.alt=image.alt_text;const info=el('span','',`${image.is_cover?'Cover · ':''}${image.alt_text}`);const cover=el('button','button secondary',image.is_cover?'Cover image':'Set cover');cover.type='button';cover.disabled=image.is_cover;cover.addEventListener('click',async()=>{try{await setImageCover(existing.id,image.id);showMessage('Cover image updated.','success');await openPropertyEditor(existing.id);}catch(error){showMessage(error.message,'error');}});const reorder=async(otherIndex)=>{const other=sortedImages[otherIndex];try{await swapImageOrder(image.id,other.id,image.sort_order,other.sort_order,Math.max(...sortedImages.map((item)=>item.sort_order)));await openPropertyEditor(existing.id);}catch(error){showMessage(error.message,'error');}};const up=el('button','button secondary','↑');up.type='button';up.disabled=index===0;up.setAttribute('aria-label','Move image earlier');up.addEventListener('click',()=>reorder(index-1));const down=el('button','button secondary','↓');down.type='button';down.disabled=index===sortedImages.length-1;down.setAttribute('aria-label','Move image later');down.addEventListener('click',()=>reorder(index+1));const remove=el('button','button danger','Remove');remove.type='button';remove.addEventListener('click',async()=>{if(!confirm('Remove this image?'))return;try{await deletePropertyImage(image);if(image.is_cover){const fallback=sortedImages.find((candidate)=>candidate.id!==image.id);if(fallback)await setImageCover(existing.id,fallback.id);}await openPropertyEditor(existing.id);showMessage('Image removed.','success');}catch(error){showMessage(error.message,'error');}});line.append(img,info,cover,up,down,remove);currentPhotos.append(line);}}
  const response=el('p','wide');response.setAttribute('aria-live','polite');const submit=el('button','button','Save listing');submit.type='submit';const saveAnother=el('button','button secondary','Save & add another');saveAnother.type='button';const submitWrap=el('div','wide');submitWrap.append(submit,saveAnother,response);
  for(const f of [titleField,slugField,categoryField,stateField,cityField,neighbourhoodField,addressField,priceField,hideField,statusField,dateField,sizeField,unitField,agentField,descField,attrsField,featuresField,publishedField,featuredField,imagesField,currentPhotos,submitWrap])grid.append(f.wrap||f);
  editor.append(top,grid);if(!dialog.open)dialog.showModal();

  const saveListing = async ({ keepOpen = false } = {}) => {
    response.className='';submit.disabled=true;saveAnother.disabled=true;response.textContent='Saving…';
    try{
      const status=statusField.input.value;const expected=dateField.input.value||null;
      const scheduleChanged=!existing||status!==existing.status||expected!==existing.expected_date;
      if(scheduleChanged&&!validateComingSoon(status,expected)){throw new Error('Coming Soon listings need an expected date in the future.');}
      const attrs=JSON.parse(attrsField.input.value||'{}');if(!attrs||Array.isArray(attrs)||typeof attrs!=='object')throw new Error('Property-specific fields must be a JSON object.');
      if(Boolean(sizeField.input.value)!==Boolean(unitField.input.value))throw new Error('Choose both a measurement size and unit, or leave both empty.');
      const slug=slugField.input.value.trim()||slugify(titleField.input.value);
      const property=await upsertProperty({...(existing?{id:existing.id}:{}),slug,title:titleField.input.value.trim(),description:descField.input.value.trim(),category:categoryField.input.value,price:priceField.input.value?Number(priceField.input.value):null,hide_price:hideField.input.checked,currency:'NGN',status,expected_date:expected,published:publishedField.input.checked,featured:featuredField.input.checked,state:stateField.input.value.trim(),city:cityField.input.value.trim()||null,neighbourhood:neighbourhoodField.input.value.trim()||null,address:addressField.input.value.trim()||null,measurement_value:sizeField.input.value?Number(sizeField.input.value):null,measurement_unit:sizeField.input.value?unitField.input.value:null,attributes:attrs,features:featuresField.input.value.split('\n').map((x)=>x.trim()).filter(Boolean),agent_id:agentField.input.value||null});
      const selected=Array.from(fileInput.files);try{for(const [index,file] of selected.entries()){const validation=validateImage(file);if(validation)throw new Error(validation);const resized=await resizeImage(file);const isCover=!(existing?.property_images?.some((image)=>image.is_cover))&&index===0;const location=[neighbourhoodField.input.value,cityField.input.value,stateField.input.value].filter(Boolean).join(', ');await uploadPropertyImage(property.id,resized,`${titleField.input.value.trim()} property${location?` in ${location}`:''}, image ${index+1}`,index+(existing?.property_images?.length||0),isCover);}}catch(imageError){throw new Error(`Listing saved, but image upload failed: ${imageError.message}`);}
      response.className='success';response.textContent='Listing saved. Changes are stored in Supabase.';showMessage('Listing saved.','success');
      if(keepOpen){
        await renderView();
        openPropertyEditor();
        return;
      }
      await renderView();
    }catch(error){response.className='error';response.textContent=error.message||'Could not save listing.';showMessage(error.message||'Could not save listing.','error');}
    finally{submit.disabled=false;saveAnother.disabled=false;}
  };

  editor.onsubmit=async(event)=>{event.preventDefault();await saveListing({keepOpen:false});};
  saveAnother.addEventListener('click', async()=>{await saveListing({keepOpen:true});});
}

async function confirmDeleteProperty(property){if(!confirm(`Delete “${property.title}” and its images? This cannot be undone.`))return;try{const current=await getAdminProperty(property.id);await deleteProperty(current);showMessage('Listing and images deleted.','success');await renderView();}catch(error){showMessage(`Delete failed: ${error.message}`,'error');}}

async function renderAgents(){
  const add=el('button','button','Add agent');add.type='button';add.addEventListener('click',()=>openAgentEditor());content.append(add);
  const agents=await listAllAgents();const table=makeTable(['Name','Phone','Email','Status','Actions']);
  agents.forEach((agent)=>{const tr=document.createElement('tr');for(const text of [agent.name,agent.phone,agent.email||'—',agent.is_active?'Active':'Inactive'])tr.append(el('td','',text));const cell=el('td');const edit=el('button','button secondary','Edit');edit.type='button';edit.addEventListener('click',()=>openAgentEditor(agent));const remove=el('button','button danger','Delete');remove.type='button';remove.addEventListener('click',async()=>{if(!confirm(`Delete agent ${agent.name}? Assigned properties will remain without an agent.`))return;try{await removeAgent(agent.id);await renderView();}catch(error){showMessage(error.message,'error');}});const actions=el('div','table-actions');actions.append(edit,remove);cell.append(actions);tr.append(cell);table.body.append(tr);});content.append(table.wrap);
}
function openAgentEditor(agent=null){
  editor.replaceChildren();const name=makeInput('Agent name','text',agent?.name||'');const phone=makeInput('Phone (E.164, e.g. +234...)','tel',agent?.phone||'');const whatsapp=makeInput('WhatsApp phone (optional, E.164)','tel',agent?.whatsapp_phone||'');const email=makeInput('Email (optional)','email',agent?.email||'');const bio=makeTextarea('Bio (optional)',agent?.bio||'');const active=makeCheckbox('Active agent',agent?.is_active??true);const save=el('button','button','Save agent');save.type='submit';const close=el('button','button secondary','Cancel');close.type='button';close.addEventListener('click',()=>dialog.close());editor.append(el('h2','',agent?'Edit agent':'Add agent'),name.wrap,phone.wrap,whatsapp.wrap,email.wrap,bio.wrap,active.wrap,save,close);if(!dialog.open)dialog.showModal();editor.onsubmit=async(event)=>{event.preventDefault();if(!validatePhone(phone.input.value))return showMessage('Phone must use E.164, such as +2348012345678.','error');if(whatsapp.input.value&&!validatePhone(whatsapp.input.value))return showMessage('WhatsApp phone must use E.164 format.','error');try{await saveAgent({...(agent?{id:agent.id}:{}),name:name.input.value.trim(),phone:phone.input.value.trim(),whatsapp_phone:whatsapp.input.value.trim()||null,email:email.input.value.trim()||null,bio:bio.input.value.trim()||null,is_active:active.input.checked});dialog.close();await renderView();showMessage('Agent saved.','success');}catch(error){showMessage(error.message,'error');}};
}

async function renderEnquiries(){const rows=await getEnquiries();const table=makeTable(['Received','Name / contact','Subject','Property','Message','Status']);for(const item of rows){const tr=document.createElement('tr');tr.append(el('td','',new Date(item.created_at).toLocaleString('en-NG')),el('td','',`${item.name}\n${item.contact}`),el('td','',item.subject),el('td','',item.property?.title||'General enquiry'),el('td','',item.message));const cell=el('td');const select=makeSelect('',[['new','New'],['in_progress','In progress'],['closed','Closed']],item.status);select.input.addEventListener('change',async()=>{try{await updateEnquiryStatus(item.id,select.input.value);showMessage('Enquiry status updated.','success');}catch(error){showMessage(error.message,'error');}});cell.append(select.wrap);tr.append(cell);table.body.append(tr);}content.append(table.wrap);if(!rows.length)content.append(el('div','empty-state','No enquiries have been received.'));}

async function renderSettings(){
  const rows=await getAllSettings();const values=new Map(rows.map((row)=>[row.key,asSettingString(row.value)]));
  const form=document.createElement('form');form.className='form-stack';form.style.maxWidth='760px';form.append(el('p','muted','Public business details shown on the website. Enter only verified client information. Logo may be an absolute HTTPS image URL.'));
  const fields=[['brand_name','Business name'],['logo_url','Logo URL (HTTPS)'],['company_email','Company email'],['company_phone','Company phone (E.164)'],['whatsapp_phone','WhatsApp phone (E.164)'],['address','Address'],['business_hours','Business hours'],['about_text','About text'],['contact_intro','Contact introduction'],['default_meta_description','Default SEO description'],['social_links','Social links (one per line: Label|https://example.com)']];const controls={};
  for(const [key,label] of fields){const field=key.includes('text')||key==='business_hours'||key==='address'||key==='social_links'?makeTextarea(label,values.get(key)||''):makeInput(label,'text',values.get(key)||'');field.input.dataset.setting=key;controls[key]=field.input;form.append(field.wrap);}
  const button=el('button','button','Save settings');button.type='submit';form.append(button);form.addEventListener('submit',async(event)=>{event.preventDefault();button.disabled=true;try{for(const key of ['company_phone','whatsapp_phone']){const value=controls[key].value.trim();if(value&&!validatePhone(value))throw new Error(`${key==='company_phone'?'Company':'WhatsApp'} phone must use E.164 format (for example +2348012345678).`);}const email=controls.company_email.value.trim();if(email&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254))throw new Error('Enter a valid company email address.');const logo=controls.logo_url.value.trim();if(logo){const url=new URL(logo);if(url.protocol!=='https:')throw new Error('Logo URL must use HTTPS.');}for(const [key] of fields){const value=controls[key].value.trim();if(value)await saveSetting(key,value);else await deleteSetting(key);}showMessage('Site settings saved.','success');}catch(error){showMessage(`Settings save failed: ${error.message}`,'error');}finally{button.disabled=false;}});
  content.append(form);
}

function makeInput(label,type='text',value=''){const wrap=el('div','field');const input=document.createElement('input');input.type=type;input.value=value??'';const id=`field-${crypto.randomUUID()}`;input.id=id;if(label){const l=el('label','',label);l.htmlFor=id;wrap.append(l);}wrap.append(input);return{wrap,input};}
function makeTextarea(label,value=''){const wrap=el('div','field wide');const input=document.createElement('textarea');input.value=value??'';const id=`field-${crypto.randomUUID()}`;input.id=id;const l=el('label','',label);l.htmlFor=id;wrap.append(l,input);return{wrap,input};}
function makeSelect(label,options,value=''){const wrap=el('div','field');const input=document.createElement('select');const id=`field-${crypto.randomUUID()}`;input.id=id;for(const [optionValue,optionLabel]of options){const option=el('option','',optionLabel);option.value=optionValue;input.append(option);}input.value=value;const l=el('label','',label);l.htmlFor=id;if(label)wrap.append(l);wrap.append(input);return{wrap,input};}
function makeCheckbox(label,checked=false){const wrap=el('label','field');wrap.style.display='flex';wrap.style.alignItems='center';wrap.style.gap='.6rem';const input=document.createElement('input');input.type='checkbox';input.checked=Boolean(checked);const text=el('span','',label);wrap.append(input,text);return{wrap,input};}
function makeTable(headers){const wrap=el('div','table-wrap');const table=document.createElement('table');const thead=document.createElement('thead');const headRow=document.createElement('tr');headers.forEach((header)=>headRow.append(el('th','',header)));thead.append(headRow);const body=document.createElement('tbody');table.append(thead,body);wrap.append(table);return{wrap,body};}
function row(values){const tr=document.createElement('tr');values.forEach((value)=>tr.append(el('td','',String(value??'—'))));return tr;}
function showMessage(text,type='notice'){message.hidden=false;message.className=type;message.textContent=text;}
function clearMessage(){message.hidden=true;message.textContent='';}
function slugify(value){return value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function asSettingString(value){return typeof value==='string'?value:(value&&typeof value.text==='string'?value.text:'');}
