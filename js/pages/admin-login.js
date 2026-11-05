import { requireSupabase } from '../supabaseClient.js';

const client = requireSupabase();
const loginForm = document.querySelector('[data-login-form]');
const loginMessage = document.querySelector('[data-login-message]');

if (new URLSearchParams(location.search).has('denied')) {
  loginMessage.className = 'error';
  loginMessage.textContent = 'This account is not on the administrator list.';
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector('button');
  button.disabled = true;
  loginMessage.className = '';
  loginMessage.textContent = 'Signing in…';
  try {
    const identifier = loginForm.elements.identifier.value.trim();
    const credentials = identifier.includes('@')
      ? { email: identifier, password: loginForm.elements.password.value }
      : { phone: identifier, password: loginForm.elements.password.value };
    const { error } = await client.auth.signInWithPassword(credentials);
    if (error) throw error;
    await ensureAdminMembership();
    location.replace('dashboard.html');
  } catch (error) {
    loginMessage.className = 'error';
    loginMessage.textContent = error.message || 'Sign in failed. Check the account and try again.';
  } finally {
    button.disabled = false;
  }
});

async function ensureAdminMembership() {
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Sign in again to finish setting up admin access.');

  const { data: membership, error: readError } = await client
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (readError) throw readError;
  if (!membership) throw new Error('This account is not authorised to access the admin area.');
}
