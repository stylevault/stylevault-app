import { $, $$, esc, flag, formatIndicator, icon } from '../lib.js';
import { store } from '../store.js';
import { REGION_NAMES, toast } from '../ui.js';

export function countryCard(c) {
  const following = store.isFollowed('country', c.code);
  const pop = c.snapshot?.population;
  return `
  <article class="cl-row">
    ${flag(c.code, 'cl-flag', '')}
    <div class="cl-text">
      <h3><a href="/country/${c.slug}">${esc(c.name)}</a></h3>
      <div class="cl-sub">${esc(c.capital || '')}${pop ? ` · ${formatIndicator(pop.value, 'people')} people` : ''}</div>
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
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.innerHTML = icon(on ? 'star-fill' : 'star');
    const name = store.countryByCode.get(code)?.name || code;
    btn.setAttribute('aria-label', on ? `Unfollow ${name}` : `Follow ${name}`);
    btn.setAttribute('title', on ? 'Following' : 'Follow');
    toast(on ? `Following ${name}` : 'Unfollowed');
  } catch (err) {
    toast(err.message, 'error');
  }
}

export default function countries(main, { query, setTitle, navigate }) {
  setTitle('All 54 countries');
  const region = REGION_NAMES[query.get('region')] ? query.get('region') : '';
  let q = '';
  const regionCount = (k) => store.meta.countries.filter((c) => c.region === k).length;
  const regionOptions = [['', 'All regions', store.meta.countries.length], ...Object.entries(REGION_NAMES).map(([k, v]) => [k, v, regionCount(k)])];
  const current = regionOptions.find(([k]) => k === region);

  main.innerHTML = `
    <section class="cl-hero"><div class="wrap">
      <h1>${region ? REGION_NAMES[region] : 'African countries'}</h1>
      <p>Key facts, World Bank numbers, research and local news for each of Africa’s 54 countries.</p>
    </div></section>
    <div class="cl-body"><div class="wrap cl-page">
      <div class="cl-toolbar">
        <label class="cl-search">${icon('search')}<input type="search" placeholder="Find a country or capital" aria-label="Find a country or capital" data-q></label>
        <div class="chips cl-chips" role="toolbar" aria-label="Filter by region" data-regions>
          <button class="chip" type="button" data-region="" aria-pressed="${!region}">All regions</button>
          ${Object.entries(REGION_NAMES).map(([k, v]) => `<button class="chip" type="button" data-region="${k}" aria-pressed="${region === k}">${v}</button>`).join('')}
        </div>
        <div class="cl-select" data-region-menu>
          <button class="cl-select-btn" type="button" aria-haspopup="listbox" aria-expanded="false" aria-label="Filter by region: ${current[1]}">
            <span class="cl-select-label">${current[1]}</span><span class="cl-select-count">${current[2]}</span>${icon('chevron-down')}
          </button>
          <div class="cl-menu" role="listbox" aria-label="Regions" hidden>
            ${regionOptions.map(([k, v, n]) => `
              <button class="cl-menu-opt" type="button" role="option" data-value="${k}" aria-selected="${k === region}">
                <span>${v}</span><span class="cl-menu-count">${n}</span>${icon('check')}
              </button>`).join('')}
          </div>
        </div>
      </div>
      <div data-list></div>
    </div></div>`;

  const list = $('[data-list]', main);
  const draw = () => {
    const matches = store.meta.countries.filter((c) =>
      (!region || c.region === region) &&
      (!q || c.name.toLowerCase().includes(q) || (c.capital || '').toLowerCase().includes(q)));
    const groups = region ? [region] : Object.keys(REGION_NAMES);
    list.innerHTML = groups.map((r) => {
      const items = matches.filter((c) => c.region === r);
      if (!items.length) return '';
      return `<section class="cl-region"><header class="cl-region-head"><h2>${REGION_NAMES[r]}</h2><span>${items.length} ${items.length === 1 ? 'country' : 'countries'}</span></header>
        <div class="cl-grid">${items.map(countryCard).join('')}</div></section>`;
    }).join('') || `<p class="cl-empty">No country matches “${esc(q)}”.</p>`;
  };
  draw();

  $('[data-q]', main).addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); draw(); });
  $('[data-regions]', main).addEventListener('click', (e) => {
    const chip = e.target.closest('[data-region]');
    if (!chip) return;
    $$('[data-region]', main).forEach((c) => c.setAttribute('aria-pressed', c === chip));
    navigate(chip.dataset.region ? `/countries?region=${chip.dataset.region}` : '/countries', { replace: true });
  });
  // Compact region menu (phones): a branded popover instead of the OS select sheet.
  const menuWrap = $('[data-region-menu]', main);
  const menuBtn = $('.cl-select-btn', menuWrap);
  const menu = $('.cl-menu', menuWrap);
  const setMenu = (open) => {
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', open);
    if (open) $('.cl-menu-opt[aria-selected="true"]', menu)?.focus();
  };
  menuBtn.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', (e) => {
    const opt = e.target.closest('[data-value]');
    if (!opt) return;
    setMenu(false);
    if (opt.dataset.value !== region) navigate(opt.dataset.value ? `/countries?region=${opt.dataset.value}` : '/countries', { replace: true });
  });
  menu.addEventListener('keydown', (e) => {
    const opts = $$('.cl-menu-opt', menu);
    const i = opts.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      opts[(i + (e.key === 'ArrowDown' ? 1 : opts.length - 1)) % opts.length].focus();
    }
  });
  const onDocClick = (e) => { if (!menu.hidden && !menuWrap.contains(e.target)) setMenu(false); };
  const onKey = (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } };
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKey);
  main.addEventListener('click', handleFollow);
  const off = store.on(draw);
  return () => {
    off?.();
    document.removeEventListener('click', onDocClick);
    document.removeEventListener('keydown', onKey);
  };
}
