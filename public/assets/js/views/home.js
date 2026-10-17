import { api } from '../api.js';
import { $, $$, esc, flag, formatIndicator, icon, KIND_LABELS, nf, shortDate } from '../lib.js';
import { renderMap } from '../map.js';
import { store } from '../store.js';
import { REGION_NAMES, editionItem, editionLead, homeReadCard, openBulkCountryFollowModal, openCountryPickerModal, openDialog, openHomeFeedSwitcherModal, openSectorPickerModal, openSignupPromptModal, skeletonRows, wireCard } from '../ui.js';
import { TOPIC_BLURBS } from './topics.js';
import { filterAds, getActiveAds, renderBannerAdHtml, renderNativeAdHtml } from '../ads.js';

const TOPIC_ICONS = {
  business: '💼',
  trade: '🚢',
  technology: '📱',
  energy: '⚡',
  agriculture: '🌾',
  tourism: '✈️',
  politics: '🏛️',
  education: '🎓',
  style: '🎨',
  health: '🏥',
  climate: '🌍',
  security: '🛡️',
  sport: '⚽',
};

function renderSuggestedCards(followedCountries = [], followedTopics = []) {
  const unFollowedCountries = POPULAR_COUNTRIES.filter((c) => !followedCountries.includes(c.code));
  const unFollowedTopics = POPULAR_TOPICS.filter((t) => !followedTopics.includes(t.slug));

  const items = [
    ...unFollowedCountries.slice(0, 2).map((c) => {
      const countryObj = store.countryByCode.get(c.code) || c;
      return {
        kind: 'country',
        code: c.code,
        name: c.name,
        sub: `${REGION_NAMES[countryObj.region] || 'Africa'} · News & economic indicators`,
        flag: flag(c.code, 'flag-md', ''),
      };
    }),
    ...unFollowedTopics.slice(0, 2).map((t) => ({
      kind: 'topic',
      code: t.slug,
      name: t.name,
      sub: TOPIC_BLURBS[t.slug] || 'Latest updates across Africa',
      flag: `<span style="font-size:1.4rem">${TOPIC_ICONS[t.slug] || '📌'}</span>`,
    })),
  ];

  return items.map((item) => `
    <div class="uh-suggest-card" data-suggest-card="${item.kind}-${item.code}">
      <div class="usc-top">
        <div class="usc-flag">${item.flag}</div>
        <div class="usc-meta">
          <span class="eyebrow" style="font-size:0.68rem;letter-spacing:0.08em">${item.kind === 'country' ? 'Country' : 'Topic'}</span>
          <h3 class="usc-title">${esc(item.name)}</h3>
          <p class="usc-sub">${esc(item.sub)}</p>
        </div>
      </div>
      <div class="usc-action">
        <button type="button" class="btn btn-outline btn-sm usc-follow-btn" data-suggest-follow="${item.kind}" data-val="${item.code}">
          ${icon('plus')} Follow
        </button>
      </div>
    </div>
  `).join('');
}

function homeCuratedCard(a) {
  const c = a.countries?.length ? store.countryByCode.get(a.countries[0]) : null;

  return `
    <article class="uh-curated-card" data-article-card="${esc(a.id)}">
      ${a.imageUrl ? `
        <div class="uhc-thumb">
          <img src="${esc(a.imageUrl)}" alt="" loading="lazy" onerror="this.parentElement.remove()">
        </div>` : ''}
      <div class="uhc-content">
        <div class="uhc-meta">
          ${c ? flag(c.code, 'uhc-flag') : ''}
          <span class="uhc-source">${esc(a.source?.name || 'Newsroom')}</span>
        </div>
        <h3 class="uhc-title">
          <a href="${esc(a.url)}" data-open-article="${esc(a.id)}">${esc(a.title)}</a>
        </h3>
        ${a.summary ? `<p class="uhc-summary">${esc(a.summary)}</p>` : ''}
        <div class="uhc-foot">
          <time class="uhc-time">${shortDate(a.publishedAt)}</time>
          <a class="uhc-read-btn" href="${esc(a.url)}" data-open-article="${esc(a.id)}">
            Read story ${icon('arrow-right')}
          </a>
        </div>
      </div>
    </article>
  `;
}

const POPULAR_COUNTRIES = [
  { code: 'NG', name: 'Nigeria' },
  { code: 'KE', name: 'Kenya' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'GH', name: 'Ghana' },
  { code: 'EG', name: 'Egypt' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'MA', name: 'Morocco' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'CI', name: 'Côte d’Ivoire' },
  { code: 'UG', name: 'Uganda' },
];

// Hubs offered as Market Wire filters on the guest home page.
const WIRE_COUNTRIES = ['NG', 'KE', 'ZA', 'GH', 'EG', 'RW', 'MA', 'ET'];
const WIRE_TOPICS = ['business', 'trade', 'technology', 'energy', 'agriculture'];

const POPULAR_TOPICS = [
  { slug: 'business', name: 'Business & Finance' },
  { slug: 'trade', name: 'Trade & AfCFTA' },
  { slug: 'technology', name: 'Technology' },
  { slug: 'energy', name: 'Energy & Infrastructure' },
  { slug: 'agriculture', name: 'Agriculture & Food' },
  { slug: 'tourism', name: 'Tourism & Travel' },
];

