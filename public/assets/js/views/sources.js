import { api } from '../api.js';
import { $, esc, flag, icon, nf, timeAgo } from '../lib.js';
import { store } from '../store.js';
import { errorState, skeletonFeed } from '../ui.js';

const LANG = { en: 'English', fr: 'French', pt: 'Portuguese', es: 'Spanish', ar: 'Arabic', sw: 'Swahili' };

function health(s) {
  if (!s.lastCheckedAt) return ['idle', 'Waiting for first check'];
  if (s.failures > 3) return ['bad', `Unreachable for ${s.failures} checks`];
  if (s.failures > 0) return ['warn', 'Last check failed'];
  return ['', `Checked ${timeAgo(s.lastSuccessAt)}`];
}

export default async function sources(main, { setTitle }) {
  setTitle('Our sources');
  main.innerHTML = `
    <header class="page-head"><span class="eyebrow">Transparency</span><h1>Our sources</h1>
      <p>StyleVault reads the public news feeds of these newsrooms about once an hour. We keep headlines, short teasers and links only; every story sends you back to the publisher.</p></header>
    <div class="toolbar"><input class="input" type="search" placeholder="Filter publishers…" aria-label="Filter publishers" data-q></div>
    <div data-list>${skeletonFeed(4)}</div>`;

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
    list.innerHTML = `<p class="muted" style="margin-bottom:12px">${shown.length} publishers · ${items.filter((s) => s.lastSuccessAt && !s.failures).length} reporting normally</p>
      <div class="source-list">${shown.map((s) => {
        const [cls, label] = health(s);
        const country = store.countryByCode.get(s.country);
        return `<div class="source-row">
          <span class="health ${cls}" title="${esc(label)}"></span>
          <div><a class="name" href="${esc(s.homepage)}" target="_blank" rel="noopener">${esc(s.name)}</a>
            <div class="sub" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">${country ? `${flag(country.code)} ${esc(country.name)}` : 'Pan-African'} · ${LANG[s.language] || s.language} · ${esc(label)} · ${nf(s.articles)} stories</div></div>
          <a class="act" href="${esc(s.homepage)}" target="_blank" rel="noopener" aria-label="Visit ${esc(s.name)}">${icon('external')}</a>
        </div>`;
      }).join('')}</div>`;
  };
  draw();
  $('[data-q]', main).addEventListener('input', (e) => draw(e.target.value.trim().toLowerCase()));
}
