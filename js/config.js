// Public browser configuration only. These values are not secrets.
// Replace both placeholders with the project's URL and anon/publishable key.
export const SUPABASE_URL = 'https://bzllrwligxqscqkuyvxt.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_UPGCLrU-xjxDK5K8CtsIMw_uTSpC_3g';

export const isSupabaseConfigured =
  !SUPABASE_URL.includes('[') &&
  !SUPABASE_ANON_KEY.includes('[') &&
  SUPABASE_ANON_KEY.length > 20;
