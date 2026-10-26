import { requireSupabase } from '../supabaseClient.js';

const client = requireSupabase();
const loginForm = document.querySelector('[data-login-form]');
const loginMessage = document.querySelector('[data-login-message]');
const signupForm = document.querySelector('[data-signup-form]');
const signupMessage = document.querySelector('[data-signup-message]');

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
    const { error } = await client.auth.signInWithPassword({
      email: loginForm.elements.email.value.trim(),
      password: loginForm.elements.password.value,
    });
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

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = signupForm.querySelector('button');
  button.disabled = true;
  signupMessage.className = '';
  signupMessage.textContent = 'Creating account…';
  try {
    const { data, error } = await client.auth.signUp({
      email: signupForm.elements.email.value.trim(),
      password: signupForm.elements.password.value,
    });
    if (error) throw error;

    if (data.session) {
      await ensureAdminMembership();
      signupMessage.className = 'success';
      signupMessage.textContent = 'Account created. Opening the admin dashboard…';
      location.replace('dashboard.html');
      return;
    }

    signupMessage.className = 'success';
    signupMessage.textContent = 'Account created. Check your email to confirm it, then sign in here. Your admin access will be enabled when you sign in.';
  } catch (error) {
    signupMessage.className = 'error';
    signupMessage.textContent = error.message || 'Account creation failed. Please try again.';
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
  if (membership) return;

  const { error: insertError } = await client.from('admins').insert({ user_id: user.id });
  if (insertError) throw insertError;
}
