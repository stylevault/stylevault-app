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
  const isForgot = pathname.startsWith('/forgot-password');
  const isReset = pathname.startsWith('/reset-password');
  const resetToken = isReset ? (query.get('token') || '').trim() : '';

  const next = safeNext(query.get('next'));
  if (store.user && !isForgot && !isReset) return navigate(next, { replace: true });

  if (isSignup) setTitle('Create your account', 'Join Style Vault to follow African countries, topics, and verified newsrooms.');
  else if (isForgot) setTitle('Reset your password', 'Request a secure password reset link for your Style Vault account.');
  else if (isReset) setTitle('Choose a new password', 'Set a new password for your Style Vault account.');
  else setTitle('Sign in to Style Vault', 'Sign in to access your followed African countries, topics, and saved stories.');

  const localCount = store.savedIds.size + store.monitors.length;
  const nextQs = next !== '/' ? `?next=${encodeURIComponent(next)}` : '';

  let visualTitle = 'Welcome back to <em>StyleVault.</em>';
  if (isSignup) visualTitle = 'Follow the African countries and stories <em>you care about.</em>';
  else if (isForgot || isReset) visualTitle = 'Account recovery &amp; <em>security.</em>';

  main.style.paddingBottom = '0';
  main.innerHTML = `
    <section class="auth-wrap">
      <aside class="auth-visual" aria-hidden="true">
        <img class="auth-visual-img" src="/assets/img/hero-map.webp" alt="" fetchpriority="high">
        <div class="auth-visual-copy">
          <span class="auth-kicker"><span class="live-dot-sm"></span>StyleVault · All 54 African countries</span>
          <h2>${visualTitle}</h2>
          <p>Country profiles, local news, and 15 years of World Bank numbers, with every story dated and linked to its original source.</p>
          ${isSignup ? `
            <ul class="auth-perks">
              <li>${icon('check')}<span>Follow any of Africa’s 54 countries and 13 topics</span></li>
              <li>${icon('check')}<span>Save stories and reports to read later</span></li>
              <li>${icon('check')}<span>Free to join. No card, no ads</span></li>
            </ul>` : `
            <ul class="auth-visual-stats">
              <li><strong>54</strong><span>countries</span></li>
              <li><strong>90+</strong><span>newsrooms</span></li>
              <li><strong>15 yrs</strong><span>of data</span></li>
            </ul>`}
        </div>
      </aside>

      <div class="auth-form">
        <div class="auth-form-inner">
          <a href="/" class="auth-back">${icon('arrow-right')}<span>Back to home</span></a>
          <div class="auth-card">
          <span class="auth-badge" aria-hidden="true">${icon(isSignup ? 'star' : isForgot ? 'lock' : isReset ? 'shield' : 'user')}</span>
          <div class="auth-form-head">
            ${isForgot ? `
              <span class="eyebrow">Password recovery</span>
              <h1>Reset your password</h1>
              <p class="auth-sub">Enter the email associated with your account and we’ll send you a secure link to reset your password.</p>
            ` : isReset ? `
              <span class="eyebrow">Account recovery</span>
              <h1>Choose a new password</h1>
              <p class="auth-sub">Enter a new secure password with at least 8 characters to regain access.</p>
            ` : `
              <span class="eyebrow">${isSignup ? 'Free account' : 'Sign in'}</span>
              <h1>${isSignup ? 'Create your account' : 'Sign in to StyleVault'}</h1>
              <p class="auth-sub">${isSignup ? 'Takes 30 seconds. Reading is free, with full access to all 54 countries.' : 'Pick up where you left off with your followed countries and saved stories.'}</p>
            `}
          </div>

          ${localCount && !isForgot && !isReset ? `<div class="auth-import-note">${icon('check')}<span>The ${localCount} ${localCount === 1 ? 'item' : 'items'} you saved or followed in this browser will sync into your account.</span></div>` : ''}

          <div data-auth-container>
            ${isReset && !resetToken ? `
              <div class="form-error show" style="margin-bottom:18px">Missing or expired password reset link. Please request a new one.</div>
              <a href="/forgot-password" class="btn btn-plum btn-block auth-submit-btn">Request a reset link ${icon('arrow-right')}</a>
              <div style="margin-top:16px;text-align:center"><a href="/login" class="text-link">Back to sign in</a></div>
            ` : `
              <form novalidate data-form class="auth-fields">
                ${isSignup ? `
                  <div class="field">
                    <label for="name">Your name</label>
                    <input class="input auth-input" id="name" name="name" autocomplete="name" placeholder="e.g. Amara Okafor" maxlength="80" required>
                  </div>` : ''}

                ${!isReset ? `
                  <div class="field">
                    <label for="email">Email address</label>
                    <input class="input auth-input" id="email" name="email" type="email" autocomplete="email" inputmode="email" placeholder="name@domain.com" required>
                  </div>` : ''}

                ${!isForgot ? `
                  <div class="field">
                    <div class="field-label-row">
                      <label for="password">${isReset ? 'New password' : 'Password'}</label>
                      ${isSignup || isReset ? '<span class="field-hint">Min. 8 characters</span>' : '<a href="/forgot-password" class="auth-forgot-link">Forgot password?</a>'}
                    </div>
                    <div class="input-wrap">
                      <input class="input auth-input" id="password" name="password" type="password" autocomplete="${isSignup || isReset ? 'new-password' : 'current-password'}" minlength="8" placeholder="••••••••" required>
                      <button class="reveal auth-reveal" type="button" data-reveal aria-label="Show password" aria-pressed="false">${icon('eye')}</button>
                    </div>
                    ${isSignup || isReset ? `
                      <div class="strength" aria-hidden="true"><i data-strength></i></div>
                      <span class="hint auth-pw-hint">At least 8 characters. A memorable phrase works best.</span>` : ''}
                  </div>` : ''}

                <p class="form-error" role="alert" data-error></p>

                <button class="btn btn-plum btn-block auth-submit-btn" type="submit">
                  <span>${isSignup ? 'Create free account' : isForgot ? 'Send reset link' : isReset ? 'Save password & sign in' : 'Sign in'}</span>
                  ${icon('arrow-right')}
                </button>
              </form>
            `}
          </div>

          </div>

          <div class="auth-divider"><span>${isForgot || isReset ? 'Remember your password?' : isSignup ? 'Already a member?' : 'New to StyleVault?'}</span></div>
          <a href="${isForgot || isReset ? '/login' : isSignup ? `/login${nextQs}` : `/signup${nextQs}`}" class="btn auth-switch-btn">
            ${isForgot || isReset ? 'Back to sign in' : isSignup ? 'Sign in instead' : 'Create a free account'}
          </a>

          <p class="auth-fine">A Ria’s Colony product · For the life you are becoming · <a href="/privacy" class="text-link" style="color:inherit;text-decoration:underline">Privacy Policy</a></p>
        </div>
      </div>
    </section>`;

  const form = $('[data-form]', main);
  if (!form) return;

  const errorBox = $('[data-error]', main);
  const showError = (msg) => { errorBox.textContent = msg; errorBox.classList.add('show'); };

  const revealBtn = $('[data-reveal]', main);
  if (revealBtn) {
    revealBtn.addEventListener('click', (e) => {
      const btn = e.currentTarget;
      const show = form.password.type === 'password';
      form.password.type = show ? 'text' : 'password';
      btn.setAttribute('aria-pressed', show);
      btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
  }

  if (isSignup || isReset) {
    const bar = $('[data-strength]', main);
    const colors = ['var(--danger)', 'var(--danger)', 'var(--rose)', 'var(--green)', 'var(--green)'];
    if (bar && form.password) {
      form.password.addEventListener('input', () => {
        const s = scorePassword(form.password.value);
        bar.style.width = `${form.password.value ? (s + 1) * 20 : 0}%`;
        bar.style.background = colors[s];
      });
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.classList.remove('show');

    // ── Forgot Password Submit ──────────────────────────────
    if (isForgot) {
      const email = form.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return showError('Please enter a valid email address.');
      const btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Sending link…';
      try {
        const res = await api.forgotPassword({ email });
        const container = $('[data-auth-container]', main);
        container.innerHTML = `
          <div class="auth-success-card">
            ${icon('check')}
            <div>
              <strong style="display:block;margin-bottom:4px;font-size:0.95rem">Check your inbox</strong>
              <span>If an account exists for <strong>${email}</strong>, we have sent instructions to reset your password. The link will remain active for 1 hour.</span>
            </div>
          </div>
          <div style="margin-top:20px;text-align:center">
            <a href="/login" class="text-link">Return to sign in</a>
          </div>
        `;
      } catch (err) {
        showError(err.message);
        btn.disabled = false;
        btn.textContent = 'Send reset link';
      }
      return;
    }

    // ── Reset Password Submit ───────────────────────────────
    if (isReset) {
      const password = form.password.value;
      if (password.length < 8) return showError('Your new password needs at least 8 characters.');
      const btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Updating password…';
      try {
        const { user } = await api.resetPassword({ token: resetToken, password });
        store.user = user;
        toast('Your password has been reset. You are now signed in.');
        navigate('/account', { replace: true });
      } catch (err) {
        showError(err.message);
        btn.disabled = false;
        btn.textContent = 'Save password & sign in';
      }
      return;
    }

    // ── Sign In / Sign Up Submit ────────────────────────────
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

  if (isSignup && form.name) form.name.focus({ preventScroll: true });
  else if (form.email) form.email.focus({ preventScroll: true });
  else if (form.password) form.password.focus({ preventScroll: true });
}
