import { api } from '../api.js';
import { $, $$, esc } from '../lib.js';
import { store } from '../store.js';
import { emptyState, mountFeed } from '../ui.js';
import { filterAds, getActiveAds, renderBannerAdHtml } from '../ads.js';

export default function news(main, { query, setTitle, navigate }) {
  setTitle('News');
  const country = store.countryByCode.has(query.get('country')) ? query.get('country') : '';
  let topic = store.topicBySlug.has(query.get('topic')) ? query.get('topic') : '';

  main.innerHTML = `
    <section class="page-hero"><div class="wrap">
      <span class="eyebrow">From African newsrooms</span>
      <h1>News</h1>
      <p class="lede">Reporting from newsrooms across the continent, dated and linked to the original publisher.</p>
    </div></section>
    <div data-ad-banner-slot></div>
    <div class="wrap" style="padding-top:36px;max-width:920px">
      <div class="toolbar">
        <select class="select" data-country aria-label="Country"><option value="">All countries</option>
          ${store.meta.countries.map((c) => `<option value="${c.code}" ${c.code === country ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
      </div>
      <div class="chips" role="toolbar" aria-label="Topic" data-topics style="margin-bottom:20px">
        <button class="chip" type="button" data-topic="" aria-pressed="${!topic}">All topics</button>
        ${store.meta.topics.map((t) => `<button class="chip" type="button" data-topic="${t.slug}" aria-pressed="${t.slug === topic}">${esc(t.name)}</button>`).join('')}
      </div>
      <div data-feed></div>
    </div>`;

  getActiveAds().then((ads) => {
    const banners = filterAds(ads, { type: 'banner', placement: 'news' });
    const slot = $('[data-ad-banner-slot]', main);
    if (banners.length && slot) {
      slot.innerHTML = renderBannerAdHtml(banners[0]);
    }
  }).catch(() => {});

  const load = () => mountFeed($('[data-feed]', main), (before) => api.articles({ kind: 'news', country, topic, before, limit: 15 }), {
    empty: emptyState({ title: 'No reporting matches', body: 'Try another country or topic.', iconName: 'news' }),
  });
  load();

  $('[data-country]', main).addEventListener('change', (e) => {
    const p = new URLSearchParams();
    if (e.target.value) p.set('country', e.target.value);
    if (topic) p.set('topic', topic);
    navigate(`/news${p.toString() ? `?${p}` : ''}`, { replace: true });
  });
  $('[data-topics]', main).addEventListener('click', (e) => {
    const chip = e.target.closest('[data-topic]');
    if (!chip) return;
    $$('[data-topic]', main).forEach((c) => c.setAttribute('aria-pressed', c === chip));
    topic = chip.dataset.topic;
    load();
  });
}
