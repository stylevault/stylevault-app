import { api } from '../api.js';
import { $, icon } from '../lib.js';
import { store } from '../store.js';
import { toast } from '../ui.js';

/** Only allow in-app redirects after sign-in. */
const safeNext = (v) => (v && v.startsWith('/') && !v.startsWith('//') ? v : '/');

function scorePassword(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

export default function auth(main, { pathname, query, setTitle, navigate }) {
  const isSignup = pathname.startsWith('/signup');
  const next = safeNext(query.get('next'));
  if (store.user) return navigate(next, { replace: true });
  setTitle(isSignup ? 'Create your account' : 'Sign in');
  const localCount = store.savedIds.size + store.monitors.length;
  const nextQs = next !== '/' ? `?next=${encodeURIComponent(next)}` : '';

  main.style.paddingBottom = '0';
  main.innerHTML = `
    <section class="auth">
      <div class="auth-art">
        <img src="/assets/img/vault-reader.jpg" alt="">
        <span class="badge" style="align-self:flex-start">Learn · Style Vault</span>
        <h2>${isSignup ? 'Your own library of African knowledge.' : 'Welcome back to your vault.'}</h2>
        <ul>
          <li>${icon('star')}<span>Follow the countries, subjects and keywords that matter to your work.</span></li>
          <li>${icon('bookmark')}<span>Save research and reporting, and find it again on any device.</span></li>
          <li>${icon('shield')}<span>Free. Your email is only used to sign you in.</span></li>
        </ul>
      </div>
      <div class="auth-form"><div>
        <div>
          <span class="eyebrow">${isSignup ? 'Join free' : 'Sign in'}</span>
          <h1 style="margin-top:8px">${isSignup ? 'Create your account' : 'Sign in to Style Vault'}</h1>
          <p class="muted" style="margin-top:8px">${isSignup ? 'It takes a few seconds. Reading stays free without one.' : 'Pick up where you left off.'}</p>
        </div>
        ${localCount ? `<div class="note">${icon('check')}<span>The ${localCount} ${localCount === 1 ? 'item' : 'items'} you saved or followed in this browser will move into your account.</span></div>` : ''}
        <form novalidate data-form>
          ${isSignup ? '<div class="field"><label for="name">Your name</label><input class="input" id="name" name="name" autocomplete="name" maxlength="80" required></div>' : ''}
          <div class="field"><label for="email">Email</label><input class="input" id="email" name="email" type="email" autocomplete="email" inputmode="email" required></div>
          <div class="field">
            <label for="password">Password</label>
            <div class="input-wrap">
              <input class="input" id="password" name="password" type="password" autocomplete="${isSignup ? 'new-password' : 'current-password'}" minlength="8" required>
              <button class="reveal" type="button" data-reveal aria-label="Show password" aria-pressed="false">${icon('eye')}</button>
            </div>
            ${isSignup ? '<div class="strength" aria-hidden="true"><i data-strength></i></div><span class="hint">At least 8 characters. A short phrase is easy to remember and hard to guess.</span>' : ''}
          </div>
          <p class="form-error" role="alert" data-error></p>
          <button class="btn btn-plum btn-block" type="submit" style="height:52px">${isSignup ? 'Create account' : 'Sign in'}</button>
        </form>
        <p class="auth-switch">${isSignup
          ? `Already have an account? <a href="/login${nextQs}">Sign in</a>`
          : `New to Style Vault? <a href="/signup${nextQs}">Create a free account</a>`}</p>
        <p class="fine">Style Vault is a Ria’s Colony product.</p>
      </div></div>
    </section>`;

  const form = $('[data-form]', main);
  const errorBox = $('[data-error]', main);
  const showError = (msg) => { errorBox.textContent = msg; errorBox.classList.add('show'); };

  $('[data-reveal]', main).addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const show = form.password.type === 'password';
    form.password.type = show ? 'text' : 'password';
    btn.setAttribute('aria-pressed', show);
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  if (isSignup) {
    const bar = $('[data-strength]', main);
    const colors = ['var(--danger)', 'var(--danger)', 'var(--gold)', 'var(--green)', 'var(--green)'];
    form.password.addEventListener('input', () => {
      const s = scorePassword(form.password.value);
      bar.style.width = `${form.password.value ? (s + 1) * 20 : 0}%`;
      bar.style.background = colors[s];
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.remove('show');
    const body = { email: form.email.value.trim(), password: form.password.value };
    if (isSignup) body.name = form.name.value.trim();

    if (isSignup && !body.name) return showError('Please enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email)) return showError('Please enter a valid email address.');
    if (body.password.length < 8) return showError('Your password needs at least 8 characters.');

    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = isSignup ? 'Creating your account…' : 'Signing in…';
    try {
      const { user } = isSignup ? await api.signup(body) : await api.login(body);
      const { imported } = await store.afterSignIn();
      toast(isSignup ? `Welcome to Style Vault, ${user.name.split(' ')[0]}` : `Welcome back, ${user.name.split(' ')[0]}`);
      if (imported) setTimeout(() => toast(`Moved ${imported} ${imported === 1 ? 'item' : 'items'} into your account`), 600);
      navigate(isSignup && next === '/' ? '/following' : next, { replace: true });
    } catch (err) {
      showError(err.message);
      btn.disabled = false;
      btn.textContent = isSignup ? 'Create account' : 'Sign in';
    }
  });

  (isSignup ? form.name : form.email).focus({ preventScroll: true });
}
