import { requireSupabase } from './supabaseClient.js';

export async function requireAdmin() {
  const client=requireSupabase();
  const {data:{session},error:sessionError}=await client.auth.getSession();
  if(sessionError)throw sessionError;
  if(!session){location.replace('login.html');return null;}
  const {data:membership,error}=await client.from('admins').select('user_id').eq('user_id',session.user.id).maybeSingle();
  if(error)throw error;
  if(!membership){await client.auth.signOut();location.replace('login.html?denied=1');return null;}
  return session;
}

export async function signOut() { const {error}=await requireSupabase().auth.signOut();if(error)throw error;location.replace('login.html'); }
