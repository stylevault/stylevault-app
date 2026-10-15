import { $, $$, esc, flag, formatIndicator, icon } from '../lib.js';
import { store } from '../store.js';
import { REGION_NAMES, toast } from '../ui.js';

export function countryCard(c) {
  const following = !!store.followFor('country', c.code);
  const pop = c.snapshot?.population;
  return `
  <article class="country-card">
    ${flag(c.code, 'flag-md', '')}
    <div>
      <h3><a href="/country/${c.slug}">${esc(c.name)}</a></h3>
      <div class="sub">${esc(c.capital || '')}${pop ? ` · ${formatIndicator(pop.value, 'people')} people` : ''}</div>
    </div>
    <button class="act follow-star ${following ? 'is-on' : ''}" type="button" data-follow="${c.code}" aria-pressed="${following}"
      aria-label="${following ? `Unfollow ${esc(c.name)}` : `Follow ${esc(c.name)}`}" title="${following ? 'Following' : 'Follow'}">${icon(following ? 'star-fill' : 'star')}</button>
  </article>`;
}

export async function handleFollow(e) {
  const btn = e.target.closest('[data-follow]');
  if (!btn) return;
  const code = btn.dataset.follow;
  try {
    const on = await store.toggleFollow('country', code);
    toast(on ? `Following ${store.countryByCode.get(code).name}` : 'Unfollowed');
  } catch (err) {
    toast(err.message, 'error');
  }
}

export default function countries(main, { query, setTitle, navigate }) {
  setTitle('All 54 countries');
  const region = REGION_NAMES[query.get('region')] ? query.get('region') : '';
  let q = '';

  main.innerHTML = `
    <section class="page-hero"><div class="wrap">
      <span class="eyebrow">Country files</span>
      <h1>${region ? REGION_NAMES[region] : 'All 54 African countries'}</h1>
      <p class="lede">Each file brings together reference facts, World Bank indicators, research and reporting for one country.</p>
    </div></section>
    <div class="wrap" style="padding-top:36px">
      <div class="toolbar">
        <input class="input" type="search" placeholder="Find a country or capital…" aria-label="Find a country" data-q>
        <div class="chips" role="toolbar" aria-label="Filter by region" data-regions>
          <button class="chip" type="button" data-region="" aria-pressed="${!region}">All regions</button>
          ${Object.entries(REGION_NAMES).map(([k, v]) => `<button class="chip" type="button" data-region="${k}" aria-pressed="${region === k}">${v}</button>`).join('')}
        </div>
      </div>
      <div data-list></div>
    </div>`;

  const list = $('[data-list]', main);
  const draw = () => {
    const matches = store.meta.countries.filter((c) =>
      (!region || c.region === region) &&
      (!q || c.name.toLowerCase().includes(q) || (c.capital || '').toLowerCase().includes(q)));
    const groups = region ? [region] : Object.keys(REGION_NAMES);
    list.innerHTML = groups.map((r) => {
      const items = matches.filter((c) => c.region === r);
      if (!items.length) return '';
      return `<section class="region-block"><h2>${REGION_NAMES[r]} <span>${items.length} ${items.length === 1 ? 'country' : 'countries'}</span></h2>
        <div class="country-grid">${items.map(countryCard).join('')}</div></section>`;
    }).join('') || `<p class="muted" style="padding:24px 0">No country matches “${esc(q)}”.</p>`;
  };
  draw();

  $('[data-q]', main).addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); draw(); });
  $('[data-regions]', main).addEventListener('click', (e) => {
    const chip = e.target.closest('[data-region]');
    if (!chip) return;
    $$('[data-region]', main).forEach((c) => c.setAttribute('aria-pressed', c === chip));
    navigate(chip.dataset.region ? `/countries?region=${chip.dataset.region}` : '/countries', { replace: true });
  });
  main.addEventListener('click', handleFollow);
  return store.on(draw);
}
