import { api } from '../api.js';
import { $, esc, icon } from '../lib.js';
import { store } from '../store.js';
import { anyCard, emptyState, mountFeed } from '../ui.js';

const RANGES = { '': 'Any time', '7': 'Past week', '30': 'Past month', '90': 'Past 3 months' };
const KINDS = { '': 'All sources', news: 'News', research: 'Research', analysis: 'Analysis', official: 'Official' };

export default function search(main, { query, setTitle, navigate }) {
  const q = (query.get('q') || '').trim();
  const country = query.get('country') || '';
  const topic = query.get('topic') || '';
  const kind = KINDS[query.get('kind') || ''] ? query.get('kind') || '' : '';
  const days = RANGES[query.get('days') || ''] ? query.get('days') || '' : '';
  setTitle(q ? `“${q}”` : 'Search');

  // A query that is exactly a country name goes straight to its file.
  const exact = store.meta.countries.find((c) => c.name.toLowerCase() === q.toLowerCase());

  main.innerHTML = `
    <section class="page-hero"><div class="wrap">
      <span class="eyebrow accent">Search</span>
      <h1>${q ? `Results for “${esc(q)}”` : 'Search Style Vault'}</h1>
      <form class="hero-search" role="search" data-form style="margin-top:22px">
        ${icon('search')}
        <input type="search" name="q" value="${esc(q)}" placeholder="Try “AfCFTA”, “Ghana cocoa” or “Afrobarometer”" aria-label="Search" style="box-shadow:var(--shadow);border:1px solid var(--line)">
        <button class="btn btn-accent" type="submit">Search</button>
      </form>
    </div></section>
    <div class="wrap" style="padding-top:32px;max-width:920px">
      ${exact ? `<a class="note plum" href="/country/${exact.slug}" style="margin-bottom:20px;text-decoration:none">${icon('map')}<span>Looking for the country? <strong>Open the ${esc(exact.name)} country file →</strong></span></a>` : ''}
      <div class="toolbar">
        <select class="select" name="country" aria-label="Country"><option value="">All countries</option>
          ${store.meta.countries.map((c) => `<option value="${c.code}" ${c.code === country ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
        <select class="select" name="topic" aria-label="Topic"><option value="">All topics</option>
          ${store.meta.topics.map((t) => `<option value="${t.slug}" ${t.slug === topic ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
        <select class="select" name="kind" aria-label="Type of source">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}" ${k === kind ? 'selected' : ''}>${v}</option>`).join('')}</select>
        <select class="select" name="days" aria-label="Date">${Object.entries(RANGES).map(([k, v]) => `<option value="${k}" ${k === days ? 'selected' : ''}>${v}</option>`).join('')}</select>
      </div>
      <div data-feed></div>
    </div>`;

  const go = () => {
    const p = new URLSearchParams();
    const val = (n) => main.querySelector(`[name="${n}"]`).value.trim();
    for (const k of ['q', 'country', 'topic', 'kind', 'days']) if (val(k)) p.set(k, val(k));
    navigate(`/search${p.toString() ? `?${p}` : ''}`, { replace: true });
  };
  $('[data-form]', main).addEventListener('submit', (e) => { e.preventDefault(); go(); });
  main.querySelectorAll('.toolbar select').forEach((s) => s.addEventListener('change', go));

  const feed = $('[data-feed]', main);
  if (!q && !country && !topic && !kind) {
    feed.innerHTML = emptyState({ title: 'Find anything', body: 'Search headlines and summaries from every source, then narrow by country, topic, type of source and date.', iconName: 'search' });
    return;
  }
  const from = days ? Math.floor(Date.now() / 1000) - Number(days) * 86400 : undefined;
  mountFeed(feed, (before) => api.articles({ q, country, topic, kind, from, before }), {
    render: anyCard,
    empty: emptyState({ title: 'No matches', body: 'Try fewer words, another spelling, or wider filters.', iconName: 'search' }),
  });
}
