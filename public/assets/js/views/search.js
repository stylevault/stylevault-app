import { api } from '../api.js';
import { $, esc } from '../lib.js';
import { store } from '../store.js';
import { emptyState, mountFeed } from '../ui.js';

const RANGES = { '': 'Any time', '1': 'Past 24 hours', '7': 'Past week', '30': 'Past month' };

export default function search(main, { query, setTitle, navigate }) {
  const q = (query.get('q') || '').trim();
  const country = query.get('country') || '';
  const topic = query.get('topic') || '';
  const source = query.get('source') || '';
  const days = RANGES[query.get('days') || ''] ? query.get('days') || '' : '';
  setTitle(q ? `“${q}”` : 'Search');

  main.innerHTML = `
    <header class="page-head search-hero">
      <span class="eyebrow">Search</span>
      <h1>${q ? `Results for “${esc(q)}”` : 'Search African news'}</h1>
      <form data-form role="search">
        <input class="input" name="q" type="search" value="${esc(q)}" placeholder="Try “AfCFTA”, “Lagos fashion week” or “cocoa prices”" aria-label="Search" autofocus>
        <button class="btn btn-primary" type="submit" style="height:54px;padding:0 28px">Search</button>
      </form>
    </header>
    <div class="filters">
      <select class="select" name="country" aria-label="Country"><option value="">All countries</option>
        ${store.meta.countries.map((c) => `<option value="${c.code}" ${c.code === country ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
      <select class="select" name="topic" aria-label="Topic"><option value="">All topics</option>
        ${store.meta.topics.map((t) => `<option value="${t.slug}" ${t.slug === topic ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
      <select class="select" name="source" aria-label="Publisher" data-sources><option value="">All publishers</option></select>
      <select class="select" name="days" aria-label="Date">
        ${Object.entries(RANGES).map(([k, v]) => `<option value="${k}" ${k === days ? 'selected' : ''}>${v}</option>`).join('')}</select>
    </div>
    <div data-feed></div>`;

  api.sources().then(({ items }) => {
    $('[data-sources]', main).insertAdjacentHTML('beforeend',
      items.map((s) => `<option value="${s.slug}" ${s.slug === source ? 'selected' : ''}>${esc(s.name)}</option>`).join(''));
  }).catch(() => {});

  const go = () => {
    const p = new URLSearchParams();
    const val = (n) => main.querySelector(`[name="${n}"]`).value.trim();
    for (const k of ['q', 'country', 'topic', 'source', 'days']) if (val(k)) p.set(k, val(k));
    navigate(`/search${p.toString() ? `?${p}` : ''}`, { replace: true });
  };
  $('[data-form]', main).addEventListener('submit', (e) => { e.preventDefault(); go(); });
  main.querySelectorAll('.filters select').forEach((s) => s.addEventListener('change', go));

  const feed = $('[data-feed]', main);
  if (!q && !country && !topic && !source) {
    feed.innerHTML = emptyState({ title: 'Find any story', body: 'Search headlines and teasers from every source, or narrow down by country, topic, publisher and date.' });
    return;
  }
  const from = days ? Math.floor(Date.now() / 1000) - Number(days) * 86400 : undefined;
  mountFeed(feed, (before) => api.articles({ q, country, topic, source, from, before }), {
    empty: emptyState({ title: 'No matching stories', body: 'Try fewer words, a different spelling, or widen the filters.' }),
  });
}
