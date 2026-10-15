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

  main.innerHTML = `
    <section class="auth">
      <div class="auth-art">
        <svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true"><use href="/assets/img/sprite.svg#mark"/></svg>
        <h2>${isSignup ? 'Your own desk for <em>African news.</em>' : 'Welcome back to <em>the vault.</em>'}</h2>
        <ul>
          <li>${icon('radar')}<span>Monitors that follow the countries, industries and keywords you care about.</span></li>
          <li>${icon('bookmark')}<span>Saved stories that stay with you on your phone, tablet and laptop.</span></li>
          <li>${icon('globe')}<span>All 54 countries, straight from African newsrooms, free.</span></li>
        </ul>
      </div>
      <div class="auth-form">
        <div>
          <h1>${isSignup ? 'Create your account' : 'Sign in'}</h1>
          <p class="lede">${isSignup ? 'Free, and it takes a few seconds.' : 'Pick up where you left off.'}</p>
        </div>
        ${localCount ? `<div class="sync-note">${icon('check')}<span>The ${localCount} ${localCount === 1 ? 'item' : 'items'} you saved in this browser will move into your account.</span></div>` : ''}
        <form novalidate data-form>
          ${isSignup ? `<div class="field"><label for="name">Your name</label><input class="input" id="name" name="name" autocomplete="name" maxlength="80" required></div>` : ''}
          <div class="field"><label for="email">Email</label><input class="input" id="email" name="email" type="email" autocomplete="email" inputmode="email" required></div>
          <div class="field">
            <label for="password">Password</label>
            <div class="input-wrap">
              <input class="input" id="password" name="password" type="password" autocomplete="${isSignup ? 'new-password' : 'current-password'}" minlength="8" required>
              <button class="icon-btn reveal" type="button" data-reveal aria-label="Show password" aria-pressed="false">${icon('eye')}</button>
            </div>
            ${isSignup ? '<div class="strength" aria-hidden="true"><i data-strength></i></div><span class="hint">At least 8 characters. A short phrase is easy to remember and hard to guess.</span>' : ''}
          </div>
          <p class="form-error" role="alert" data-error></p>
          <button class="btn btn-primary btn-block" type="submit" style="height:50px">${isSignup ? 'Create account' : 'Sign in'}</button>
        </form>
        <p class="auth-switch">${isSignup
          ? `Already have an account? <a href="/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}">Sign in</a>`
          : `New to StyleVault? <a href="/signup${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}">Create a free account</a>`}</p>
        <p class="fine">You can read everything without an account. We only use your email to sign you in.</p>
      </div>
    </section>`;

  const form = $('[data-form]', main);
  const errorBox = $('[data-error]', main);
  const showError = (msg) => { errorBox.textContent = msg; errorBox.classList.add('show'); };

  $('[data-reveal]', main).addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const input = form.password;
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.setAttribute('aria-pressed', show);
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  if (isSignup) {
    const bar = $('[data-strength]', main);
    const colors = ['var(--danger)', 'var(--danger)', 'var(--gold)', 'var(--malachite)', 'var(--malachite)'];
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
      toast(isSignup ? `Welcome to StyleVault, ${user.name.split(' ')[0]}!` : `Welcome back, ${user.name.split(' ')[0]}`);
      if (imported) setTimeout(() => toast(`Moved ${imported} saved ${imported === 1 ? 'item' : 'items'} into your account`), 600);
      navigate(isSignup && next === '/' ? '/monitor' : next, { replace: true });
    } catch (err) {
      showError(err.message);
      btn.disabled = false;
      btn.textContent = isSignup ? 'Create account' : 'Sign in';
    }
  });

  (isSignup ? form.name : form.email).focus();
}

