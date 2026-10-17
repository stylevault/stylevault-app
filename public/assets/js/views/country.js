import { api } from '../api.js';
import { $, $$, esc, flag, formatIndicator, icon, nf, shortDate } from '../lib.js';
import { store } from '../store.js';
import { REGION_NAMES, emptyState, errorState, mountFeed, openCountrySectionModal, readCard, toast } from '../ui.js';

const INDICATORS = [
  { code: 'SP.POP.TOTL', label: 'Population', format: 'people' },
  { code: 'NY.GDP.MKTP.CD', label: 'GDP', unit: 'current US$', format: 'usd-big' },
  { code: 'NY.GDP.PCAP.CD', label: 'GDP per person', unit: 'current US$', format: 'usd' },
  { code: 'NY.GDP.MKTP.KD.ZG', label: 'Economic growth', unit: 'annual GDP growth', format: 'pct' },
  { code: 'FP.CPI.TOTL.ZG', label: 'Inflation', unit: 'consumer prices, annual', format: 'pct' },
  { code: 'SP.DYN.LE00.IN', label: 'Life expectancy', unit: 'years at birth', format: 'years' },
  { code: 'SP.URB.TOTL.IN.ZS', label: 'Urban population', unit: 'share of total', format: 'pct' },
  { code: 'IT.NET.USER.ZS', label: 'Internet use', unit: 'share of population', format: 'pct' },
  { code: 'EG.ELC.ACCS.ZS', label: 'Access to electricity', unit: 'share of population', format: 'pct' },
];
const HEADLINE = ['NY.GDP.MKTP.CD', 'NY.GDP.PCAP.CD', 'NY.GDP.MKTP.KD.ZG', 'SP.DYN.LE00.IN'];

const BLOCS = {
  AMU: 'Arab Maghreb Union', 'CEN-SAD': 'Community of Sahel-Saharan States', COMESA: 'Common Market for Eastern and Southern Africa',
  EAC: 'East African Community', ECCAS: 'Economic Community of Central African States', ECOWAS: 'Economic Community of West African States',
  IGAD: 'Intergovernmental Authority on Development', SADC: 'Southern African Development Community', AES: 'Alliance of Sahel States',
};
const LANG = { en: 'English', fr: 'French', pt: 'Portuguese', es: 'Spanish', ar: 'Arabic' };

// "$287.0 billion" → "$287.0<small> billion</small>" so big figures stay on one line.
const TABS = [
  ['overview', 'Overview', '🏠'],
  ['indicators', 'Numbers', '📊'],
  ['news', 'News', '📰'],
  ['research', 'Research', '📑'],
  ['reading', 'Links', '🔗'],
  ['sources', 'Newsrooms', '🎙️'],
];

// A quiet trend line: no fill, padded so peaks and dips never touch the edges.
function trend(series) {
  if (!series || series.length < 2) return '';
  const w = 120, h = 32, pad = 4;
  const xs = series.map((p) => p[0]), ys = series.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const pts = series.map(([x, y]) => `${(pad + ((x - x0) / (x1 - x0 || 1)) * (w - pad * 2)).toFixed(1)},${(h - pad - ((y - y0) / (y1 - y0 || 1)) * (h - pad * 2)).toFixed(1)}`);
  return `<svg class="cf-trend" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="M${pts.join(' L')}"/></svg>`;
}

const fmt = (v, format) => esc(formatIndicator(v, format)).replace(/ (million|billion|trillion|years)$/, '<small> $1</small>');