function previewHtml(c) {
  const pop = c.snapshot?.population;
  const growth = c.snapshot?.growth;
  const hasStats = Boolean(pop || growth);

  let statsHtml = '';
  if (hasStats) {
    statsHtml = `
      <div class="pc-stats">
        <div class="pc-stat"><strong>${pop ? formatIndicator(pop.value, 'people') : 'N/A'}</strong><span>Population${pop ? `, ${pop.year}` : ''}</span></div>
        <div class="pc-stat"><strong>${growth ? formatIndicator(growth.value, 'pct') : 'N/A'}</strong><span>GDP growth${growth ? `, ${growth.year}` : ''}</span></div>
      </div>`;
  } else {
    const rawCurr = c.currency || '';
    const currCode = rawCurr.match(/\(([^)]+)\)/)?.[1] || '';
    const currName = rawCurr ? rawCurr.split('(')[0].trim() : 'Local market';
    const sourceCount = c.sources || 1;
    statsHtml = `
      <div class="pc-stats">
        <div class="pc-stat"><strong>${esc(currName)}</strong><span>${currCode ? `Currency (${esc(currCode)})` : 'National currency'}</span></div>
        <div class="pc-stat"><strong>${sourceCount} ${sourceCount === 1 ? 'outlet' : 'outlets'}</strong><span>Local newsrooms</span></div>
      </div>`;
  }

  return `
    <div class="pc-head">${flag(c.code, 'flag-lg', `Flag of ${c.name}`)}
      <div><span class="eyebrow" style="color:var(--plum);font-weight:700">${REGION_NAMES[c.region]}</span><h3>${esc(c.name)}</h3><div class="pc-sub">Capital: <strong>${esc(c.capital || 'N/A')}</strong></div></div></div>
    ${statsHtml}
    <a class="btn btn-plum btn-block pc-btn" href="/country/${c.slug}">Explore ${esc(c.name)} ${icon('arrow-right')}</a>
    <p class="hint pc-hint">${hasStats ? 'Figures from the World Bank' : 'Country profile · StyleVault'}</p>`;
}

function openRegionModal(navigate) {
  const regions = [
    { key: 'North', name: 'North Africa', count: store.meta.countries.filter((c) => c.region === 'North').length, samples: 'Egypt, Morocco, Algeria, Tunisia, Libya, Mauritania', icon: '🏛️' },
    { key: 'West', name: 'West Africa', count: store.meta.countries.filter((c) => c.region === 'West').length, samples: 'Nigeria, Ghana, Senegal, Côte d’Ivoire, Benin, Togo...', icon: '🌴' },
    { key: 'Central', name: 'Central Africa', count: store.meta.countries.filter((c) => c.region === 'Central').length, samples: 'DR Congo, Cameroon, Gabon, Congo, Chad, CAR...', icon: '🌿' },
    { key: 'East', name: 'East Africa', count: store.meta.countries.filter((c) => c.region === 'East').length, samples: 'Kenya, Ethiopia, Rwanda, Tanzania, Uganda, Mauritius...', icon: '⛰️' },
    { key: 'Southern', name: 'Southern Africa', count: store.meta.countries.filter((c) => c.region === 'Southern').length, samples: 'South Africa, Angola, Botswana, Namibia, Zambia...', icon: '🌊' },
  ];

  openDialog(`
    <div class="sheet-drag-handle" aria-hidden="true"></div>
    <div class="sheet-head">
      <div>
        <span class="eyebrow accent">${icon('compass')} Browse by Region</span>
        <h2 style="margin-top:4px">Pick a Region in Africa</h2>
      </div>
      <button type="button" class="icon-btn" data-close aria-label="Close">${icon('close')}</button>
    </div>
    <div class="sheet-body region-modal-sheet">
      <p class="region-modal-note">See local news, economic numbers, and all 54 countries grouped by region.</p>
      <div class="region-modal-grid">
        ${regions.map((r) => `
          <a href="/countries?region=${r.key}" class="region-modal-card" data-modal-region="${r.key}">
            <div class="rmc-icon-badge" aria-hidden="true">${r.icon}</div>
            <div class="rmc-info">
              <div class="rmc-title-row">
                <strong class="rmc-title">${esc(r.name)}</strong>
              </div>
              <div class="rmc-sub-row">
                <span class="rmc-count-pill">${r.count} countries</span>
                <span class="rmc-dot" aria-hidden="true">·</span>
                <span class="rmc-sample-text">${esc(r.samples)}</span>
              </div>
            </div>
            <div class="rmc-arrow-btn" aria-hidden="true">${icon('arrow-right')}</div>
          </a>
        `).join('')}
      </div>
      <div class="region-modal-footer">
        <a href="/countries" class="btn btn-plum btn-block" data-modal-all>See all 54 countries ${icon('arrow-right')}</a>
      </div>
    </div>
  `, (dialog, close) => {
    $$('[data-modal-region], [data-modal-all]', dialog).forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const href = el.getAttribute('href');
        close();
        if (!store.user) {
          openSignupPromptModal({
            title: 'Explore African Regions',
            subtitle: 'Create a free StyleVault account to explore all 54 countries, local news, and economic numbers.',
            destination: href,
            navigate,
          });
        } else {
          navigate(href);
        }
      });
    });
  });
}

function regionsHtml() {
  const regions = [
    { key: 'North', name: 'North Africa', count: store.meta.countries.filter((c) => c.region === 'North').length, icon: '🏛️' },
    { key: 'West', name: 'West Africa', count: store.meta.countries.filter((c) => c.region === 'West').length, icon: '🌴' },
    { key: 'Central', name: 'Central Africa', count: store.meta.countries.filter((c) => c.region === 'Central').length, icon: '🌿' },
    { key: 'East', name: 'East Africa', count: store.meta.countries.filter((c) => c.region === 'East').length, icon: '⛰️' },
    { key: 'Southern', name: 'Southern Africa', count: store.meta.countries.filter((c) => c.region === 'Southern').length, icon: '🌊' },
  ];

  return `
    <div class="reg-card-head">
      <span class="eyebrow accent">${icon('globe')} All 54 Countries</span>
      <h3 style="margin-top:4px">Explore by Region</h3>
      <p style="font-size:0.86rem;color:var(--ink-2);margin-top:4px">Pick a region or search for any country below.</p>
    </div>
    <div class="cute-region-grid">
      ${regions.map((r) => `
        <button type="button" class="cute-reg-row" data-preview-region="${r.key}">
          <div class="crr-left">
            <span class="crr-icon" aria-hidden="true">${r.icon}</span>
            <strong class="crr-name">${esc(r.name)}</strong>
          </div>
          <div class="crr-right">
            <span class="crr-count">${r.count} countries</span>
            <span class="crr-arrow" aria-hidden="true">${icon('arrow-right')}</span>
          </div>
        </button>
      `).join('')}
    </div>
    <button type="button" class="cute-country-search-btn" data-trigger-country-modal>
      <div class="ccsb-icon" aria-hidden="true">${icon('search')}</div>
      <div class="ccsb-text">
        <strong>Choose a country…</strong>
        <span>Search all 54 countries</span>
      </div>
      <span class="cute-btn-pill">54 Countries</span>
    </button>`;
}

