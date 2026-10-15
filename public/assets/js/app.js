import { $, $$, esc, icon, initials } from './lib.js';
import { store } from './store.js';
import { bindGlobalActions, toast } from './ui.js';

const routes = [
  ['/', 'home', () => import('./views/home.js')],
  ['/countries', 'countries', () => import('./views/countries.js')],
  ['/country/:slug', 'countries', () => import('./views/country.js')],
  ['/research', 'research', () => import('./views/research.js')],
  ['/news', 'news', () => import('./views/news.js')],
  ['/topics', 'topics', () => import('./views/topics.js')],
  ['/topic/:slug', 'topics', () => import('./views/topic.js')],
  ['/search', 'search', () => import('./views/search.js')],
  ['/following', 'following', () => import('./views/monitor.js')],
  ['/monitor', 'following', () => import('./views/monitor.js')],
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
  history[replace ? 'replaceState' : 'pushState']({}, '', target.pathname + target.search + target.hash);
  render();
}

export function setTitle(title) {
  document.title = title ? `${title} · Style Vault` : 'Style Vault · Understand Africa, one country at a time';
}

async function render() {
  const token = ++renderToken;
  const { pathname, searchParams, hash } = new URL(location.href);
  const route = routes.find((r) => r.re.test(pathname));
  const match = route?.re.exec(pathname);

  cleanup?.();
  cleanup = null;
  setActiveNav(route?.nav);

  const mod = route ? await route.load() : await import('./views/notfound.js');
  await store.ready;
  if (token !== renderToken) return; // a newer navigation started

  // A fresh <main> per page, so listeners a view attached to the old one are dropped.
  const fresh = main.cloneNode(false);
  main.replaceWith(fresh);
  main = fresh;
  if (!hash) window.scrollTo({ top: 0 });

  const result = await mod.default(main, { params: match?.groups || {}, query: searchParams, pathname, navigate, setTitle });
  if (token === renderToken && typeof result === 'function') cleanup = result;
  if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  else main.focus({ preventScroll: true });
}

function setActiveNav(nav) {
  $$('[data-nav]').forEach((a) => {
    if (a.dataset.nav === nav) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

// ── Header account area & badges ────────────────────────────────────────────
function accountHtml(compact) {
  const u = store.user;
  if (!u) {
    return compact
      ? `<a class="nav-icon" href="/login" aria-label="Sign in">${icon('user')}</a>`
      : `<a class="btn btn-blue btn-sm" href="/login">Sign in</a>`;
  }
  return `
    <div class="account-menu">
      <button type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Account menu"><span class="avatar">${esc(initials(u.name))}</span></button>
      <div class="menu-pop" role="menu">
        <div class="menu-head"><strong>${esc(u.name)}</strong><span>${esc(u.email)}</span></div>
        <a href="/following" role="menuitem">${icon('star')} Following</a>
        <a href="/saved" role="menuitem">${icon('bookmark')} Saved</a>
        <a href="/account" role="menuitem">${icon('user')} Account settings</a>
        <button type="button" role="menuitem" data-signout>${icon('logout')} Sign out</button>
      </div>
    </div>`;
}

function renderChrome() {
  $('[data-account-slot]').innerHTML = accountHtml(false);
  $('[data-account-slot-mobile]').innerHTML = accountHtml(true);
  const n = store.savedIds.size;
  $('[data-saved-count]').hidden = !n;
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
    if (url.pathname === location.pathname && url.search === location.search && url.hash) return; // in-page anchor
    e.preventDefault();
    $$('.account-menu.open').forEach((m) => m.classList.remove('open'));
    navigate(url.href);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$('.account-menu.open').forEach((m) => m.classList.remove('open'));
  });

  window.addEventListener('popstate', render);
}

bindGlobalActions();
bindChrome();
store.on(renderChrome);
store.init();
render();
