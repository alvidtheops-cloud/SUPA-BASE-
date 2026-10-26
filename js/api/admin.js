import { requireSupabase } from '../supabaseClient.js';

export async function listAdminProperties({ search='', category='', status='' }={}) {
  let query=requireSupabase().from('properties').select('*, agent:agents(name), property_images(id,storage_path,alt_text,is_cover,sort_order)').order('created_at',{ascending:false});
  if(search)query=query.ilike('title',`%${search.replace(/[\\%_]/g,'\\$&')}%`);
  if(category)query=query.eq('category',category);
  if(status)query=query.eq('status',status);
  const {data,error}=await query;
  if(error)throw error;
  return data||[];
}

export async function getAdminProperty(id) {
  const {data,error}=await requireSupabase().from('properties').select('*, property_images(*)').eq('id',id).maybeSingle();
  if(error)throw error;
  return data;
}

export async function listAgents() {
  const {data,error}=await requireSupabase().from('agents').select('*').order('name');
  if(error)throw error;
  return data||[];
}

export async function upsertProperty(property) {
  const client=requireSupabase();
  if(property.id){const {data,error}=await client.from('properties').update(property).eq('id',property.id).select().single();if(error)throw error;return data;}
  const {data,error}=await client.from('properties').insert(property).select().single();if(error)throw error;return data;
}

export async function uploadPropertyImage(propertyId,file,altText,sortOrder,isCover) {
  const client=requireSupabase();
  const ext=file.type==='image/png'?'png':'webp';
  const path=`${propertyId}/${crypto.randomUUID()}.${ext}`;
  const {error:uploadError}=await client.storage.from('listing-images').upload(path,file,{contentType:file.type,upsert:false});
  if(uploadError)throw uploadError;
  const {error:rowError}=await client.from('property_images').insert({property_id:propertyId,storage_path:path,alt_text:altText,sort_order:sortOrder,is_cover:isCover});
  if(rowError){await client.storage.from('listing-images').remove([path]);throw rowError;}
  return path;
}

export async function deletePropertyImage(image) {
  const client=requireSupabase();
  const {error:storageError}=await client.storage.from('listing-images').remove([image.storage_path]);
  if(storageError)throw storageError;
  const {error}=await client.from('property_images').delete().eq('id',image.id);
  if(error)throw error;
}

export async function setImageCover(propertyId,imageId) {
  const client=requireSupabase();
  const {error:clearError}=await client.from('property_images').update({is_cover:false}).eq('property_id',propertyId).eq('is_cover',true);
  if(clearError)throw clearError;
  const {error}=await client.from('property_images').update({is_cover:true}).eq('id',imageId);
  if(error)throw error;
}

export async function swapImageOrder(imageId,otherImageId,firstOrder,secondOrder,maxOrder) {
  const client=requireSupabase();
  const operations=[
    client.from('property_images').update({sort_order:maxOrder+1}).eq('id',imageId),
    client.from('property_images').update({sort_order:firstOrder}).eq('id',otherImageId),
    client.from('property_images').update({sort_order:secondOrder}).eq('id',imageId),
  ];
  for(const operation of operations){const {error}=await operation;if(error)throw error;}
}

export async function deleteProperty(property) {
  const client=requireSupabase();
  const paths=(property.property_images||[]).map((image)=>image.storage_path);
  if(paths.length){const {error}=await client.storage.from('listing-images').remove(paths);if(error)throw error;}
  const {error}=await client.from('properties').delete().eq('id',property.id);
  if(error)throw error;
}

export async function listAllAgents() { return listAgents(); }

export async function saveAgent(agent) {
  const client=requireSupabase();
  if(agent.id){const {data,error}=await client.from('agents').update(agent).eq('id',agent.id).select().single();if(error)throw error;return data;}
  const {data,error}=await client.from('agents').insert(agent).select().single();if(error)throw error;return data;
}

export async function removeAgent(id) {
  const {error}=await requireSupabase().from('agents').delete().eq('id',id);
  if(error)throw error;
}

export async function getEnquiries() {
  const {data,error}=await requireSupabase().from('enquiries').select('*, property:properties(title)').order('created_at',{ascending:false});
  if(error)throw error;
  return data||[];
}

export async function updateEnquiryStatus(id,status) {
  const {error}=await requireSupabase().from('enquiries').update({status}).eq('id',id);
  if(error)throw error;
}

export async function getAllSettings() {
  const {data,error}=await requireSupabase().from('site_settings').select('*').order('key');
  if(error)throw error;
  return data||[];
}

export async function saveSetting(key,value) {
  const {error}=await requireSupabase().from('site_settings').upsert({key,value,updated_by:(await requireSupabase().auth.getUser()).data.user.id});
  if(error)throw error;
}

export async function deleteSetting(key) {
  const {error}=await requireSupabase().from('site_settings').delete().eq('key',key);
  if(error)throw error;
}
