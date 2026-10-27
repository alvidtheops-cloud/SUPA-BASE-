import { getListingBySlug, getListingPreview, getListings, submitEnquiry } from '../api/public.js';
import { formatCategory, formatLocation, formatPrice, formatStatus } from '../format.js';
import { whatsappUrl } from '../whatsapp.js';
import { renderChrome, showConfigurationError, setPageMeta, el } from '../ui/site.js';
import { publicImageUrl } from '../api/public.js';
import { renderCards } from '../ui/propertyCards.js';
import { expectedDatePassed, validateEnquiry } from '../validation.js';

await renderChrome();
const root=document.querySelector('[data-property-detail]');
const query=new URLSearchParams(location.search);const slug=query.get('slug');const previewId=query.get('preview');
if (!slug&&!previewId) { root.replaceChildren(el('div','empty-state','Choose a listing from the properties page.')); }
else try {
  const property=previewId?await getListingPreview(previewId):await getListingBySlug(slug);
  if (!property) { root.replaceChildren(el('div','empty-state','This listing is unavailable or has been removed.')); setPageMeta('Property not found | Prime Assets Nigeria','This listing is unavailable.'); }
  else {
    if(previewId){const banner=el('p','notice','Admin preview: this listing is not being shown publicly unless it has been published.');root.before(banner);}
    document.querySelector('[data-breadcrumb-title]').textContent=property.title;
    const images=(property.property_images||[]).slice().sort((a,b)=>Number(b.is_cover)-Number(a.is_cover)||a.sort_order-b.sort_order);
    const detail=el('div','detail-layout'); const left=el('div'); const gallery=el('div','gallery');
    const mainImage=images[0]?el('img','gallery-main'):el('div','gallery-main placeholder-cover','No property image provided');
    if(images[0]){mainImage.width=1200;mainImage.height=750;mainImage.alt=images[0].alt_text||property.title;mainImage.src=publicImageUrl(images[0].storage_path);}
    gallery.append(mainImage);
    if(images.length>1){const thumbs=el('div','gallery-thumbs');images.forEach((image,index)=>{const button=el('button');button.type='button';button.setAttribute('aria-label',`Show image ${index+1}`);button.setAttribute('aria-pressed',String(index===0));const img=el('img');img.src=publicImageUrl(image.storage_path);img.alt=image.alt_text;img.loading='lazy';button.append(img);button.addEventListener('click',()=>{mainImage.src=img.src;mainImage.alt=image.alt_text;thumbs.querySelectorAll('button').forEach((item)=>item.setAttribute('aria-pressed','false'));button.setAttribute('aria-pressed','true');});thumbs.append(button);});gallery.append(thumbs);}
    left.append(gallery);
    const status=el('span',`status status-${property.status}`,formatStatus(property.status));
    const heading=el('h1','',property.title);heading.style.fontSize='clamp(2rem,4vw,3.4rem)';
    const location=el('p','muted',formatLocation(property,true));
    const facts=el('div','detail-specs');
    const addSpec=(label,value)=>{if(value!==undefined&&value!==null&&value!==''){const spec=el('div','spec');spec.append(el('span','',label),el('strong','',String(value)));facts.append(spec);}};
    addSpec('Category',formatCategory(property.category));
    if(property.measurement_value) addSpec('Size',`${property.measurement_value} ${property.measurement_unit}`);
    const relevantAttributes={
      residential:{bedrooms:'Bedrooms',bathrooms:'Bathrooms',toilets:'Toilets',parking_spaces:'Parking spaces',property_type:'Property type',furnishing:'Furnishing'},
      land:{land_use:'Land use',title:'Title',plot_count:'Plot count',terrain:'Terrain',road_access:'Road access'},
      commercial:{property_type:'Property type',floor_area:'Floor area',floors:'Floors',parking_spaces:'Parking spaces',power_supply:'Power supply'},
      other:{asset_type:'Asset type',condition:'Condition',year:'Year'},
    }[property.category]||{};
    for(const [key,label] of Object.entries(relevantAttributes)){const value=property.attributes?.[key];if(typeof value==='string'||typeof value==='number'||typeof value==='boolean')addSpec(label,value===true?'Yes':value===false?'No':value);}
    const description=el('section');description.append(el('h2','','About this property'),el('p','',property.description));
    left.append(facts,description);
    if(property.features?.length){const list=el('ul');property.features.forEach((feature)=>list.append(el('li','',feature)));const section=el('section');section.append(el('h2','','Features'),list);left.append(section);}
    const panel=el('aside','detail-panel');panel.append(status,el('p','price',formatPrice(property)),el('h2','',formatLocation(property)));
    if(property.status==='coming_soon'&&property.expected_date){const date=new Date(`${property.expected_date}T12:00:00Z`);const copy=expectedDatePassed(property.expected_date)?'Expected date passed, contact us':`Expected ${date.toLocaleDateString('en-NG',{dateStyle:'long',timeZone:'Africa/Lagos'})}`;panel.append(el('p','notice',copy));}
    if(property.agent?.name){panel.append(el('h3','','Listing agent'),el('p','',property.agent.name));if(property.agent.phone)panel.append(el('p','',property.agent.phone));}
    if(property.status==='active'){
      if(property.agent?.whatsapp_phone||property.agent?.phone){const href=whatsappUrl(property.agent.whatsapp_phone||property.agent.phone,property.title);const a=el('a','button');a.href=href;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Chat with Agent on WhatsApp';panel.append(a);}
      const enquiry=document.createElement('a');enquiry.className='button secondary';enquiry.href=`contact.html?property=${encodeURIComponent(property.id)}&title=${encodeURIComponent(property.title)}`;enquiry.textContent='Send an enquiry';enquiry.style.marginTop='.65rem';panel.append(enquiry);
      const form=el('form','form-stack');form.style.marginTop='1.5rem';form.noValidate=true;form.append(el('h2','','Enquire about this listing'));
      const fields=[];for(const [name,label,type]of [['name','Your name','text'],['contact','Email or phone','text']]){const field=el('div','field');const input=document.createElement('input');input.name=name;input.type=type;input.required=true;input.maxLength=name==='name'?120:254;input.id=`detail-${name}`;const caption=el('label','',label);caption.htmlFor=input.id;field.append(caption,input);form.append(field);fields.push(input);}
      const messageField=el('div','field');const msgLabel=el('label','','Message');const textarea=document.createElement('textarea');textarea.name='message';textarea.required=true;textarea.maxLength=5000;textarea.id='detail-message';msgLabel.htmlFor=textarea.id;messageField.append(msgLabel,textarea);form.append(messageField);
      const trap=el('div','sr-only');trap.setAttribute('aria-hidden','true');const trapInput=document.createElement('input');trapInput.name='website';trapInput.tabIndex=-1;trapInput.autocomplete='off';trap.append(trapInput);form.append(trap);
      const send=el('button','button','Send enquiry');send.type='submit';const statusMessage=el('p','');statusMessage.setAttribute('aria-live','polite');form.append(send,statusMessage);
      form.addEventListener('submit',async(event)=>{event.preventDefault();if(trapInput.value){form.reset();statusMessage.className='';statusMessage.textContent='Submission not saved.';return;}const [name,contact]=fields;const payload={name:name.value.trim(),contact:contact.value.trim(),subject:`Enquiry about ${property.title}`,message:textarea.value.trim()};if(!validateEnquiry(payload)){statusMessage.className='error';statusMessage.textContent='Complete each field within the allowed length limits.';return;}send.disabled=true;statusMessage.textContent='Sending…';try{await submitEnquiry({...payload,property_id:property.id});statusMessage.className='success';statusMessage.textContent='Your enquiry was saved for the team. Email notification is not configured.';form.reset();}catch(error){statusMessage.className='error';statusMessage.textContent=`We could not save your enquiry. ${error.message||''}`;}finally{send.disabled=false;}});
      left.append(form);
    } else panel.append(el('p','muted',property.status==='closed'?'This property is closed and cannot receive enquiries.':'This property is coming soon and is not currently available for enquiries.'));
    detail.append(left,panel);root.replaceChildren(detail);
    setPageMeta(`${property.title} | Prime Assets Nigeria`,`${formatCategory(property.category)} in ${formatLocation(property)}. ${property.description.slice(0,130)}`,images[0]?publicImageUrl(images[0].storage_path):'');
    try{const related=await getListings({params:new URLSearchParams(`category=${encodeURIComponent(property.category)}`),pageSize:4});renderCards(document.querySelector('[data-related-listings]'),related.data.filter((item)=>item.id!==property.id).slice(0,3),'More listings will appear here.');}
    catch{renderCards(document.querySelector('[data-related-listings]'),[],'Related listings could not be loaded.');}
  }
} catch(error){showConfigurationError(error);root.replaceChildren(el('div','empty-state','We could not load this listing. Please try again later.'));}
