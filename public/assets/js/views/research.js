import { api } from '../api.js';
import { $, esc, flag, icon } from '../lib.js';
import { store } from '../store.js';
import { emptyState, mountFeed, openOptionPicker, readCard } from '../ui.js';

const KINDS = [
  ['research,analysis,official', 'Everything'],
  ['research', 'Research'],
  ['analysis', 'Analysis'],
  ['official', 'Official'],
];
const KIND_ICONS = { 'research,analysis,official': 'layers', research: 'book', analysis: 'chart', official: 'building' };

const filterButton = (key, label, value, badge, isSet) => `
  <button type="button" class="rf-btn ${isSet ? 'is-set' : ''}" data-pick="${key}" aria-haspopup="dialog" aria-label="${label}: ${esc(value)}">
    <span class="rf-ico" aria-hidden="true">${badge}</span>
    <span class="rf-copy"><small>${label}</small><strong>${esc(value)}</strong></span>
    ${icon('chevron-down', 'icon rf-chev')}
  </button>`;

export default function research(main, { query, setTitle, navigate }) {
  setTitle('Research & analysis');
  const kind = KINDS.some(([k]) => k === query.get('kind')) ? query.get('kind') : KINDS[0][0];
  const country = store.countryByCode.has(query.get('country')) ? query.get('country') : '';
  const topic = store.topicBySlug.has(query.get('topic')) ? query.get('topic') : '';

  main.innerHTML = `
    <section class="page-hero research-hero"><div class="wrap">
      <span class="eyebrow accent">Research &amp; reports</span>
      <h1>${country ? `Research on ${esc(store.countryByCode.get(country).name)}` : 'Read deeper'}</h1>
      <p class="lede">Reports and studies from think tanks, universities, and public institutions across Africa.</p>
    </div></section>
    <div class="wrap" style="padding-top:36px">
      <div class="rf-bar">
        ${filterButton('kind', 'Type', KINDS.find(([k]) => k === kind)[1], icon('layers'), kind !== KINDS[0][0])}
        ${filterButton('country', 'Country', country ? store.countryByCode.get(country).name : 'All countries', country ? flag(country, 'flag', '') : icon('globe'), !!country)}
        ${filterButton('topic', 'Topic', topic ? store.topicBySlug.get(topic).name : 'All topics', icon('book'), !!topic)}
      </div>
      <div data-feed></div>
    </div>`;

  const go = (changes) => {
    const p = new URLSearchParams({ kind, country, topic, ...changes });
    for (const [k, v] of [...p]) if (!v || (k === 'kind' && v === KINDS[0][0])) p.delete(k);
    navigate(`/research${p.toString() ? `?${p}` : ''}`, { replace: true });
  };
  const pickers = {
    kind: () => openOptionPicker({
      title: 'Type of reading', kicker: 'Filter research', iconName: 'layers', selected: kind,
      options: KINDS.map(([k, label]) => ({ value: k, label, icon: KIND_ICONS[k] })),
      onSelect: (v) => go({ kind: v }),
    }),
    country: () => openOptionPicker({
      title: 'Choose a country', kicker: 'Filter research', iconName: 'globe', selected: country, searchable: true,
      options: [{ value: '', label: 'All countries', icon: 'globe' }, ...store.meta.countries.map((c) => ({ value: c.code, label: c.name, flag: c.code }))],
      onSelect: (v) => go({ country: v }),
    }),
    topic: () => openOptionPicker({
      title: 'Choose a topic', kicker: 'Filter research', iconName: 'book', selected: topic,
      options: [{ value: '', label: 'All topics', icon: 'layers' }, ...store.meta.topics.map((t) => ({ value: t.slug, label: t.name, icon: 'book' }))],
      onSelect: (v) => go({ topic: v }),
    }),
  };
  main.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pick]');
    if (btn) pickers[btn.dataset.pick]();
  });

  const isGuest = !store.user;

  mountFeed($('[data-feed]', main), async (before) => {
    return api.articles({ kind: kind.split(','), country, topic, before, limit: isGuest ? 6 : 12 });
  }, {
    layout: 'cards',
    render: (a, idx) => {
      const locked = isGuest && idx >= 3;
      return readCard(a, { locked });
    },
    empty: emptyState({ title: 'Nothing matches yet', body: 'Try another country or topic. We check for new reports every hour.' }),
  }).then(() => {
    if (isGuest) {
      const feedEl = $('[data-feed]', main);
      if (feedEl && !feedEl.querySelector('.gate-card')) {
        feedEl.insertAdjacentHTML('beforeend', `
          <div class="gate-card" style="margin-top:40px">
            <div class="gate-copy">
              <span class="lock-badge">Member Access</span>
              <h3 style="margin-top:12px">Read the full research library</h3>
              <p>Guests can preview the first few reports. Create a free account to open every research paper and study.</p>
            </div>
            <div class="gate-box">
              <strong>Free Account</strong>
              <span>Takes 30 seconds</span>
              <a class="btn btn-plum btn-block" href="/signup">Create free account</a>
              <a class="btn btn-outline btn-block" href="/login">Sign in</a>
            </div>
          </div>
        `);
      }
    }
  });
}