function initMapAndPicker(main, navigate, countries) {
  const preview = $('[data-preview]', main);
  if (!preview) return;
  const touch = matchMedia('(hover: none)').matches;
  let previewed = null;
  const isGuest = !store.user;

  function bindPreviewInteractions(el) {
    $$('[data-preview-region]', el).forEach((btn) => {
      btn.addEventListener('click', () => {
        const region = btn.dataset.previewRegion;
        if (isGuest) {
          openSignupPromptModal({
            title: `Explore ${REGION_NAMES[region]}`,
            subtitle: `Create a free StyleVault account to read local news and check economic numbers across ${REGION_NAMES[region]}.`,
            destination: `/countries?region=${region}`,
            navigate,
          });
        } else {
          navigate(`/countries?region=${region}`);
        }
      });
    });

    const searchBtn = $('[data-trigger-country-modal]', el);
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        openCountryPickerModal({
          isGuest,
          navigate,
          onSelect: (c) => {
            if (isGuest) {
              openSignupPromptModal({
                title: `Explore ${c.name}`,
                subtitle: `Create a free StyleVault account to see ${c.name}'s full page, World Bank numbers, and local news.`,
                destination: `/country/${c.slug}`,
                navigate,
              });
            } else {
              navigate(`/country/${c.slug}`);
            }
          },
        });
      });
    }

    const fileBtn = $('.pc-btn', el);
    if (fileBtn && isGuest) {
      fileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const href = fileBtn.getAttribute('href');
        openSignupPromptModal({
          title: 'Unlock Country Page',
          subtitle: 'Create a free StyleVault account to see this country’s full profile, World Bank data, and local news.',
          destination: href,
          navigate,
        });
      });
    }
  }

  bindPreviewInteractions(preview);

  const mapEl = $('[data-map]', main);
  if (mapEl) {
    renderMap(mapEl, {
      onFocus: (c) => {
        previewed = c.code;
        preview.innerHTML = previewHtml(c);
        bindPreviewInteractions(preview);
      },
      onOpen: (c) => {
        if (touch && previewed !== c.code) {
          previewed = c.code;
          preview.innerHTML = previewHtml(c);
          bindPreviewInteractions(preview);
          return;
        }
        if (isGuest) {
          openSignupPromptModal({
            title: `Explore ${c.name}`,
            subtitle: `Create a free StyleVault account to see ${c.name}'s full page, World Bank numbers, and local news.`,
            destination: `/country/${c.slug}`,
            navigate,
          });
        } else {
          navigate(`/country/${c.slug}`);
        }
      },
    }).then(() => mapEl.removeAttribute('aria-busy'));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNED-IN PERSONALIZED HOME VIEW
// ─────────────────────────────────────────────────────────────────────────────
const unique = (arr) => [...new Set(arr)];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/** "Nigeria, Kenya and Trade & AfCFTA" with each name linking to its page. */
function followsSentence(countryCodes, topicSlugs) {
  const links = [
    ...countryCodes.map((code) => store.countryByCode.get(code)).filter(Boolean)
      .map((c) => `<a href="/country/${c.slug}">${esc(c.name)}</a>`),
    ...topicSlugs.map((slug) => store.topicBySlug.get(slug)).filter(Boolean)
      .map((t) => `<a href="/topic/${t.slug}">${esc(t.name)}</a>`),
  ];
  if (!links.length) return '';
  if (links.length <= 6) {
    if (links.length === 1) return links[0];
    return `${links.slice(0, -1).join(', ')} and ${links.at(-1)}`;
  }
  const shown = links.slice(0, 5);
  const extra = links.length - shown.length;
  return `${shown.join(', ')} and ${extra} more`;
}

/** Diversify stories so the same publisher doesn't appear 3 times in a row. */
function diversifyBySource(items, max = 4) {
  const result = [];
  const usedPerSource = new Map();
  for (const item of items) {
    const src = item.source?.name || '';
    const count = usedPerSource.get(src) || 0;
    if (count === 0) {
      result.push(item);
      usedPerSource.set(src, 1);
      if (result.length >= max) return result;
    }
  }
  for (const item of items) {
    if (!result.includes(item)) {
      result.push(item);
      if (result.length >= max) return result;
    }
  }
  return result;
}

async function renderUserHome(main, { setTitle, navigate }) {
  setTitle('Home');
  main.style.paddingBottom = '0';
  const user = store.user;
  const monitors = store.monitors || [];
  const firstName = user.name ? user.name.split(' ')[0] : user.email.split('@')[0];
  const followedCountries = unique(monitors.flatMap((m) => m.countries || []));
  const followedTopics = unique(monitors.flatMap((m) => m.topics || []));
  const savedCount = store.savedIds.size;
  const rerender = () => renderUserHome(main, { setTitle, navigate });

  const todayStr = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  const lede = monitors.length
    ? `Here is the latest from ${followsSentence(followedCountries, followedTopics) || 'the places and topics you follow'}.`
    : 'Pick a few countries and topics below so we can bring you the stories that matter to you.';

  main.innerHTML = `
    <div class="uh">
      <header class="uh-hello">
        <div class="wrap uh-hello-inner">
          <div>
            <span class="uh-date"><span class="live-dot-sm"></span> ${esc(todayStr)}</span>
            <h1>${greeting()}, ${esc(firstName)}</h1>
            <p class="uh-lede">${lede}</p>
          </div>
          <nav class="uh-quick" aria-label="Quick links">
            <a href="/saved" class="uh-quick-pill">${icon('bookmark')} <span>Saved${savedCount ? ` (${savedCount})` : ''}</span></a>
            <a href="/following" class="uh-quick-pill">${icon('star')} <span>Following${monitors.length ? ` (${monitors.length})` : ''}</span></a>
            <a href="/countries" class="uh-quick-pill">${icon('globe')} <span>54 Countries</span></a>
          </nav>
        </div>
      </header>

      ${monitors.length ? `
        <section class="uh-block">
          <div class="wrap">
            <div class="uh-head">
              <div>
                <span class="eyebrow">Picked for you</span>
                <h2>Stories for you</h2>
                <p>Recent news from the countries and topics you follow.</p>
              </div>
              <a class="btn btn-outline btn-sm" href="/following">Change what you follow ${icon('arrow-right')}</a>
            </div>
            ${monitors.length > 1 ? `
              <div class="uh-switcher-bar">
                <button type="button" class="flw-dropdown-btn" data-open-home-switcher aria-haspopup="dialog" title="Filter stories for you">
                  <span class="flw-dd-indicator"><span class="flw-dd-dot"></span></span>
                  <span class="flw-dd-label" style="opacity:0.8;font-weight:400;margin-right:2px">Viewing:</span>
                  <span class="flw-dd-name" data-home-tab-name>Everything</span>
                  <span class="flw-dd-count">${monitors.length}</span>
                  <span class="flw-dd-chev" aria-hidden="true">${icon('chevron-down')}</span>
                </button>
              </div>` : ''}
            <div class="ed-grid" data-brief>
              <div class="skeleton ed-sk-lead"></div>
              <div>${skeletonRows(3)}</div>
            </div>
          </div>
        </section>

        <div data-ad-banner-slot></div>

        <!-- Behavioral Curation: Based on your reading -->
        <section class="uh-block warm" data-curated-section>
          <div class="wrap">
            <div class="uh-head">
              <div>
                <h2>Based on your recent reading</h2>
                <p>Stories matched to what you’ve been exploring across StyleVault.</p>
              </div>
            </div>
            <div class="uh-curated-grid" data-curated-feed>
              ${skeletonRows(3)}
            </div>
          </div>
        </section>

        <!-- Suggestions to follow with 1-click -->
        <section class="uh-block" data-suggestions-section>
          <div class="wrap">
            <div class="uh-head">
              <div>
                <h2>Places and topics you might like</h2>
                <p>Follow in one tap to add live updates into your home feed.</p>
              </div>
              <a class="text-link" href="/following">See all following ${icon('arrow-right')}</a>
            </div>
            <div class="uh-suggest-grid" data-suggestions-grid>
              ${renderSuggestedCards(followedCountries, followedTopics)}
            </div>
          </div>
        </section>

      ` : `
        <section class="uh-block">
          <div class="wrap">
            <div class="uh-setup">
              <div class="uh-setup-intro">
                <span class="eyebrow">Make it yours</span>
                <h2>What would you like to follow?</h2>
                <p>Tap a few countries and topics below to build your personal home page.</p>
              </div>
              <div class="uh-setup-group">
                <div class="uh-setup-label">
                  <h3>Countries</h3>
                  <button type="button" class="text-link" data-more-countries>See all 54</button>
                </div>
                <div class="chips wrap-chips" data-country-chips>
                  ${POPULAR_COUNTRIES.slice(0, 10).map((c) => `<button type="button" class="chip" data-code="${c.code}" aria-pressed="false">${flag(c.code, 'flag', '')} ${esc(c.name)}</button>`).join('')}
                </div>
              </div>
              <div class="uh-setup-group">
                <div class="uh-setup-label"><h3>Topics</h3></div>
                <div class="chips wrap-chips" data-topic-chips>
                  ${POPULAR_TOPICS.map((t) => `<button type="button" class="chip" data-slug="${t.slug}" aria-pressed="false">${esc(t.name)}</button>`).join('')}
                </div>
              </div>
              <div class="uh-setup-foot">
                <span class="hint" data-setup-hint>You can change this anytime on your Following page.</span>
                <button type="button" class="btn btn-plum btn-sm" data-save-setup>Save my choices ${icon('arrow-right')}</button>
              </div>
            </div>
          </div>
        </section>
      `}

      <!-- Colorful Topic Cards -->
      <section class="uh-block uh-topics-band">
        <div class="wrap">
          <div class="uh-head">
            <div>
              <span class="eyebrow">Browse by topic</span>
              <h2>Explore key topics across Africa</h2>
              <p>Jump straight into business, trade, energy, or farming news.</p>
            </div>
            <a class="text-link" href="/topics">All 13 topics ${icon('arrow-right')}</a>
          </div>
          <div class="channel-grid">
            <div class="channel-card">
              <span class="channel-icon">🚢</span>
              <h3><a href="/topic/trade">Trade &amp; AfCFTA</a></h3>
              <p>Cross-border trade, ports, shipping routes, and new rules making it easier to do business across Africa.</p>
              <span class="channel-meta">Read trade stories ${icon('arrow-right')}</span>
            </div>
            <div class="channel-card">
              <span class="channel-icon">💼</span>
              <h3><a href="/topic/business">Business &amp; Banking</a></h3>
              <p>Startups, mobile money, banking news, central bank decisions, and company investments.</p>
              <span class="channel-meta">Read business stories ${icon('arrow-right')}</span>
            </div>
            <div class="channel-card">
              <span class="channel-icon">⚡</span>
              <h3><a href="/topic/energy">Energy &amp; Power</a></h3>
              <p>Solar projects, power grids, clean energy, mining, and major building projects.</p>
              <span class="channel-meta">Read energy stories ${icon('arrow-right')}</span>
            </div>
            <div class="channel-card">
              <span class="channel-icon">🌾</span>
              <h3><a href="/topic/agriculture">Farming &amp; Food</a></h3>
              <p>Food harvests, crop exports, farming tech, and how countries are keeping food affordable.</p>
              <span class="channel-meta">Read farming stories ${icon('arrow-right')}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="uh-block warm">
        <div class="wrap uh-split">
          <div class="uh-panel uh-panel-news">
            <div class="uh-head">
              <div>
                <h2>Across Africa today</h2>
                <p>More big stories happening around the continent right now.</p>
              </div>
              <a class="text-link" href="/news">All news ${icon('arrow-right')}</a>
            </div>
            <div class="uh-reads" data-wider>${skeletonRows(4)}</div>
          </div>
          <div class="uh-panel uh-panel-vault">
            <div class="uh-head">
              <div>
                <h2>${followedCountries.length || followedTopics.length ? 'Research for you' : 'Research &amp; reports'}</h2>
                <p>Deeper reports and policy papers from African institutions.</p>
              </div>
              <a class="text-link" href="/research">All reports ${icon('arrow-right')}</a>
            </div>
            <div class="uh-reads" data-research>${skeletonRows(3)}</div>
          </div>
        </div>
      </section>

      <section class="colony-band">
        <div class="wrap colony-band-wrap">
          <div class="colony-band-copy">
            <h2>Planning a trip or doing business in Africa?</h2>
            <p>Ria’s Colony helps people travel and work across African countries with local guides, warm introductions, and practical on-the-ground support.</p>
          </div>
          <div class="btns colony-band-btns">
            <a class="btn btn-white" href="/tools">Explore travel tools ${icon('arrow-right')}</a>
            <a class="btn btn-outline-light" href="/tools">Browse all tools</a>
          </div>
        </div>
      </section>
    </div>
  `;

  // ── Stories for you: lead story plus a short numbered list ────────────────
  const briefIds = new Set();
  let briefReq = Promise.resolve([]);

  function monitorQuery(sel) {
    const q = { limit: 8 };
    if (!sel || sel === 'all' || sel.type === 'all') {
      if (followedCountries.length) q.country = followedCountries.slice(0, 54);
      else if (followedTopics.length) q.topic = followedTopics.slice(0, 50);
    } else if (sel.type === 'country') {
      q.country = [sel.value];
    } else if (sel.type === 'topic') {
      q.topic = [sel.value];
    } else if (typeof sel === 'string') {
      const m = monitors[Number(sel)];
      if (m?.countries?.length) q.country = m.countries;
      if (m?.topics?.length) q.topic = m.topics;
      if (m?.keywords) q.q = m.keywords;
    }
    return q;
  }

  function loadBrief(sel) {
    const box = $('[data-brief]', main);
    box.innerHTML = `<div class="skeleton ed-sk-lead"></div><div>${skeletonRows(3)}</div>`;
    const req = api.articles(monitorQuery(sel)).then(({ items }) => items || []);
    req.then((items) => {
      if (!items.length) {
        box.innerHTML = `
          <div class="uh-empty">
            <p>No new stories here over the last few days. Try following a few more countries or topics to see more updates.</p>
            <a class="text-link" href="/following">Change what you follow ${icon('arrow-right')}</a>
          </div>`;
        return;
      }
      items.forEach((a) => briefIds.add(a.id));
      const lead = items.find((a) => a.imageUrl) || items[0];
      const rest = items.filter((a) => a !== lead).slice(0, 4);
      box.innerHTML = `
        ${editionLead(lead)}
        <div class="ed-list"><span class="ed-list-lbl">More stories for you</span>${rest.map((a, i) => editionItem(a, i + 2)).join('')}</div>`;
    }).catch(() => {
      box.innerHTML = `<div class="uh-empty"><p>We couldn’t load your stories right now. Please try again in a moment.</p></div>`;
    });
    return req.catch(() => []);
  }

  if (monitors.length) {
    let activeSelection = { type: 'all', name: 'All followed stories' };
    briefReq = loadBrief(activeSelection);

    const switcherBtn = $('[data-open-home-switcher]', main);
    if (switcherBtn) {
      switcherBtn.addEventListener('click', () => {
        openHomeFeedSwitcherModal({
          activeSelection,
          onSelect: (sel) => {
            activeSelection = sel;
            const labelEl = $('[data-home-tab-name]', main);
            if (labelEl) labelEl.textContent = sel.name || 'All followed stories';
            loadBrief(sel);
          },
          onManage: () => {
            openBulkCountryFollowModal({
              onSaved: () => rerender(),
            });
          },
        });
      });
    }

    $('[data-follow-country]', main)?.addEventListener('click', () => {
      openCountryPickerModal({
        onSelect: async (c) => {
          if (!c || followedCountries.includes(c.code)) return;
          await store.toggleFollow('country', c.code).catch(() => {});
          rerender();
        },
      });
    });
  }

  // ── Suggestions 1-click follow handler ───────────────────────────────────
  main.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-suggest-follow]');
    if (!btn) return;
    const kind = btn.dataset.suggestFollow;
    const val = btn.dataset.val;
    try {
      const nowOn = await store.toggleFollow(kind, val);
      if (nowOn) {
        btn.classList.remove('btn-outline');
        btn.classList.add('btn-plum', 'is-on');
        btn.innerHTML = `${icon('check')} Following`;
        const name = kind === 'country' ? store.countryByCode.get(val)?.name : store.topicBySlug.get(val)?.name;
        toast(`Following ${name || val}`);
      } else {
        btn.classList.add('btn-outline');
        btn.classList.remove('btn-plum', 'is-on');
        btn.innerHTML = `${icon('plus')} Follow`;
      }
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  // ── Behavioral Curation: load stories tailored to user activity ──────────
  const activity = store.getReadingActivity();
  const curatedBox = $('[data-curated-feed]', main);
  const curQuery = { kind: 'news', limit: 12 };
  if (activity.topCountries.length) {
    curQuery.country = activity.topCountries.slice(0, 6);
  } else if (followedCountries.length) {
    curQuery.country = followedCountries.slice(0, 10);
  }
  if (activity.topTopics.length) {
    curQuery.topic = activity.topTopics.slice(0, 4);
  } else if (followedTopics.length) {
    curQuery.topic = followedTopics.slice(0, 4);
  }

  getActiveAds().then((ads) => {
    const banners = filterAds(ads, { type: 'banner', placement: 'home' });
    const bannerSlot = $('[data-ad-banner-slot]', main);
    if (banners.length && bannerSlot) {
      bannerSlot.innerHTML = renderBannerAdHtml(banners[0]);
    }
  }).catch(() => {});

  api.articles(curQuery).then(async ({ items }) => {
    if (!curatedBox) return;
    let curated = (items || []).filter((a) => !briefIds.has(a.id));
    if (!curated.length) curated = items || [];
    curated = curated.slice(0, 6);

    if (!curated.length) {
      curatedBox.innerHTML = '<p class="hint">Read articles and explore country profiles to see stories curated for your interests here.</p>';
      return;
    }

    const ads = await getActiveAds().catch(() => []);
    const nativeAds = filterAds(ads, { type: 'native', placement: 'home' });
    let html = curated.map((a) => homeCuratedCard(a)).join('');
    if (nativeAds.length) {
      html += renderNativeAdHtml(nativeAds[0]);
    }
    curatedBox.innerHTML = html;
  }).catch(() => {
    if (curatedBox) curatedBox.innerHTML = '<p class="hint">Stories couldn’t load just now.</p>';
  });

  // ── Across Africa today: general news not already shown above ─────────────
  Promise.all([briefReq, api.articles({ kind: 'news', limit: 16 }).then((r) => r.items || [])]).then(([, items]) => {
    const box = $('[data-wider]', main);
    if (!box) return;
    const fresh = diversifyBySource(items.filter((a) => !briefIds.has(a.id)), 4);
    box.innerHTML = fresh.length
      ? fresh.map(homeReadCard).join('')
      : `<p class="hint">No new stories yet today. <a class="text-link" href="/news">See all news</a></p>`;
  }).catch(() => {
    const box = $('[data-wider]', main);
    if (box) box.innerHTML = '<p class="hint">Stories couldn’t load just now.</p>';
  });

  // ── Research for you: reports on followed countries, then general reports ─
  const kinds = ['research', 'analysis', 'official'];
  const personal = followedCountries.length || followedTopics.length
    ? api.articles({ kind: kinds, country: followedCountries.slice(0, 10), topic: followedTopics.slice(0, 5), limit: 6 }).then((r) => r.items || [])
    : Promise.resolve([]);
  personal
    .then((items) => (items.length ? items : api.articles({ kind: kinds, limit: 6 }).then((r) => r.items || [])))
    .then((items) => {
      const box = $('[data-research]', main);
      if (!box) return;
      const picked = diversifyBySource(items, 4);
      box.innerHTML = picked.length
        ? picked.map(homeReadCard).join('')
        : '<p class="hint">New reports will show up here as soon as they are published.</p>';
    })
    .catch(() => {
      const box = $('[data-research]', main);
      if (box) box.innerHTML = '<p class="hint">Reports couldn’t load just now.</p>';
    });

  // ── First-run setup: pick countries and topics, save as one item ──────────
  if (!monitors.length) {
    const bindChip = (chip) => chip.addEventListener('click', () => {
      chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
    });
    $$('[data-country-chips] .chip, [data-topic-chips] .chip', main).forEach(bindChip);

    $('[data-more-countries]', main)?.addEventListener('click', () => {
      openBulkCountryFollowModal({
        onSaved: () => rerender(),
      });
    });

    const saveBtn = $('[data-save-setup]', main);
    const hint = $('[data-setup-hint]', main);
    saveBtn.addEventListener('click', async () => {
      const countries = $$('[data-country-chips] .chip[aria-pressed="true"]', main).map((c) => c.dataset.code);
      const topics = $$('[data-topic-chips] .chip[aria-pressed="true"]', main).map((t) => t.dataset.slug);
      if (!countries.length && !topics.length) {
        hint.textContent = 'Pick at least one country or topic to get started.';
        return;
      }
      saveBtn.disabled = true;
      try {
        if (countries.length) {
          await store.syncFollowedCountries(countries);
        }
        for (const slug of topics) {
          const t = store.topicBySlug.get(slug);
          await store.saveMonitor({
            name: t ? t.name : slug,
            countries: [],
            topics: [slug],
            keywords: '',
          });
        }
        rerender();
      } catch (err) {
        hint.textContent = err.message;
        saveBtn.disabled = false;
      }
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNED-OUT GUEST HOME VIEW (Supports in-browser personalization without signup)
// ─────────────────────────────────────────────────────────────────────────────
async function renderGuestHome(main, { setTitle, navigate }) {
  setTitle('');
  main.style.paddingBottom = '0';
  const { stats, countries } = store.meta;
  const todayStr = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  // Active filter state for the guest news feed
  let activeCountry = null;
  let activeTopic = null;

  main.innerHTML = `
    <!-- Photo hero with plum overlay -->
    <section class="gh-hero">
      <img class="gh-hero-img" src="/assets/img/hero-map.webp" alt="" fetchpriority="high">
      <div class="wrap gh-hero-inner">
        <h1>Understand Africa, <em>one country at a time.</em></h1>
        <p>Local news, 15 years of World Bank numbers, and research from across the continent.<span class="gh-more"> Every story is dated and links straight to the original publisher.</span></p>
        <form class="hero-search" role="search" data-search>
          ${icon('search')}
          <input type="search" name="q" placeholder="Search for a country, topic, or question…" aria-label="Search Style Vault" list="country-list" autocomplete="off">
          <datalist id="country-list">${countries.map((c) => `<option value="${esc(c.name)}">`).join('')}</datalist>
          <button class="btn btn-accent" type="submit">Search</button>
        </form>
      </div>
      <div class="gh-bar">
        <div class="wrap gh-bar-inner">
          <span class="gh-bar-text">Start following countries and saving stories:</span>
          <a class="gh-bar-btn" href="/signup">Create an account</a>
          <span class="gh-bar-or">or</span>
          <a class="gh-bar-link" href="/login">Sign in</a>
        </div>
      </div>
    </section>

    <!-- Dedicated Movement: Regional Gateways -->
    <section class="section-region-bar">
      <div class="wrap">
        <div class="rg-bar">
          <div class="rg-copy">
            <span class="eyebrow accent">Browse by Region</span>
            <h2>Explore Africa by Region</h2>
            <p>See local news, economic trends, and country profiles grouped by region.</p>
          </div>
          <div class="rg-actions">
            <button type="button" class="rg-trigger" data-region-modal-trigger aria-haspopup="dialog">
              <span class="rg-trigger-label">${icon('map')} <span>Pick a region…</span></span>
              <span class="rg-trigger-arrow">${icon('chevron-down')}</span>
            </button>
            <div class="rg-chips">
              ${Object.entries(REGION_NAMES).map(([k, v]) => `
                <a href="/countries?region=${k}" class="rg-chip">
                  <span>${v}</span>
                  <span class="rg-chip-count">${store.meta.countries.filter((c) => c.region === k).length}</span>
                </a>
              `).join('')}
              <a href="/countries" class="rg-chip rg-chip-all">All 54 Countries ${icon('arrow-right')}</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Movement 1: Daily Edition -->
    <section class="section edition">
      <div class="wrap">
        <div class="ed-head">
          <div>
            <div class="ed-mast">
              <span class="ed-badge">Today’s Top Stories</span>
              <span class="ed-date">${esc(todayStr)}</span>
            </div>
            <h2>Big stories from African newsrooms</h2>
            <p>The most important news today, gathered from trusted local publishers across the continent.</p>
          </div>
          <a class="btn btn-outline btn-sm ed-wire-btn" href="/news">See all news ${icon('arrow-right')}</a>
        </div>
        <div class="ed-grid" data-lead-box>
          <div class="skeleton ed-sk-lead"></div>
          <div>${skeletonRows(3)}</div>
        </div>
      </div>
    </section>

    <!-- Movement 2: Key Topics -->
    <section class="section warm tight">
      <div class="wrap">
        <div class="section-head" style="margin-bottom:28px">
          <div>
            <span class="eyebrow">Browse by topic</span>
            <h2>Major topics across Africa</h2>
            <p>Follow new laws, business deals, and everyday changes shaping the continent.</p>
          </div>
          <a class="text-link" href="/topics">All 13 topics ${icon('arrow-right')}</a>
        </div>

        <div class="channel-grid">
          <div class="channel-card">
            <span class="channel-icon">🚢</span>
            <h3><a href="/topic/trade">Trade &amp; AfCFTA</a></h3>
            <p>Cross-border trade, ports, shipping routes, and new rules making it easier to do business across Africa.</p>
            <span class="channel-meta">Read trade stories ${icon('arrow-right')}</span>
          </div>

          <div class="channel-card">
            <span class="channel-icon">💼</span>
            <h3><a href="/topic/business">Business &amp; Banking</a></h3>
            <p>Startups, mobile money, banking news, central bank decisions, and company investments.</p>
            <span class="channel-meta">Read business stories ${icon('arrow-right')}</span>
          </div>

          <div class="channel-card">
            <span class="channel-icon">⚡</span>
            <h3><a href="/topic/energy">Energy &amp; Power</a></h3>
            <p>Solar projects, power grids, clean energy, mining, and major building projects.</p>
            <span class="channel-meta">Read energy stories ${icon('arrow-right')}</span>
          </div>

          <div class="channel-card">
            <span class="channel-icon">🌾</span>
            <h3><a href="/topic/agriculture">Farming &amp; Food</a></h3>
            <p>Food harvests, crop exports, farming tech, and how countries are keeping food affordable.</p>
            <span class="channel-meta">Read farming stories ${icon('arrow-right')}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Movement 3: Stories by Country & Topic -->
    <section class="section wire-section">
      <div class="wrap">
        <div class="section-head">
          <div>
            <span class="eyebrow accent">Explore Stories</span>
            <h2>Stories by country and topic</h2>
            <p>Pick any country or topic below to see the latest news. Every story links straight to its original publisher.</p>
          </div>
        </div>

        <div class="wire-panel">
          <div class="wire-filters" data-market-filter>
            <div class="wire-filter-toolbar">
              <div class="wire-filter-col">
                <span class="wire-filter-kicker">${icon('globe')} Country</span>
                <button type="button" class="wire-filter-btn wire-btn-country" data-trigger-wire-country aria-haspopup="dialog" aria-label="Choose a country">
                  <span class="wfb-flag" data-wire-country-flag>🌍</span>
                  <span class="wfb-label" data-wire-country-label>All of Africa (54 Countries)</span>
                  <span class="wfb-chevron" aria-hidden="true">${icon('chevron-down')}</span>
                </button>
              </div>
              <div class="wire-filter-col">
                <span class="wire-filter-kicker">⚡ Topic</span>
                <button type="button" class="wire-filter-btn wire-btn-sector" data-trigger-wire-sector aria-haspopup="dialog" aria-label="Choose a topic">
                  <span class="wfb-flag" data-wire-sector-flag>📊</span>
                  <span class="wfb-label" data-wire-sector-label>All Topics</span>
                  <span class="wfb-chevron" aria-hidden="true">${icon('chevron-down')}</span>
                </button>
              </div>
            </div>
          </div>
          <div class="wire-status">
            <div class="wire-status-scope" aria-live="polite">
              <span class="ws-prefix">Showing</span>
              <span class="ws-pill">
                <span class="live-dot-sm" aria-hidden="true"></span>
                <strong data-wire-label>All of Africa</strong>
              </span>
            </div>
            <a class="wire-more-link" href="/news" data-wire-more>
              <span>See all stories</span>
              ${icon('arrow-right')}
            </a>
          </div>
          <div data-wire-container>${skeletonRows(3)}</div>
        </div>

        <div class="wire-cta">
          <div>
            <strong>Want to save stories or follow specific countries?</strong>
            <p>Create a free account to follow the places you care about and save stories to read later.</p>
          </div>
          <a class="btn btn-plum btn-sm" href="/signup">Join free</a>
        </div>
      </div>
    </section>

    <!-- Movement 4: The 54-Country Interactive Continent Explorer -->
    <section class="section warm">
      <div class="wrap explorer">
        <div data-map aria-busy="true" style="min-height:300px"></div>
        <div>
          <div class="preview-card" data-preview>${regionsHtml()}</div>
        </div>
      </div>
    </section>
  `;

  // Search form handler: prompt unauthenticated guests to create an account
  $('[data-search]', main).addEventListener('submit', (e) => {
    e.preventDefault();
    const q = e.target.q.value.trim();
    openSignupPromptModal({
      title: 'Search across Africa',
      subtitle: 'Create a free StyleVault account to search news, economic data, and country archives.',
      destination: `/search?q=${encodeURIComponent(q)}`,
      navigate,
    });
  });

  // Custom Region dropdown menu modal trigger: prompt guests directly
  const regionModalBtn = $('[data-region-modal-trigger]', main);
  if (regionModalBtn) {
    regionModalBtn.addEventListener('click', () => {
      openSignupPromptModal({
        title: 'Explore Africa by Region',
        subtitle: 'Create a free StyleVault account to explore all 54 African countries, local news, and economic numbers grouped by region.',
        destination: '/countries',
        navigate,
      });
    });
  }

  // Init Interactive Map
  initMapAndPicker(main, navigate, countries);

  // ── Load Movement 1: Daily Edition (lead with a photo when one exists) ────
  const editionReq = api.articles({ kind: 'news', limit: 8 });
  editionReq.then(({ items }) => {
    const box = $('[data-lead-box]', main);
    if (!box) return;
    if (!items.length) {
      box.innerHTML = `
        <div class="ed-empty-state">
          <div class="ed-empty-badge">${icon('compass')} <span>Updating now</span></div>
          <div class="ed-empty-body">
            <h3>Gathering today’s stories</h3>
            <p>We check 90+ African newsrooms and official sources every hour. Browse all news or pick a country below while new stories load.</p>
          </div>
          <div class="ed-empty-actions">
            <a class="btn btn-accent btn-sm" href="/news">See All News ${icon('arrow-right')}</a>
            <a class="btn btn-outline btn-sm" href="/countries">Browse 54 Countries</a>
          </div>
        </div>`;
      return;
    }
    const lead = items.find((a) => a.imageUrl) || items[0];
    const rest = items.filter((a) => a !== lead).slice(0, 4);
    box.innerHTML = `
      ${editionLead(lead)}
      <div class="ed-list"><span class="ed-list-lbl">Also today</span>${rest.map((a, i) => editionItem(a, i + 2)).join('')}</div>`;
  }).catch(() => {});

  // ── Load Movement 3: Stories with filter ──────────────────────────────────
  const wireContainer = $('[data-wire-container]', main);
  const wireLabel = $('[data-wire-label]', main);
  const wireMore = $('[data-wire-more]', main);

  function loadWire() {
    wireContainer.innerHTML = skeletonRows(3);
    const queryObj = { limit: 8 };
    if (activeCountry) queryObj.country = activeCountry;
    if (activeTopic) queryObj.topic = activeTopic;

    api.articles({ ...queryObj, kind: 'news' }).then(({ items }) => {
      if (items && items.length) return items;
      return api.articles(queryObj).then((res) => res.items || []).catch(() => []);
    }).then((items) => {
      if (!items.length) {
        const countryName = activeCountry ? store.countryByCode.get(activeCountry)?.name : null;
        const topicName = activeTopic ? store.topicBySlug.get(activeTopic)?.name : null;
        const filterDesc = countryName && topicName ? `${countryName} (${topicName})` : countryName || topicName || 'All of Africa';

        wireContainer.innerHTML = `
          <div class="wire-empty-card">
            <div class="wec-badge"><span class="live-dot-sm"></span> <span>Updated hourly</span></div>
            <div class="wec-body">
              <h3>Latest stories · ${esc(filterDesc)}</h3>
              <p>We check 90+ African newsrooms and official sources every hour for new stories.</p>
            </div>
            <div class="wec-actions">
              <a class="btn btn-accent btn-sm" href="/news">See All News ${icon('arrow-right')}</a>
              ${countryName ? `<a class="btn btn-outline btn-sm" href="/country/${store.countryByCode.get(activeCountry)?.slug}">Open ${esc(countryName)}</a>` : `<a class="btn btn-outline btn-sm" href="/countries">Browse 54 Countries</a>`}
            </div>
          </div>`;
        return;
      }
      wireContainer.innerHTML = `<div class="wire-grid">${items.slice(0, 6).map(wireCard).join('')}</div>`;
    }).catch(() => {
      wireContainer.innerHTML = `
        <div class="wire-empty-card">
          <div class="wec-badge"><span class="live-dot-sm"></span> <span>Updated hourly</span></div>
          <div class="wec-body">
            <h3>Latest stories from across Africa</h3>
            <p>We check 90+ African newsrooms and official sources every hour for new stories.</p>
          </div>
          <div class="wec-actions">
            <a class="btn btn-accent btn-sm" href="/news">See All News ${icon('arrow-right')}</a>
          </div>
        </div>`;
    });
  }

  function updateWireUI() {
    const parts = [];
    if (activeCountry) parts.push(store.countryByCode.get(activeCountry)?.name);
    else parts.push('All of Africa');
    if (activeTopic) parts.push(store.topicBySlug.get(activeTopic)?.name);

    wireLabel.textContent = parts.join(' · ');
    const country = activeCountry && store.countryByCode.get(activeCountry);
    wireMore.href = country ? `/country/${country.slug}` : activeTopic ? `/topic/${activeTopic}` : '/news';
    loadWire();
  }

  const triggerCountry = $('[data-trigger-wire-country]', main);
  if (triggerCountry) {
    triggerCountry.addEventListener('click', () => {
      openSignupPromptModal({
        title: 'Filter Stories by Country',
        subtitle: 'Create a free StyleVault account to filter news across all 54 African countries.',
        destination: '/countries',
        navigate,
      });
    });
  }

  const triggerSector = $('[data-trigger-wire-sector]', main);
  if (triggerSector) {
    triggerSector.addEventListener('click', () => {
      openSignupPromptModal({
        title: 'Filter Stories by Topic',
        subtitle: 'Create a free StyleVault account to filter stories across business, energy, mining, and trade.',
        destination: '/topics',
        navigate,
      });
    });
  }

  loadWire();
}

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT ROUTER DISPATCHER
// ─────────────────────────────────────────────────────────────────────────────
export default async function home(main, context) {
  if (store.user) {
    return renderUserHome(main, context);
  }
  return renderGuestHome(main, context);
}
