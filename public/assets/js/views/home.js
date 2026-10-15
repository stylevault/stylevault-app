import { api } from '../api.js';
import { $, esc, flag, formatIndicator, icon, nf } from '../lib.js';
import { renderMap } from '../map.js';
import { store } from '../store.js';
import { REGION_NAMES, indicatorCard, newsRow, readCard, skeletonCards, skeletonRows } from '../ui.js';

const INDICATOR_META = {
  'SP.POP.TOTL': { code: 'SP.POP.TOTL', label: 'Population', format: 'people' },
  'NY.GDP.MKTP.KD.ZG': { code: 'NY.GDP.MKTP.KD.ZG', label: 'Economic growth', unit: 'annual GDP growth', format: 'pct' },
  'SP.DYN.LE00.IN': { code: 'SP.DYN.LE00.IN', label: 'Life expectancy', unit: 'years at birth', format: 'years' },
  'IT.NET.USER.ZS': { code: 'IT.NET.USER.ZS', label: 'Internet use', unit: 'share of population', format: 'pct' },
};

function previewHtml(c) {
  const pop = c.snapshot?.population;
  const growth = c.snapshot?.growth;
  return `
    <div class="pc-head">${flag(c.code, 'flag-lg', `Flag of ${c.name}`)}
      <div><span class="eyebrow">${REGION_NAMES[c.region]}</span><h3>${esc(c.name)}</h3><div class="pc-sub">Capital: ${esc(c.capital || '—')}</div></div></div>
    <div class="pc-stats">
      <div class="pc-stat"><strong>${pop ? formatIndicator(pop.value, 'people') : '—'}</strong><span>Population${pop ? `, ${pop.year}` : ''}</span></div>
      <div class="pc-stat"><strong>${growth ? formatIndicator(growth.value, 'pct') : '—'}</strong><span>GDP growth${growth ? `, ${growth.year}` : ''}</span></div>
    </div>
    <a class="btn btn-plum btn-block" href="/country/${c.slug}">Open the ${esc(c.name)} country file ${icon('arrow-right')}</a>
    <p class="hint" style="margin-top:12px;text-align:center">Figures: World Bank</p>`;
}

function regionsHtml() {
  return `
    <span class="eyebrow">Explore the continent</span>
    <h3 style="margin-top:8px">Choose a country</h3>
    <p>Hover or tap the map to preview a country, or start with a region.</p>
    <div class="region-list">
      ${Object.entries(REGION_NAMES).map(([k, v]) => `<a class="region-row" href="/countries?region=${k}">${v}<span>${store.meta.countries.filter((c) => c.region === k).length} countries</span></a>`).join('')}
    </div>`;
}