export default async function country(main, { params, setTitle }) {
  const base = store.countryBySlug.get(params.slug);
  if (!base) {
    main.innerHTML = `<div class="wrap" style="padding-top:48px">${emptyState({ title: 'Country not found', body: 'We couldn’t find that country.', action: '<a class="btn btn-plum" href="/countries">See all 54 countries</a>', iconName: 'map' })}</div>`;
    return;
  }
  setTitle(`${base.name}: Country Profile`);
  store.recordVisit('country', base.code);

  const followBtn = () => {
    const on = store.isFollowed('country', base.code);
    return `<button class="btn btn-sm ${on ? 'is-on' : 'btn-plum'}" type="button" data-follow-country aria-pressed="${on}">${icon(on ? 'star-fill' : 'star')} ${on ? 'Following' : 'Follow'}</button>`;
  };

  let activeTabId = 'overview';

  main.innerHTML = `
    <section class="cf-hero">
      <div class="wrap">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="/countries">Countries</a>
          <span>/</span>
          <a href="/countries?region=${base.region}">${REGION_NAMES[base.region]}</a>
        </nav>
        <div class="cf-head">
          <div class="cf-head-left">
            ${flag(base.code, 'cf-flag', `Flag of ${base.name}`)}
            <div class="cf-id">
              <span class="cf-kicker">${REGION_NAMES[base.region]} · Country profile</span>
              <h1>${esc(base.name)}</h1>
            </div>
          </div>
          <div class="cf-actions">
            <span data-follow-slot>${followBtn()}</span>
            <button class="btn btn-sm btn-outline cf-share" type="button" data-share-page aria-label="Share this page">${icon('share')}<span>Share</span></button>
          </div>
        </div>
        <dl class="cf-keyfacts">
          <div><dt>Capital</dt><dd>${esc(base.capital || 'N/A')}</dd></div>
          <div><dt>Population</dt><dd data-pop>…</dd></div>
          <div><dt>Currency</dt><dd>${esc(base.currency || 'N/A')}</dd></div>
          ${base.languages
            ? `<div><dt>Languages</dt><dd>${esc(base.languages)}</dd></div>`
            : `<div><dt>Region</dt><dd>${REGION_NAMES[base.region]}</dd></div>`}
        </dl>
      </div>
    </section>

    <!-- Subnav: Dropdown Switcher Button (opens customized compact modal) + Desktop Tabs -->
    <nav class="subnav cf-subnav" aria-label="Country sections">
      <div class="wrap cf-subnav-wrap">
        <button type="button" class="cf-section-btn" data-open-country-modal aria-haspopup="dialog" title="Switch country section">
          <span class="cf-sb-icon" data-sb-icon>🏠</span>
          <span class="cf-sb-label">Section:</span>
          <strong class="cf-sb-name" data-sb-name>Overview</strong>
          <span class="cf-sb-count">6 sections</span>
          <span class="cf-sb-chev" aria-hidden="true">${icon('chevron-down')}</span>
        </button>

        <div class="cf-desktop-tabs" role="tablist">
          ${TABS.map(([id, label]) => `<a href="#${id}" role="tab" data-tab="${id}" aria-controls="${id}">${label}</a>`).join('')}
        </div>
      </div>
    </nav>

    <section class="cf-section" id="overview" role="tabpanel">
      <div class="wrap">
        <div class="cf-overview" data-glance>
          <div class="skeleton" style="height:180px;border-radius:14px"></div>
          <div class="skeleton" style="height:180px;border-radius:14px"></div>
        </div>
      </div>
    </section>

    <section class="cf-section" id="indicators" role="tabpanel" hidden>
      <div class="wrap">
        <div class="sec-head">
          <div>
            <h2>Economic numbers</h2>
            <p class="sec-intro">World Bank figures with 15-year trends. Tap a row for the source.</p>
          </div>
        </div>
        <div class="cf-ind-grid" data-indicators>${'<div class="skeleton" style="height:120px;border-radius:14px"></div>'.repeat(6)}</div>
        <p class="citation" data-citation></p>
      </div>
    </section>

    <section class="cf-section" id="research" role="tabpanel" hidden>
      <div class="wrap">
        <div class="sec-head">
          <div>
            <h2>Research &amp; reports</h2>
            <p class="sec-intro">Papers from think tanks, universities and African institutions.</p>
          </div>
          <a class="text-link" href="/research?country=${base.code}">See all ${icon('arrow-right')}</a>
        </div>
        <div data-research></div>
      </div>
    </section>

    <section class="cf-section" id="news" role="tabpanel" hidden>
      <div class="wrap">
        <div class="sec-head">
          <div>
            <h2>Latest news</h2>
            <p class="sec-intro">From newsrooms in ${esc(base.name)} and regional bureaus, updated hourly.</p>
          </div>
        </div>
        <div class="chips cf-chips" role="toolbar" aria-label="Filter by topic" data-topic-chips>
          <button class="tool-filter-chip active" type="button" aria-pressed="true" data-topic="">All topics</button>
          ${store.meta.topics.map((t) => `<button class="tool-filter-chip" type="button" aria-pressed="false" data-topic="${t.slug}">${esc(t.name)}</button>`).join('')}
        </div>
        <div class="cf-news" data-news></div>
      </div>
    </section>

    <section class="cf-section" id="reading" role="tabpanel" hidden>
      <div class="wrap">
        <div class="sec-head">
          <div>
            <h2>Useful links</h2>
            <p class="sec-intro">Official portals, data sources and Ria’s Colony guides.</p>
          </div>
        </div>
        <div class="further" data-further></div>
      </div>
    </section>

    <section class="cf-section" id="sources" role="tabpanel" hidden>
      <div class="wrap">
        <div class="sec-head">
          <div>
            <h2>Newsrooms we follow</h2>
            <p class="sec-intro">Local publishers whose feeds we collect and index.</p>
          </div>
        </div>
        <div data-sources></div>
      </div>
    </section>

    <!-- Travel Tools Quick Bar below sections -->
    <section class="cf-tools-section" aria-label="Travel tools for ${esc(base.name)}">
      <div class="wrap">
        <div class="cf-tools-bar">
          <div class="cf-tools-head">
            <span class="cf-tools-badge">Travel Tools</span>
            <span class="cf-tools-lede">Planning a trip to ${esc(base.name)}?</span>
          </div>
          <div class="cf-tools-links">
            <a href="/tools/eta" class="cf-tool-chip">🛂 Entry &amp; ETA rules ↗</a>
            <a href="/tools/contraband" class="cf-tool-chip">🚫 Baggage &amp; Customs ↗</a>
            <a href="/tools/safety" class="cf-tool-chip">🛡️ Women’s Safety Score ↗</a>
          </div>
        </div>
      </div>
    </section>`;

  // Follow & share & Section Modal
  main.addEventListener('click', async (e) => {
    if (e.target.closest('[data-open-country-modal]')) {
      openCountrySectionModal({
        country: base,
        activeTab: activeTabId,
        onSelectTab: (id) => showTab(id, true),
      });
      return;
    }
    if (e.target.closest('[data-follow-country]')) {
      try {
        const on = await store.toggleFollow('country', base.code);
        $('[data-follow-slot]', main).innerHTML = followBtn();
        toast(on ? `Following ${base.name}` : `Unfollowed ${base.name}`);
      } catch (err) {
        toast(err.message, 'error');
      }
    }
    if (e.target.closest('[data-share-page]')) {
      const data = { title: `${base.name} · Style Vault`, url: location.href };
      if (navigator.share) navigator.share(data).catch(() => {});
      else navigator.clipboard.writeText(location.href).then(() => toast('Link copied'), () => {});
    }
    // Any in-page link to a section switches tabs instead of scrolling.
    const jump = e.target.closest('a[href^="#"]');
    if (jump && TABS.some(([id]) => `#${id}` === jump.getAttribute('href'))) {
      e.preventDefault();
      showTab(jump.getAttribute('href').slice(1), true);
    }
  });

  // Sections are tabs: one visible at a time, remembered in the URL hash.
  const hero = $('.cf-hero', main);
  const showTab = (id, fromClick = false) => {
    activeTabId = id;
    $$('.cf-section', main).forEach((s) => { s.hidden = s.id !== id; });
    $$('[data-tab]', main).forEach((a) => {
      const on = a.dataset.tab === id;
      a.classList.toggle('on', on);
      a.setAttribute('aria-selected', on);
      if (on && fromClick) a.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    });

    const tabConfig = TABS.find(([tId]) => tId === id) || TABS[0];
    const iconEl = $('[data-sb-icon]', main);
    const nameEl = $('[data-sb-name]', main);
    if (iconEl) iconEl.textContent = tabConfig[2] || '📌';
    if (nameEl) nameEl.textContent = tabConfig[1];

    history.replaceState(history.state, '', id === 'overview' ? location.pathname + location.search : `#${id}`);
    const top = hero.offsetTop + hero.offsetHeight - ($('.site-header')?.offsetHeight || 0);
    if (fromClick && window.scrollY > top) window.scrollTo({ top, behavior: 'instant' });
  };
  const initial = location.hash.slice(1);
  showTab(TABS.some(([id]) => id === initial) ? initial : 'overview');

  // Research & news
  const isGuest = !store.user;
  mountFeed($('[data-research]', main), (before) => api.articles({ country: base.code, kind: ['research', 'analysis', 'official'], before, limit: 6 }), {
    layout: 'cards',
    render: (a, idx) => {
      const locked = isGuest && idx >= 2;
      return readCard(a, { locked });
    },
    empty: emptyState({ title: 'No research collected yet', body: `We don’t have research papers for ${esc(base.name)} yet. The Links tab has official sources in the meantime.` }),
  });
  let topic = '';
  const loadNews = () => mountFeed($('[data-news]', main), (before) => api.articles({ country: base.code, kind: 'news', topic, before, limit: 10 }), {
    empty: emptyState({ title: 'No stories yet', body: `No stories ${topic ? 'on this topic ' : ''}from ${esc(base.name)} right now.`, iconName: 'news' }),
  });
  loadNews();
  $('[data-topic-chips]', main).addEventListener('click', (e) => {
    const chip = e.target.closest('[data-topic]');
    if (!chip) return;
    $$('[data-topic]', main).forEach((x) => {
      const isActive = x === chip;
      x.setAttribute('aria-pressed', isActive);
      x.classList.toggle('active', isActive);
    });
    topic = chip.dataset.topic;
    loadNews();
  });

  // Facts, indicators, sources
  let file;
  try {
    file = await api.country(base.code);
  } catch (err) {
    $('[data-pop]', main).textContent = 'N/A';
    $('[data-glance]', main).innerHTML = errorState(err);
    return;
  }
  const { country: c, indicators, sources } = file;
  const latest = (code) => indicators[code]?.at(-1);
  const pop = latest('SP.POP.TOTL');
  $('[data-pop]', main).innerHTML = pop ? `${fmt(pop[1], 'people')} <span class="cf-yr">${pop[0]}</span>` : 'N/A';

  $('[data-glance]', main).innerHTML = `
    <div class="cf-stats">
      ${HEADLINE.map((code) => {
        const ind = INDICATORS.find((i) => i.code === code);
        const v = latest(code);
        return `
          <div class="cf-stat">
            <span class="lbl">${esc(ind.label)}</span>
            <strong>${v ? fmt(v[1], ind.format) : 'N/A'}</strong>
            <span class="cf-yr">${v ? v[0] : 'No recent data'}</span>
          </div>`;
      }).join('')}
    </div>
    <dl class="cf-profile">
      <div><dt>Blocs</dt><dd>${c.blocs.length
        ? `<ul class="cf-blocs">${c.blocs.map((b) => `<li>${esc(BLOCS[b] || b)} <abbr>${esc(b)}</abbr></li>`).join('')}</ul>`
        : 'None'}</dd></div>
      <div><dt>ISO codes</dt><dd>${esc(c.code)} · ${esc(c.iso3 || '')}</dd></div>
      <div><dt>Coverage</dt><dd><a class="text-link" href="#sources">${sources.length} local ${sources.length === 1 ? 'newsroom' : 'newsrooms'}</a></dd></div>
    </dl>`;

  $('[data-indicators]', main).innerHTML = INDICATORS.map((ind) => {
    const series = indicators[ind.code];
    const last = series?.at(-1);
    const href = `https://data.worldbank.org/indicator/${ind.code}?locations=${c.code}`;
    const stale = last && last[0] < new Date().getFullYear() - 3;
    return `
      <a class="cf-ind${last ? '' : ' is-empty'}" href="${href}" title="${series?.length > 1 ? `${series[0][0]}–${last[0]} trend · ` : ''}World Bank source">
        <span class="cf-ind-head"><span class="lbl">${esc(ind.label)}</span>${ind.unit ? `<span class="unit">${esc(ind.unit)}</span>` : ''}</span>
        <span class="cf-ind-val"><strong>${last ? fmt(last[1], ind.format) : 'No data'}</strong><span class="cf-yr">${last ? `${last[0]}${stale ? ' · latest' : ''}` : 'Not reported'}</span></span>
        <span class="cf-ind-spark">${trend(series)}</span>
      </a>`;
  }).join('');
  $('[data-citation]', main).innerHTML = `${icon('shield')}<span>Source: World Bank, <a href="https://data.worldbank.org/country/${c.code}">World Development Indicators</a>, licensed CC BY 4.0.
    ${file.indicatorsSourceUpdated ? `Database last updated ${esc(file.indicatorsSourceUpdated)}.` : ''}
    ${file.indicatorsRefreshedAt ? `Checked by Style Vault ${shortDate(file.indicatorsRefreshedAt)}.` : ''}</span>`;

  $('[data-further]', main).innerHTML = [
    ['chart', `World Bank: ${c.name}`, 'Data, projects and reports', `https://data.worldbank.org/country/${c.code}`],
    ['building', `IMF: ${c.name}`, 'Economic reviews and outlooks', `https://www.imf.org/en/Countries/${c.iso3}`],
    ['globe', `UN data: ${c.name}`, 'UN statistics country profile', `https://data.un.org/en/iso/${c.code.toLowerCase()}.html`],
  ].map(([ic, title, sub, url]) => `<a href="${url}"><span class="ic">${icon(ic)}</span><span><strong>${esc(title)}</strong><span>${esc(sub)}</span></span></a>`).join('')
    + `<a class="rc" href="https://riascolony.org/resources"><span class="ic">${icon('book')}</span><span><strong>Ria’s Colony guides</strong><span>Travel, culture and business guides</span></span></a>`;

  $('[data-sources]', main).innerHTML = sources.length
    ? `<div class="source-list">${sources.map((s) => `
        <div class="source-row"><span class="health ${s.failures ? (s.failures > 3 ? 'bad' : 'warn') : s.lastSuccessAt ? '' : 'idle'}"></span>
          <div><a class="name" href="${esc(s.homepage)}">${esc(s.name)}</a>
            <div class="sub">${LANG[s.language] || s.language} · ${nf(s.articles)} stories collected${s.lastSuccessAt ? ` · checked ${shortDate(s.lastSuccessAt)}` : ''}</div></div>
          <a class="act" href="${esc(s.homepage)}" aria-label="Visit ${esc(s.name)}">${icon('arrow-right')}</a></div>`).join('')}</div>`
    : `<div class="note">${icon('news')}<span>We don’t yet collect from a newsroom based in ${esc(c.name)}. Reporting here comes from regional and pan-African publishers, and we’re adding local sources. <a href="/sources">See all sources</a></span></div>`;
}
