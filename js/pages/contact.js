import { getSettings, submitEnquiry } from '../api/public.js';
import { renderChrome, showConfigurationError, el } from '../ui/site.js';
import { validateEnquiry } from '../validation.js';
await renderChrome();
const form=document.querySelector('[data-enquiry-form]');
const message=document.querySelector('[data-form-message]');
const query=new URLSearchParams(location.search);
const subject=form.elements.namedItem('subject');
if(query.get('title'))subject.value=`Enquiry about ${query.get('title')}`;
try{
  const settings=await getSettings();const root=document.querySelector('[data-contact-details]');root.replaceChildren();
  const email=settingString(settings.company_email);const phone=settingString(settings.company_phone);const address=settingString(settings.address);const hours=settingString(settings.business_hours);
  for(const [label,value] of [['Email',email],['Phone',phone],['Address',address],['Hours',hours]])if(value){const section=el('p');section.append(el('strong','',`${label}: `),el('span','',value));root.append(section);}
  if(!root.children.length)root.append(el('p','muted','Company contact details have not been configured yet.'));
}catch(error){showConfigurationError(error);}
form.addEventListener('submit',async(event)=>{
  event.preventDefault();message.className='';
  if(form.elements.website.value){form.reset();message.className='';message.textContent='Submission not saved.';return;}
  const data=Object.fromEntries(new FormData(form));
  if(!validateEnquiry(data)){message.className='error';message.textContent='Please complete all fields within the listed length limits.';return;}
  const propertyId=query.get('property');
  const payload={name:String(data.name).trim(),contact:String(data.contact).trim(),subject:String(data.subject).trim(),message:String(data.message).trim(),...(propertyId?{property_id:propertyId}:{})};
  const submit=form.querySelector('button[type="submit"]');submit.disabled=true;message.textContent='Sending…';
  try{await submitEnquiry(payload);form.reset();message.className='success';message.textContent='Your enquiry was saved for the team. Email notification is not configured.';}
  catch(error){message.className='error';message.textContent=`We could not save your enquiry. ${error.message||'Please try again.'}`;}
  finally{submit.disabled=false;}
});
function settingString(value){return typeof value==='string'?value:(value&&typeof value.text==='string'?value.text:'');}
