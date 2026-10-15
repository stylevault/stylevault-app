const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escapes text for safe interpolation into HTML templates. */
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const icon = (name, cls = 'icon') => `<svg class="${cls}" aria-hidden="true"><use href="/assets/img/sprite.svg#${name}"/></svg>`;

export const flag = (code, cls = 'flag', alt = '') =>
  code ? `<img class="${cls}" src="/flags/${code.toLowerCase()}.svg" alt="${esc(alt)}" width="20" height="15" loading="lazy" decoding="async">` : '';

/** "15 Oct 2026": calm, citable dates rather than "3 min ago". */
export const shortDate = (unix) =>
  new Date(unix * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const longDate = (unix) =>
  new Date(unix * 1000).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const nf = (n, digits = 0) => new Intl.NumberFormat('en-GB', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n || 0);

/** Formats a World Bank value according to the indicator's kind. */
export function formatIndicator(value, format) {
  if (value === null || value === undefined) return '—';
  const big = (v) => (v >= 1e12 ? `${nf(v / 1e12, 2)} trillion` : v >= 1e9 ? `${nf(v / 1e9, 1)} billion` : v >= 1e6 ? `${nf(v / 1e6, 1)} million` : nf(v));
  switch (format) {
    case 'people': return big(value);
    case 'usd-big': return `$${big(value)}`;
    case 'usd': return `$${nf(value)}`;
    case 'pct': return `${nf(value, 1)}%`;
    case 'years': return `${nf(value, 1)} years`;
    default: return nf(value, 1);
  }
}

/** Small area+line chart for a [year, value] series. */
export function sparkline(series) {
  if (!series || series.length < 2) return '';
  const w = 200, h = 46, pad = 3;
  const xs = series.map((p) => p[0]);
  const ys = series.map((p) => p[1]);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];
  const sx = (x) => pad + ((x - x0) / (x1 - x0 || 1)) * (w - pad * 2);
  const sy = (y) => h - pad - ((y - y0) / (y1 - y0 || 1)) * (h - pad * 2);
  const pts = series.map(([x, y]) => `${sx(x).toFixed(1)},${sy(y).toFixed(1)}`);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <path class="area" d="M${pts[0]} L${pts.join(' L')} L${sx(x1).toFixed(1)},${h} L${sx(x0).toFixed(1)},${h} Z"/>
    <path class="line" d="M${pts.join(' L')}"/></svg>`;
}

export const initials = (name) =>
  String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export const KIND_LABELS = { research: 'Research', analysis: 'Analysis', official: 'Official', news: 'News' };

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
