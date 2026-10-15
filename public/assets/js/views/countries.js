import { $, $$, esc, flag, icon, nf } from '../lib.js';
import { store } from '../store.js';
import { REGION_COLORS, REGION_NAMES, toast } from '../ui.js';

// Coverage meter: 1 bar per publisher based in the country (max 4), plus a bar if
// there were stories this week from anywhere.
const meter = (c) => {
  const bars = Math.min(4, c.sources) + (c.recent > 0 ? 1 : 0);
  return `<span class="coverage-meter" title="${c.sources} local sources · ${c.recent} stories this week">${Array.from({ length: 5 }, (_, i) => `<i class="${i < bars ? 'on' : ''}"></i>`).join('')}</span>`;
};

export function countryCard(c) {
  const following = !!store.followFor('country', c.code);
  return `
  <article class="country-card">
    ${flag(c.code, 'flag-lg', '')}
    <div>
      <h3><a href="/country/${c.slug}">${esc(c.name)}</a></h3>
      <div class="sub">${esc(c.capital || '')} · ${nf(c.recent)} stories this week</div>
      ${meter(c)}
    </div>
    <button class="act follow-btn ${following ? 'is-on' : ''}" type="button" data-follow="${c.code}" aria-pressed="${following}"
      aria-label="${following ? `Unfollow ${esc(c.name)}` : `Follow ${esc(c.name)}`}" title="${following ? 'Following' : 'Follow'}">${icon(following ? 'star-fill' : 'star')}</button>
  </article>`;
}

export async function handleFollow(e) {
  const btn = e.target.closest('[data-follow]');
  if (!btn) return false;
  const code = btn.dataset.follow;
  try {
    const on = await store.toggleFollow('country', code);
    toast(on ? `Following ${store.countryByCode.get(code).name}. Find it in My Monitor.` : 'Unfollowed');
  } catch (err) {
    toast(err.message, 'error');
  }
  return true;
}

export default function countries(main, { query, setTitle, navigate }) {
  setTitle('All 54 countries');
  let region = REGION_NAMES[query.get('region')] ? query.get('region') : '';
  let q = '';

  main.innerHTML = `
    <header class="page-head">
      <span class="eyebrow">The continent</span>
      <h1>All 54 countries</h1>
      <p>Every African country has a home here. Coverage grows as we add more newsrooms; the bars show how many local publishers we collect from.</p>
    </header>
    <div class="toolbar">
      <input class="input" type="search" placeholder="Find a country or capital…" aria-label="Find a country" data-q>
      <div class="chips" role="toolbar" aria-label="Filter by region" data-regions>
        <button class="chip" type="button" data-region="" aria-pressed="${!region}">All regions</button>
        ${Object.entries(REGION_NAMES).map(([k, v]) => `<button class="chip" type="button" data-region="${k}" aria-pressed="${region === k}"><span class="dot" style="--c:${REGION_COLORS[k]}"></span>${v}</button>`).join('')}
      </div>
    </div>
    <div data-list></div>`;

  const list = $('[data-list]', main);
  const draw = () => {
    const matches = store.meta.countries.filter((c) =>
      (!region || c.region === region) &&
      (!q || c.name.toLowerCase().includes(q) || (c.capital || '').toLowerCase().includes(q)));
    const groups = region ? [region] : Object.keys(REGION_NAMES);
    list.innerHTML = groups.map((r) => {
      const items = matches.filter((c) => c.region === r);
      if (!items.length) return '';
      return `<section class="section" style="margin-top:22px">
        <div class="section-head"><div><h2 style="font-size:1.25rem">${REGION_NAMES[r]}</h2><p>${items.length} ${items.length === 1 ? 'country' : 'countries'}</p></div></div>
        <div class="country-grid">${items.map(countryCard).join('')}</div></section>`;
    }).join('') || `<p class="muted" style="padding:24px 0">No country matches “${esc(q)}”.</p>`;
  };
  draw();

  $('[data-q]', main).addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); draw(); });
  $('[data-regions]', main).addEventListener('click', (e) => {
    const chip = e.target.closest('[data-region]');
    if (!chip) return;
    region = chip.dataset.region;
    $$('[data-region]', main).forEach((c) => c.setAttribute('aria-pressed', c === chip));
    navigate(region ? `/countries?region=${region}` : '/countries', { replace: true });
  });
  main.addEventListener('click', handleFollow);
  return store.on(draw);
}
