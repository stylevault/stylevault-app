import { api } from '../api.js';
import { $, esc, flag, icon, nf, shortDate, KIND_LABELS } from '../lib.js';
import { store } from '../store.js';
import { errorState, skeletonRows } from '../ui.js';

const LANG = { en: 'English', fr: 'French', pt: 'Portuguese', es: 'Spanish', ar: 'Arabic' };
const ORDER = ['research', 'official', 'analysis', 'news'];
const GROUP_TITLES = { research: 'Research institutions', official: 'Public institutions', analysis: 'Analysis & commentary', news: 'Newsrooms' };

function health(s) {
  if (!s.lastCheckedAt) return ['idle', 'Waiting for first check'];
  if (s.failures > 3) return ['bad', `Unreachable for ${s.failures} checks`];
  if (s.failures > 0) return ['warn', 'Last check failed'];
  return ['', `Checked ${shortDate(s.lastSuccessAt)}`];
}

export default async function sources(main, { setTitle }) {
  setTitle('Sources & methods');
  main.innerHTML = `
    <section class="page-hero"><div class="wrap">
      <span class="eyebrow blue">Transparency</span>
      <h1>Sources &amp; methods</h1>
      <p class="lede">Who we read, how often, and how we sort what they publish. Every item links back to the source.</p>
    </div></section>
    <div class="wrap" style="padding-top:40px">
      <div class="pillars" style="margin-bottom:48px">
        <div class="pillar"><span class="ic">${icon('news')}</span><h3>How we collect</h3><p>We read each source’s public feed about once an hour (less often for quiet sources). We keep the headline, date, a short teaser and the link, never the full text.</p></div>
        <div class="pillar"><span class="ic">${icon('map')}</span><h3>How we sort</h3><p>Stories are tagged with the countries they are genuinely about (not every passing mention) and with topics, using published rules of names, places, institutions and keywords.</p></div>
        <div class="pillar"><span class="ic">${icon('chart')}</span><h3>Where figures come from</h3><p>Country indicators come from the World Bank’s World Development Indicators (CC BY 4.0), refreshed weekly, always shown with their year.</p></div>
      </div>
      <div class="toolbar"><input class="input" type="search" placeholder="Filter sources…" aria-label="Filter sources" data-q></div>
      <div data-list>${skeletonRows(4)}</div>
    </div>`;

  const list = $('[data-list]', main);
  let items;
  try {
    ({ items } = await api.sources());
  } catch (err) {
    list.innerHTML = errorState(err);
    return;
  }

  const draw = (q = '') => {
    const shown = items.filter((s) => !q || s.name.toLowerCase().includes(q) || (store.countryByCode.get(s.country)?.name || 'pan-african').toLowerCase().includes(q));
    list.innerHTML = ORDER.map((kind) => {
      const group = shown.filter((s) => (s.kind || 'news') === kind);
      if (!group.length) return '';
      return `<section class="region-block"><h2>${GROUP_TITLES[kind]} <span>${group.length}</span></h2>
        <div class="source-list" style="margin-top:16px">${group.map((s) => {
          const [cls, label] = health(s);
          const country = store.countryByCode.get(s.country);
          return `<div class="source-row">
            <span class="health ${cls}" title="${esc(label)}"></span>
            <div><a class="name" href="${esc(s.homepage)}" target="_blank" rel="noopener">${esc(s.name)}</a>
              <div class="sub">${country ? `${flag(country.code)} ${esc(country.name)}` : 'Pan-African'} · ${LANG[s.language] || s.language} · ${esc(label)} · ${nf(s.articles)} items</div></div>
            <span class="tag kind-${s.kind || 'news'}">${KIND_LABELS[s.kind || 'news']}</span>
          </div>`;
        }).join('')}</div></section>`;
    }).join('') || '<p class="muted">No source matches.</p>';
  };
  draw();
  $('[data-q]', main).addEventListener('input', (e) => draw(e.target.value.trim().toLowerCase()));
}
