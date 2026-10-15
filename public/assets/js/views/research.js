import { api } from '../api.js';
import { $, esc } from '../lib.js';
import { store } from '../store.js';
import { emptyState, mountFeed } from '../ui.js';

const KINDS = [
  ['research,analysis,official', 'Everything'],
  ['research', 'Research'],
  ['analysis', 'Analysis'],
  ['official', 'Official'],
];

export default function research(main, { query, setTitle, navigate }) {
  setTitle('Research & analysis');
  const kind = KINDS.some(([k]) => k === query.get('kind')) ? query.get('kind') : KINDS[0][0];
  const country = store.countryByCode.has(query.get('country')) ? query.get('country') : '';
  const topic = store.topicBySlug.has(query.get('topic')) ? query.get('topic') : '';

  main.innerHTML = `
    <section class="page-hero"><div class="wrap">
      <span class="eyebrow accent">Research &amp; analysis</span>
      <h1>${country ? `Research on ${esc(store.countryByCode.get(country).name)}` : 'Read deeper'}</h1>
      <p class="lede">Long-form work from think tanks, universities, survey organisations and public institutions, alongside expert analysis from Africa-focused publications.</p>
    </div></section>
    <div class="wrap" style="padding-top:36px">
      <div class="toolbar">
        <div class="chips" role="toolbar" aria-label="Type">
          ${KINDS.map(([k, label]) => `<button class="chip" type="button" data-kind="${k}" aria-pressed="${k === kind}">${label}</button>`).join('')}
        </div>
        <select class="select" data-filter="country" aria-label="Country"><option value="">All countries</option>
          ${store.meta.countries.map((c) => `<option value="${c.code}" ${c.code === country ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
        <select class="select" data-filter="topic" aria-label="Topic"><option value="">All topics</option>
          ${store.meta.topics.map((t) => `<option value="${t.slug}" ${t.slug === topic ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
      </div>
      <div data-feed></div>
    </div>`;

  const go = (changes) => {
    const p = new URLSearchParams({ kind, country, topic, ...changes });
    for (const [k, v] of [...p]) if (!v || (k === 'kind' && v === KINDS[0][0])) p.delete(k);
    navigate(`/research${p.toString() ? `?${p}` : ''}`, { replace: true });
  };
  main.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-kind]');
    if (chip) go({ kind: chip.dataset.kind });
  });
  main.querySelectorAll('[data-filter]').forEach((s) => s.addEventListener('change', () => go({ [s.dataset.filter]: s.value })));

  mountFeed($('[data-feed]', main), (before) => api.articles({ kind: kind.split(','), country, topic, before, limit: 12 }), {
    layout: 'cards',
    empty: emptyState({ title: 'Nothing matches yet', body: 'Try another country or topic. New publications are collected every hour.' }),
  });
}