export default async function home(main, { setTitle, navigate }) {
  setTitle('');
  main.style.paddingBottom = '0';
  const { stats, countries } = store.meta;

  main.innerHTML = `
    <section class="hero">
      <div class="hero-media"><img src="/assets/img/hero-map.webp" alt="" fetchpriority="high"></div>
      <div class="wrap"><div class="hero-inner">
        <span class="badge">Learn · A Ria's Colony product</span>
        <h1>Understand Africa, <span>one country at a time.</span></h1>
        <p>Country files, research and reporting on all 54 African countries, with every figure cited and every story linked to its source.</p>
        <form class="hero-search" role="search" data-search>
          ${icon('search')}
          <input type="search" name="q" placeholder="Search a country, subject or question…" aria-label="Search Style Vault" list="country-list" autocomplete="off">
          <datalist id="country-list">${countries.map((c) => `<option value="${esc(c.name)}">`).join('')}</datalist>
          <button class="btn btn-blue" type="submit">Search</button>
        </form>
        <div class="hero-regions"><span>Start with a region:</span>
          ${Object.entries(REGION_NAMES).map(([k, v]) => `<a href="/countries?region=${k}">${v.replace(' Africa', '')}</a>`).join('')}
        </div>
      </div></div>
    </section>

    <section class="trust-strip">
      <div class="wrap">
        <div class="trust-item">${icon('map')}<div><strong>54 country files</strong><span>Every African country, from Algeria to Zimbabwe</span></div></div>
        <div class="trust-item">${icon('chart')}<div><strong>Cited indicators</strong><span>World Bank data with year and source on every figure</span></div></div>
        <div class="trust-item">${icon('building')}<div><strong>${nf(stats.sources)} sources</strong><span>Newsrooms, think tanks and public institutions</span></div></div>
        <div class="trust-item">${icon('link')}<div><strong>Always linked</strong><span>Every story leads to the original publisher</span></div></div>
      </div>
    </section>

    <section class="section">
      <div class="wrap explorer">
        <div data-map aria-busy="true" style="min-height:300px"></div>
        <div>
          <div class="preview-card" data-preview>${regionsHtml()}</div>
          <div class="map-picker">
            <select class="select" aria-label="Choose a country" data-picker><option value="">Choose a country…</option>
              ${countries.map((c) => `<option value="${c.slug}">${esc(c.name)}</option>`).join('')}</select>
          </div>
        </div>
      </div>
    </section>

    <section class="section warm">
      <div class="wrap">
        <div class="section-head">
          <div><span class="eyebrow blue">Research &amp; analysis</span><h2>Read deeper</h2>
            <p>Long-form work from think tanks, universities, survey organisations and public institutions across and about Africa.</p></div>
          <a class="text-link" href="/research">All research ${icon('arrow-right')}</a>
        </div>
        <div data-research>${skeletonCards(3)}</div>
      </div>
    </section>

    <section class="section">
      <div class="wrap sample" data-sample></div>
    </section>

    <section class="section warm">
      <div class="wrap">
        <div class="section-head">
          <div><span class="eyebrow">From African newsrooms</span><h2>Recent reporting</h2>
            <p>Dated, attributed and linked to the newsroom that published it.</p></div>
          <a class="text-link" href="/news">All news ${icon('arrow-right')}</a>
        </div>
        <div class="card-grid two" style="gap:0 48px" data-news>${skeletonRows(4)}</div>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="section-head"><div><span class="eyebrow blue">Why you can trust it</span><h2>Built to be cited, not just read</h2></div></div>
        <div class="pillars">
          <div class="pillar"><span class="ic">${icon('chart')}</span><h3>Cited data</h3><p>Country indicators come from the World Bank’s World Development Indicators. Each figure shows its year and links to the source table.</p></div>
          <div class="pillar"><span class="ic">${icon('link')}</span><h3>Original sources</h3><p>We show a headline, a short teaser and the date, then send you to the publisher. Nothing is rewritten or summarised by AI.</p></div>
          <div class="pillar"><span class="ic">${icon('shield')}</span><h3>Open methods</h3><p>Every source is listed with how often we check it and whether it’s working. Our rules for sorting stories by country are public.</p>
            <a class="text-link" href="/sources">Sources &amp; methods ${icon('arrow-right')}</a></div>
        </div>
      </div>
    </section>

    <section class="colony-band">
      <div class="wrap">
        <div><h2>Going beyond reading about a country?</h2>
          <p>Ria’s Colony helps people travel between African countries and do business across their markets, with local guides, introductions and market support.</p></div>
        <div class="btns">
          <a class="btn btn-white" href="https://riascolony.org/products" target="_blank" rel="noopener">Explore Ria’s Colony ${icon('arrow-up-right')}</a>
          <a class="btn btn-outline-light" href="https://riascolony.org/resources" target="_blank" rel="noopener">Country guides</a>
        </div>
      </div>
    </section>`;

  $('[data-search]', main).addEventListener('submit', (e) => {
    e.preventDefault();
    const q = e.target.q.value.trim();
    const country = countries.find((c) => c.name.toLowerCase() === q.toLowerCase());
    navigate(country ? `/country/${country.slug}` : `/search?q=${encodeURIComponent(q)}`);
  });

  // Map: hover/focus previews; on touch screens the first tap previews and the second opens.
  const preview = $('[data-preview]', main);
  const touch = matchMedia('(hover: none)').matches;
  let previewed = null;
  renderMap($('[data-map]', main), {
    onFocus: (c) => { previewed = c.code; preview.innerHTML = previewHtml(c); },
    onOpen: (c) => {
      if (touch && previewed !== c.code) { previewed = c.code; preview.innerHTML = previewHtml(c); return; }
      navigate(`/country/${c.slug}`);
    },
  }).then(() => $('[data-map]', main)?.removeAttribute('aria-busy'));
  $('[data-picker]', main).addEventListener('change', (e) => e.target.value && navigate(`/country/${e.target.value}`));

  // Show a mix: institutional research first, then analysis, newest within each.
  Promise.all([
    api.articles({ kind: ['research', 'official'], limit: 3 }),
    api.articles({ kind: 'analysis', limit: 6 }),
  ]).then(([inst, analysis]) => {
    const items = [...inst.items, ...analysis.items].slice(0, 6);
    const box = $('[data-research]', main);
    if (box) box.innerHTML = items.length ? `<div class="card-grid">${items.map(readCard).join('')}</div>` : '';
  }).catch(() => {});

  api.articles({ kind: 'news', limit: 6 }).then(({ items }) => {
    const box = $('[data-news]', main);
    if (box) box.innerHTML = `<div class="news-list">${items.slice(0, 3).map(newsRow).join('')}</div><div class="news-list">${items.slice(3, 6).map(newsRow).join('')}</div>`;
  }).catch(() => {});

  // A real country file, up close. Rotates daily through countries with local newsrooms.
  const pool = countries.filter((c) => c.sources >= 2);
  const day = Math.floor(Date.now() / 86_400_000);
  const featured = pool[day % Math.max(pool.length, 1)] || countries[0];
  if (featured) {
    api.country(featured.code).then(({ indicators }) => {
      const box = $('[data-sample]', main);
      if (!box) return;
      box.innerHTML = `
        <div class="sample-copy">
          <span class="eyebrow">Inside a country file</span>
          <h2>Everything you need to understand a country, in one place</h2>
          <p>Each of the 54 country files brings together reference facts, long-run indicators, research and the latest reporting from local newsrooms.</p>
          <ul>
            <li>${icon('check')}<span>Capital, languages, currency and regional blocs at a glance</span></li>
            <li>${icon('check')}<span>Nine World Bank indicators with 15-year trends</span></li>
            <li>${icon('check')}<span>Research, analysis and news about that country</span></li>
          </ul>
          <a class="btn btn-plum" href="/country/${featured.slug}">Open the ${esc(featured.name)} file ${icon('arrow-right')}</a>
        </div>
        <div class="sample-card">
          <div class="sc-head">${flag(featured.code, '', '')}<div><h3>${esc(featured.name)}</h3><span>${REGION_NAMES[featured.region]} · Capital: ${esc(featured.capital)}</span></div></div>
          <div class="indicator-grid">${Object.values(INDICATOR_META).map((ind) => indicatorCard(ind, indicators[ind.code], featured)).join('')}</div>
          <p class="sc-foot">Source: World Bank, World Development Indicators (CC BY 4.0).</p>
        </div>`;
    }).catch(() => {});
  }
}
