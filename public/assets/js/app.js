import { $, $$, esc, icon, initials } from './lib.js';
import { store } from './store.js';
import { bindGlobalActions, toast } from './ui.js';

const routes = [
  ['/', 'home', () => import('./views/home.js')],
  ['/countries', 'countries', () => import('./views/countries.js')],
  ['/country/:slug', 'countries', () => import('./views/country.js')],
  ['/topics', 'topics', () => import('./views/topics.js')],
  ['/topic/:slug', 'topics', () => import('./views/topic.js')],
  ['/search', 'search', () => import('./views/search.js')],
  ['/monitor', 'monitor', () => import('./views/monitor.js')],
  ['/saved', 'saved', () => import('./views/saved.js')],
  ['/login', 'account', () => import('./views/auth.js')],
  ['/signup', 'account', () => import('./views/auth.js')],
  ['/account', 'account', () => import('./views/account.js')],
  ['/sources', null, () => import('./views/sources.js')],
  ['/about', null, () => import('./views/about.js')],
].map(([path, nav, load]) => ({ nav, load, re: new RegExp(`^${path.replace(/:(\w+)/g, '(?<$1>[^/]+)')}/?$`) }));

let main = $('#main');
let cleanup = null;
let renderToken = 0;

export function navigate(url, { replace = false } = {}) {
  const target = new URL(url, location.origin);
  if (target.href === location.href && !replace) return render();
  history[replace ? 'replaceState' : 'pushState']({}, '', target.pathname + target.search);
  render();
}

export function setTitle(title) {
  document.title = title ? `${title} · StyleVault` : 'StyleVault: Africa, in its own style';
}

async function render() {
  const token = ++renderToken;
  const { pathname, searchParams } = new URL(location.href);
  const route = routes.find((r) => r.re.test(pathname));
  const match = route?.re.exec(pathname);

  cleanup?.();
  cleanup = null;
  setActiveNav(route?.nav);
  window.scrollTo({ top: 0 });

  const mod = route ? await route.load() : await import('./views/notfound.js');
  await store.ready;
  if (token !== renderToken) return; // a newer navigation started

  // A fresh <main> per page, so listeners a view attached to the old one are dropped.
  const fresh = main.cloneNode(false);
  main.replaceWith(fresh);
  main = fresh;
  const result = await mod.default(main, {
    params: match?.groups || {},
    query: searchParams,
    pathname,
    navigate,
    setTitle,
  });
  if (token === renderToken && typeof result === 'function') cleanup = result;
  main.focus({ preventScroll: true });
}

function setActiveNav(nav) {
  $$('[data-nav]').forEach((a) => {
    if (a.dataset.nav === nav) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

// ── Header account area & badges ────────────────────────────────────────────
function renderChrome() {
  const slot = $('[data-account-slot]');
  const u = store.user;
  if (u) {
    slot.innerHTML = `
      <div class="account-menu">
        <button type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Account menu"><span class="avatar">${esc(initials(u.name))}</span></button>
        <div class="menu-pop" role="menu">
          <div class="menu-head"><strong>${esc(u.name)}</strong><span>${esc(u.email)}</span></div>
          <a href="/monitor" role="menuitem">${icon('radar')} My Monitor</a>
          <a href="/saved" role="menuitem">${icon('bookmark')} Saved stories</a>
          <a href="/account" role="menuitem">${icon('user')} Account settings</a>
          <button type="button" role="menuitem" data-signout>${icon('logout')} Sign out</button>
        </div>
      </div>`;
  } else {
    slot.innerHTML = `
      <a class="btn btn-ghost btn-sm" href="/login">${icon('user')}<span class="btn-signin-text">Sign in</span></a>`;
  }
  $('[data-tab-account-label]').textContent = u ? 'Account' : 'Sign in';

  const n = store.savedIds.size;
  const pill = $('[data-saved-count]');
  pill.hidden = !n;
  pill.textContent = n > 99 ? '99+' : n;
  $('[data-saved-dot]').hidden = !n;
}

function bindChrome() {
  document.addEventListener('click', async (e) => {
    const menu = e.target.closest('.account-menu');
    $$('.account-menu.open').forEach((m) => { if (m !== menu) m.classList.remove('open'); });
    if (menu && e.target.closest('.account-menu > button')) {
      const open = menu.classList.toggle('open');
      menu.querySelector('button').setAttribute('aria-expanded', open);
    }
    if (e.target.closest('[data-signout]')) {
      await store.signOut();
      toast('Signed out. See you soon.');
      navigate('/');
    }

    // Client-side navigation for same-origin links.
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
    e.preventDefault();
    $$('.account-menu.open').forEach((m) => m.classList.remove('open'));
    navigate(url.href);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$('.account-menu.open').forEach((m) => m.classList.remove('open'));
    // "/" focuses search, like most news sites
    if (e.key === '/' && !e.target.closest('input, textarea, select, [contenteditable]')) {
      const input = $('.header-search input');
      if (input && input.offsetParent) {
        e.preventDefault();
        input.focus();
      }
    }
  });

  $('.header-search').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = e.target.q.value.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
    e.target.q.blur();
  });

  $('[data-theme-toggle]').addEventListener('click', () => {
    const root = document.documentElement;
    const isDark = root.dataset.theme
      ? root.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = isDark ? 'light' : 'dark';
    try {
      localStorage.setItem('sv.theme', root.dataset.theme); // read raw by theme.js before first paint
    } catch { /* storage blocked: the choice lasts for this visit */ }
  });

  window.addEventListener('popstate', render);
}

bindGlobalActions();
bindChrome();
store.on(renderChrome);
store.init();
render();
