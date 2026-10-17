import { $, esc, flag, icon, nf } from '../lib.js';
import { store } from '../store.js';
import { REGION_NAMES } from '../ui.js';
import { filterAds, getActiveAds, renderBannerAdHtml } from '../ads.js';

// Sprite icons for each topic (same set the topic pages use).
const TOPIC_ICONS = {
  business: 'chart', politics: 'building', trade: 'globe', technology: 'radar', agriculture: 'map',
  education: 'book', tourism: 'globe', style: 'eye', energy: 'sun', health: 'shield',
  climate: 'sun', security: 'shield', sport: 'stack',
};

const POPULAR = ['NG', 'KE', 'ZA', 'GH', 'EG', 'RW', 'MA', 'ET', 'TZ', 'SN', 'CI', 'UG'];

/** Explore / Directory: a friendly way into countries, regions and topics, with a live filter. */
export default function directoryView(main, { setTitle }) {
  setTitle('Explore Africa');
  const { countries, topics } = store.meta;
  const byCode = (code) => store.countryByCode.get(code);
  const regionCount = (k) => countries.filter((c) => c.region === k).length;

  const countryTile = (c) => `
    <a class="xp-country" href="/country/${c.slug}">
      ${flag(c.code, 'xp-flag', '')}
      <span class="xp-country-text"><strong>${esc(c.name)}</strong><span>${esc(c.capital || REGION_NAMES[c.region] || '')}</span></span>
    </a>`;
  const topicTile = (t) => `
    <a class="xp-topic" href="/topic/${t.slug}">
      <span class="xp-topic-icon" aria-hidden="true">${icon(TOPIC_ICONS[t.slug] || 'news')}</span>
      <span class="xp-topic-text"><strong>${esc(t.name)}</strong><span>${t.recent ? `${nf(t.recent)} stories this week` : 'Across all 54 countries'}</span></span>
    </a>`;
  const sectionHead = (title, sub, href, linkText) => `
    <div class="xp-head">
      <div><h2>${title}</h2><p>${sub}</p></div>
      ${href ? `<a class="xp-more" href="${href}">${linkText} ${icon('arrow-right')}</a>` : ''}
    </div>`;

  main.innerHTML = `
    <section class="xp-hero">
      <div class="wrap">
        <span class="xp-kicker">${icon('globe')} Explore</span>
        <h1>Where would you like to <em>start?</em></h1>
        <p>Pick a region, a country or a topic. Every page brings together local news, research and World Bank numbers.</p>
        <label class="xp-search">
          ${icon('search')}
          <input type="search" placeholder="Find a country or topic" aria-label="Find a country or topic" autocomplete="off" data-xp-q>
        </label>
      </div>
    </section>
    <div data-ad-banner-slot></div>

    <div class="wrap xp-body">
      <section class="xp-section" data-xp-results hidden></section>

      <div data-xp-default>
        <section class="xp-section">
          ${sectionHead('Regions', 'Five corners of the continent.', '/countries', 'All 54 countries')}
          <div class="xp-regions">
            ${Object.entries(REGION_NAMES).map(([k, v], i) => `
              <a class="xp-region xp-tone-${i + 1}" href="/countries?region=${k}">
                <span class="xp-region-dot" aria-hidden="true"></span>
                <span class="xp-region-text"><strong>${esc(v)}</strong><span>${regionCount(k)} countries</span></span>
                <span class="xp-region-go" aria-hidden="true">${icon('arrow-right')}</span>
              </a>`).join('')}
          </div>
        </section>

        <section class="xp-section">
          ${sectionHead('Popular countries', 'The country files people open most.', '/countries', 'See all')}
          <div class="xp-countries">
            ${POPULAR.map(byCode).filter(Boolean).map(countryTile).join('')}
          </div>
        </section>

        <section class="xp-section">
          ${sectionHead('Topics', 'Follow a subject across every country.', '/topics', 'All topics')}
          <div class="xp-topics">
            ${topics.map(topicTile).join('')}
          </div>
        </section>
      </div>
    </div>`;

  const input = $('[data-xp-q]', main);
  const results = $('[data-xp-results]', main);
  const defaults = $('[data-xp-default]', main);
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    defaults.hidden = Boolean(q);
    results.hidden = !q;
    if (!q) return;
    const cs = countries.filter((c) => c.name.toLowerCase().includes(q) || (c.capital || '').toLowerCase().includes(q));
    const ts = topics.filter((t) => t.name.toLowerCase().includes(q));
    results.innerHTML = cs.length || ts.length
      ? `${cs.length ? `${sectionHead('Countries', `${cs.length} ${cs.length === 1 ? 'match' : 'matches'}`)}<div class="xp-countries">${cs.map(countryTile).join('')}</div>` : ''}
         ${ts.length ? `<div class="${cs.length ? 'xp-gap' : ''}">${sectionHead('Topics', `${ts.length} ${ts.length === 1 ? 'match' : 'matches'}`)}<div class="xp-topics">${ts.map(topicTile).join('')}</div></div>` : ''}`
      : `<p class="xp-empty">Nothing matches “${esc(input.value.trim())}”. Try a country, a capital or a subject like “energy”.</p>`;
  });

  getActiveAds().then((ads) => {
    const banners = filterAds(ads, { type: 'banner', placement: 'directory' });
    const slot = $('[data-ad-banner-slot]', main);
    if (banners.length && slot) {
      slot.innerHTML = renderBannerAdHtml(banners[0]);
    }
  }).catch(() => {});
}
