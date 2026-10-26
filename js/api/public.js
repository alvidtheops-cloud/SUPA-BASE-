import { requireSupabase } from '../supabaseClient.js';
import { escapeLike } from '../format.js';

export async function getSettings() {
  const { data, error } = await requireSupabase().from('site_settings').select('key,value');
  if (error) throw error;
  return Object.fromEntries((data || []).map((row) => [row.key, row.value]));
}

export async function getListings({ params = new URLSearchParams(), page = 0, pageSize = 12, featured = false } = {}) {
  const client = requireSupabase();
  let query = client.from('public_properties').select('*', { count: 'exact' });
  const keyword = params.get('q')?.trim();
  if (keyword) query = query.ilike('title', `%${escapeLike(keyword)}%`);
  for (const [key, column] of [['state', 'state'], ['city', 'city'], ['category', 'category'], ['status', 'status']]) {
    const value = params.get(key);
    if (value) query = query.eq(column, value);
  }
  const min = Number(params.get('min'));
  const max = Number(params.get('max'));
  if (params.get('min') && Number.isFinite(min)) query = query.gte('price', min);
  if (params.get('max') && Number.isFinite(max)) query = query.lte('price', max);
  if (featured) query = query.eq('featured', true);
  const sort = params.get('sort') || 'newest';
  if (sort === 'price_low') query = query.order('price', { ascending: true, nullsFirst: false });
  else if (sort === 'price_high') query = query.order('price', { ascending: false, nullsFirst: false });
  else query = query.order('created_at', { ascending: false });
  const from = page * pageSize;
  const { data, error, count } = await query.range(from, from + pageSize - 1);
  if (error) throw error;
  return { data: await attachRelations(data || []), count: count || 0 };
}

export async function getListingBySlug(slug) {
  const { data, error } = await requireSupabase().from('public_properties')
    .select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data ? (await attachRelations([data]))[0] : null;
}

export async function getListingPreview(id) {
  const {data,error}=await requireSupabase().from('properties').select('*').eq('id',id).maybeSingle();
  if(error)throw error;
  return data?(await attachRelations([data]))[0]:null;
}

async function attachRelations(properties) {
  if (!properties.length) return [];
  const client=requireSupabase();
  const ids=properties.map((property)=>property.id);
  const agentIds=[...new Set(properties.map((property)=>property.agent_id).filter(Boolean))];
  const [imagesResult,agentsResult]=await Promise.all([
    client.from('property_images').select('id,property_id,storage_path,alt_text,is_cover,sort_order').in('property_id',ids).order('sort_order'),
    agentIds.length?client.from('agents').select('id,name,phone,whatsapp_phone,email').in('id',agentIds):Promise.resolve({data:[],error:null}),
  ]);
  if(imagesResult.error)throw imagesResult.error;
  if(agentsResult.error)throw agentsResult.error;
  const byProperty=new Map();for(const image of imagesResult.data||[]){const list=byProperty.get(image.property_id)||[];list.push(image);byProperty.set(image.property_id,list);}
  const byAgent=new Map((agentsResult.data||[]).map((agent)=>[agent.id,agent]));
  return properties.map((property)=>({...property,property_images:byProperty.get(property.id)||[],agent:byAgent.get(property.agent_id)||null}));
}

export function publicImageUrl(path) {
  return `${requireSupabase().storage.from('listing-images').getPublicUrl(path).data.publicUrl}`;
}

export async function submitEnquiry(enquiry) {
  const { error } = await requireSupabase().from('enquiries').insert(enquiry);
  if (error) throw error;
}
