const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escapes text for safe interpolation into HTML templates. */
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const icon = (name, cls = 'icon') => `<svg class="${cls}" aria-hidden="true"><use href="/assets/img/sprite.svg#${name}"/></svg>`;

export const flag = (code, cls = 'flag', alt = '') =>
  code ? `<img class="${cls}" src="/flags/${code.toLowerCase()}.svg" alt="${esc(alt)}" width="20" height="15" loading="lazy" decoding="async">` : '';

export function timeAgo(unix) {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - unix));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return new Date(unix * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export const fullDate = (unix) =>
  new Date(unix * 1000).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const today = () =>
  new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const nf = (n) => new Intl.NumberFormat().format(n || 0);

export const initials = (name) =>
  String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export function debounce(fn, ms = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export const storage = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* storage full or blocked: the app still works for this visit */ }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch { /* ignore */ }
  },
};
