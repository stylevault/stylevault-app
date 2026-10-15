import { api } from '../api.js';
import { $, $$, esc, flag, formatIndicator, icon, nf } from '../lib.js';
import { renderMap } from '../map.js';
import { store } from '../store.js';
import { REGION_NAMES, indicatorCard, newsRow, readCard, skeletonCards, skeletonRows } from '../ui.js';

const INDICATOR_META = {
  'SP.POP.TOTL': { code: 'SP.POP.TOTL', label: 'Population', format: 'people' },
  'NY.GDP.MKTP.KD.ZG': { code: 'NY.GDP.MKTP.KD.ZG', label: 'Economic growth', unit: 'annual GDP growth', format: 'pct' },
  'SP.DYN.LE00.IN': { code: 'SP.DYN.LE00.IN', label: 'Life expectancy', unit: 'years at birth', format: 'years' },
  'IT.NET.USER.ZS': { code: 'IT.NET.USER.ZS', label: 'Internet use', unit: 'share of population', format: 'pct' },
};

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

function initMapAndPicker(main, navigate, countries) {
  const preview = $('[data-preview]', main);
  if (!preview) return;
  const touch = matchMedia('(hover: none)').matches;
  let previewed = null;
  const mapEl = $('[data-map]', main);
  if (mapEl) {
    renderMap(mapEl, {
      onFocus: (c) => { previewed = c.code; preview.innerHTML = previewHtml(c); },
      onOpen: (c) => {
        if (touch && previewed !== c.code) { previewed = c.code; preview.innerHTML = previewHtml(c); return; }
        navigate(`/country/${c.slug}`);
      },
    }).then(() => mapEl.removeAttribute('aria-busy'));
  }
  const picker = $('[data-picker]', main);
  if (picker) {
    picker.addEventListener('change', (e) => e.target.value && navigate(`/country/${e.target.value}`));
  }
}

function initSampleCountry(main, countries) {
  const pool = countries.filter((c) => c.sources >= 2);
  const day = Math.floor(Date.now() / 86_400_000);
  const featured = pool[day % Math.max(pool.length, 1)] || countries[0];
  if (!featured) return;
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

function initResearchCards(main) {
  Promise.all([
    api.articles({ kind: ['research', 'official'], limit: 3 }),
    api.articles({ kind: 'analysis', limit: 6 }),
  ]).then(([inst, analysis]) => {
    const items = [...inst.items, ...analysis.items].slice(0, 6);
    const box = $('[data-research]', main);
    if (box) box.innerHTML = items.length ? `<div class="card-grid">${items.map(readCard).join('')}</div>` : '';
  }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNED-IN PERSONALIZED HOME VIEW
// ─────────────────────────────────────────────────────────────────────────────
async function renderUserHome(main, { setTitle, navigate }) {
  setTitle('Your Briefing');
  main.style.paddingBottom = '0';
  const { stats, countries } = store.meta;
  const user = store.user;
  const monitors = store.monitors || [];
  const firstName = user.name ? user.name.split(' ')[0] : user.email.split('@')[0];

  const todayStr = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  main.innerHTML = `
    <section class="user-hero">
      <div class="wrap">
        <div class="uh-grid">
          <div class="uh-main">
            <span class="badge">Personal Intelligence Briefing</span>
            <h1>Welcome back, ${esc(firstName)}</h1>
            <p class="uh-date">${todayStr} · Curated reporting and market intelligence across Africa.</p>
          </div>
          <div class="uh-stats">
            <div class="uh-stat-card">
              <div class="uh-stat-num">${monitors.length}</div>
              <div class="uh-stat-lbl">Active Monitors</div>
              <a href="/following" class="uh-stat-link">Manage ${icon('arrow-right')}</a>
            </div>
            <div class="uh-stat-card">
              <div class="uh-stat-num">${store.savedIds.size}</div>
              <div class="uh-stat-lbl">Saved Stories</div>
              <a href="/saved" class="uh-stat-link">View Vault ${icon('arrow-right')}</a>
            </div>
            <div class="uh-stat-card">
              <div class="uh-stat-num">54</div>
              <div class="uh-stat-lbl">Country Files</div>
              <a href="/countries" class="uh-stat-link">Explore ${icon('arrow-right')}</a>
            </div>
          </div>
        </div>

        <div class="uh-shortcuts">
          <span style="font-size:0.84rem;font-weight:600;color:var(--muted);margin-right:4px">Quick jumps:</span>
          <a href="/following" class="chip active">${icon('star')} Monitored Feed</a>
          <a href="/countries" class="chip">${icon('globe')} All Countries</a>
          <a href="/research" class="chip">${icon('book')} Deep Research</a>
          <a href="/news" class="chip">${icon('link')} Live News Wire</a>
        </div>
      </div>
    </section>

    <!-- Personalized Feed Section -->
    <section class="section" style="padding-top:44px;padding-bottom:56px">
      <div class="wrap">
        <div class="section-head">
          <div>
            <span class="eyebrow accent">Your Monitored Stream</span>
            <h2>Tailored to your interests</h2>
            <p>Stories from African newsrooms filtered to your followed countries, topics, and monitors.</p>
          </div>
          <a class="text-link" href="/following">Edit monitors ${icon('arrow-right')}</a>
        </div>

        ${monitors.length > 0 ? `
          <div class="feed-filter-bar">
            <div class="feed-tabs" data-feed-tabs>
              <button class="feed-tab active" type="button" data-tab="all">${icon('star')} All Monitored (${monitors.length})</button>
              ${monitors.slice(0, 6).map((m, idx) => `
                <button class="feed-tab" type="button" data-tab="${idx}">${esc(m.name)}</button>
              `).join('')}
            </div>
          </div>
          <div data-feed-list>${skeletonRows(4)}</div>
        ` : `
          <!-- Onboarding Curation Card if user has no monitors yet -->
          <div class="curate-card" data-curate-box>
            <h3>Personalize your daily briefing</h3>
            <p>Select the countries and industries you follow to instantly shape your StyleVault home screen.</p>
            
            <div class="curate-group">
              <span class="curate-group-lbl">Countries to follow</span>
              <div class="curate-chips" data-country-chips>
                ${POPULAR_COUNTRIES.map((c) => `
                  <button type="button" class="curate-chip" data-code="${c.code}" aria-pressed="false">
                    ${flag(c.code, 'flag', '')} ${esc(c.name)}
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="curate-group">
              <span class="curate-group-lbl">Key Sectors</span>
              <div class="curate-chips" data-topic-chips>
                ${POPULAR_TOPICS.map((t) => `
                  <button type="button" class="curate-chip" data-slug="${t.slug}" aria-pressed="false">
                    ${esc(t.name)}
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="curate-foot">
              <button type="button" class="btn btn-accent" data-save-curation>Save &amp; Curate My Feed</button>
              <span class="hint">You can change these anytime in your Following tab.</span>
            </div>
          </div>
        `}
      </div>
    </section>

    <!-- Top Stories Across the Continent -->
    <section class="section warm">
      <div class="wrap">
        <div class="section-head">
          <div>
            <span class="eyebrow">Continent-Wide News</span>
            <h2>Top developments across Africa today</h2>
            <p>Important reporting across all 54 African countries from verified independent publishers.</p>
          </div>
          <a class="text-link" href="/news">All news ${icon('arrow-right')}</a>
        </div>
        <div class="card-grid two" style="gap:0 48px" data-top-news>${skeletonRows(4)}</div>
      </div>
    </section>

    <!-- Interactive Continent Map Explorer -->
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

    <!-- Deep Research & Policy -->
    <section class="section warm">
      <div class="wrap">
        <div class="section-head">
          <div><span class="eyebrow accent">Research &amp; analysis</span><h2>Read deeper</h2>
            <p>Long-form work from think tanks, universities, survey organisations and public institutions across Africa.</p></div>
          <a class="text-link" href="/research">All research ${icon('arrow-right')}</a>
        </div>
        <div data-research>${skeletonCards(3)}</div>
      </div>
    </section>

    <!-- Featured Country File Spotlight -->
    <section class="section">
      <div class="wrap sample" data-sample></div>
    </section>
  `;

  // Initialize interactive map and featured country
  initMapAndPicker(main, navigate, countries);
  initSampleCountry(main, countries);
  initResearchCards(main);

  // Load continent-wide top news
  api.articles({ kind: 'news', limit: 6 }).then(({ items }) => {
    const box = $('[data-top-news]', main);
    if (box) box.innerHTML = `<div class="news-list">${items.slice(0, 3).map(newsRow).join('')}</div><div class="news-list">${items.slice(3, 6).map(newsRow).join('')}</div>`;
  }).catch(() => {});

  // Load Monitored Feed
  if (monitors.length > 0) {
    const feedBox = $('[data-feed-list]', main);
    const loadMonitorArticles = (monitorIndex) => {
      feedBox.innerHTML = skeletonRows(4);
      let queryObj = { limit: 8 };
      if (monitorIndex === 'all') {
        const allCountries = [...new Set(monitors.flatMap((m) => m.countries || []))];
        const allTopics = [...new Set(monitors.flatMap((m) => m.topics || []))];
        if (allCountries.length) queryObj.country = allCountries.slice(0, 5);
        if (allTopics.length) queryObj.topic = allTopics.slice(0, 3);
      } else {
        const m = monitors[Number(monitorIndex)];
        if (m) {
          if (m.countries?.length) queryObj.country = m.countries;
          if (m.topics?.length) queryObj.topic = m.topics;
          if (m.keywords) queryObj.q = m.keywords;
        }
      }

      api.articles(queryObj).then(({ items }) => {
        if (!items.length) {
          feedBox.innerHTML = `
            <div class="empty" style="padding:40px 20px">
              <span class="ic">${icon('star')}</span>
              <h3>No recent stories in this monitor</h3>
              <p>We haven't received stories matching this criteria in the last 7 days. Try adding more countries or topics.</p>
              <a class="btn btn-outline" href="/following">Adjust monitor</a>
            </div>`;
        } else {
          feedBox.innerHTML = `<div class="news-list">${items.map(newsRow).join('')}</div>`;
        }
      }).catch(() => {
        feedBox.innerHTML = `<p class="muted" style="padding:20px 0">Unable to load your monitored feed right now.</p>`;
      });
    };

    loadMonitorArticles('all');

    const tabs = $$('[data-tab]', main);
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        loadMonitorArticles(tab.dataset.tab);
      });
    });
  } else {
    // Handle Interactive Curation Card
    const countryChips = $$('[data-country-chips] .curate-chip', main);
    countryChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const on = chip.getAttribute('aria-pressed') !== 'true';
        chip.setAttribute('aria-pressed', on);
        chip.classList.toggle('active', on);
      });
    });

    const topicChips = $$('[data-topic-chips] .curate-chip', main);
    topicChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const on = chip.getAttribute('aria-pressed') !== 'true';
        chip.setAttribute('aria-pressed', on);
        chip.classList.toggle('active', on);
      });
    });

    const saveBtn = $('[data-save-curation]', main);
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const selectedCountries = $$('[data-country-chips] .curate-chip.active', main).map((c) => c.dataset.code);
        const selectedTopics = $$('[data-topic-chips] .curate-chip.active', main).map((t) => t.dataset.slug);

        if (!selectedCountries.length && !selectedTopics.length) {
          alert('Please choose at least one country or sector to follow.');
          return;
        }

        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving preferences…';

        const nameParts = [
          ...selectedCountries.slice(0, 2).map((c) => store.countryByCode.get(c)?.name),
          ...selectedTopics.slice(0, 2).map((t) => store.topicBySlug.get(t)?.name),
        ].filter(Boolean);

        try {
          await store.saveMonitor({
            name: nameParts.join(' · ') || 'My Intelligence Feed',
            countries: selectedCountries,
            topics: selectedTopics,
            keywords: '',
          });
          // Re-render home to show active personalized feed
          renderUserHome(main, { setTitle, navigate });
        } catch (err) {
          alert(err.message);
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save & Curate My Feed';
        }
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGNED-OUT GUEST HOME VIEW (Supports in-browser personalization without signup)
// ─────────────────────────────────────────────────────────────────────────────
async function renderGuestHome(main, { setTitle, navigate }) {
  setTitle('');
  main.style.paddingBottom = '0';
  const { stats, countries, topics } = store.meta;
  const localMonitors = store.monitors || [];

  // Active filter state for the guest
  let activeCountry = null;
  let activeTopic = null;
  let activeMonitorIndex = localMonitors.length > 0 ? 0 : null;

  main.innerHTML = `
    <!-- Airy Editorial Paper Hero -->
    <section class="hero">
      <div class="wrap"><div class="hero-inner">
        <span class="badge">Pan-African Intelligence · 54 Countries</span>
        <h1>Understand Africa, <span>one country at a time.</span></h1>
        <p>Country files, economic indicators and verified reporting on all 54 African countries — cited, dated and linked directly to original publishers.</p>
        <form class="hero-search" role="search" data-search>
          ${icon('search')}
          <input type="search" name="q" placeholder="Search a country, industry or question…" aria-label="Search Style Vault" list="country-list" autocomplete="off">
          <datalist id="country-list">${countries.map((c) => `<option value="${esc(c.name)}">`).join('')}</datalist>
          <button class="btn btn-plum" type="submit">Search</button>
        </form>
        <div class="hero-regions"><span>Start with a region:</span>
          ${Object.entries(REGION_NAMES).map(([k, v]) => `<a href="/countries?region=${k}">${v.replace(' Africa', '')}</a>`).join('')}
        </div>
      </div></div>
    </section>

    <!-- Trust & Open Source Methods Strip -->
    <section class="trust-strip">
      <div class="wrap">
        <div class="trust-item">${icon('map')}<div><strong>54 country files</strong><span>Every African country, from Algeria to Zimbabwe</span></div></div>
        <div class="trust-item">${icon('chart')}<div><strong>Cited indicators</strong><span>World Bank data with year and source on every figure</span></div></div>
        <div class="trust-item">${icon('building')}<div><strong>${nf(stats.sources)} sources</strong><span>Newsrooms, think tanks and public institutions</span></div></div>
        <div class="trust-item">${icon('link')}<div><strong>Always linked</strong><span>Every story leads to the original publisher</span></div></div>
      </div>
    </section>

    <!-- In-Browser Personalized Live News Section -->
    <section class="section" style="padding-top:48px;padding-bottom:56px">
      <div class="wrap">
        <div class="section-head">
          <div>
            <span class="eyebrow accent">Live Pan-African News</span>
            <h2>African reporting, filtered to your markets</h2>
            <p>Follow countries or sectors below to immediately shape your news stream. No account or sign-in needed.</p>
          </div>
          <a class="text-link" href="/news">Full news wire ${icon('arrow-right')}</a>
        </div>

        <!-- In-Browser Personalization Bar -->
        <div class="personalize-bar">
          <div class="personalize-head">
            <h3>${icon('star')} Personalize your feed</h3>
            <span class="hint">Saved in this browser · Optional cloud sync with a free account</span>
          </div>

          <div class="personalize-chips" data-filter-chips>
            <button type="button" class="personalize-chip ${activeMonitorIndex === null && !activeCountry && !activeTopic ? 'active' : ''}" data-action="all">
              ${icon('globe')} All Top Stories
            </button>

            ${localMonitors.length > 0 ? `
              ${localMonitors.map((m, idx) => `
                <button type="button" class="personalize-chip ${activeMonitorIndex === idx ? 'active' : ''}" data-action="monitor" data-idx="${idx}">
                  ${icon('star')} ${esc(m.name)}
                </button>
              `).join('')}
            ` : ''}

            <!-- Quick Popular Hubs -->
            <button type="button" class="personalize-chip ${activeCountry === 'NG' ? 'active' : ''}" data-action="country" data-val="NG">
              ${flag('NG', 'flag', '')} Nigeria
            </button>
            <button type="button" class="personalize-chip ${activeCountry === 'KE' ? 'active' : ''}" data-action="country" data-val="KE">
              ${flag('KE', 'flag', '')} Kenya
            </button>
            <button type="button" class="personalize-chip ${activeCountry === 'ZA' ? 'active' : ''}" data-action="country" data-val="ZA">
              ${flag('ZA', 'flag', '')} South Africa
            </button>
            <button type="button" class="personalize-chip ${activeCountry === 'GH' ? 'active' : ''}" data-action="country" data-val="GH">
              ${flag('GH', 'flag', '')} Ghana
            </button>
            <button type="button" class="personalize-chip ${activeCountry === 'EG' ? 'active' : ''}" data-action="country" data-val="EG">
              ${flag('EG', 'flag', '')} Egypt
            </button>

            <!-- Quick Popular Sectors -->
            <button type="button" class="personalize-chip ${activeTopic === 'business' ? 'active' : ''}" data-action="topic" data-val="business">
              💼 Business
            </button>
            <button type="button" class="personalize-chip ${activeTopic === 'trade' ? 'active' : ''}" data-action="topic" data-val="trade">
              🚢 AfCFTA &amp; Trade
            </button>
            <button type="button" class="personalize-chip ${activeTopic === 'technology' ? 'active' : ''}" data-action="topic" data-val="technology">
              💡 Technology
            </button>
            <button type="button" class="personalize-chip ${activeTopic === 'energy' ? 'active' : ''}" data-action="topic" data-val="energy">
              ⚡ Energy
            </button>
            <button type="button" class="personalize-chip ${activeTopic === 'agriculture' ? 'active' : ''}" data-action="topic" data-val="agriculture">
              🌱 Agriculture
            </button>

            <button type="button" class="personalize-chip add-more" data-action="toggle-drawer">
              ${icon('plus')} More Countries &amp; Sectors
            </button>
          </div>

          <!-- Expandable Drawer for All 54 Countries & Sectors -->
          <div class="filter-drawer" data-drawer>
            <div class="filter-drawer-grid">
              <div class="filter-drawer-col">
                <h4>All 54 African Countries</h4>
                <div class="filter-drawer-chips">
                  ${countries.map((c) => `
                    <button type="button" class="personalize-chip ${activeCountry === c.code ? 'active' : ''}" data-action="country" data-val="${c.code}">
                      ${flag(c.code, 'flag', '')} ${esc(c.name)}
                    </button>
                  `).join('')}
                </div>
              </div>
              <div class="filter-drawer-col">
                <h4>All 13 Sectors &amp; Topics</h4>
                <div class="filter-drawer-chips">
                  ${topics.map((t) => `
                    <button type="button" class="personalize-chip ${activeTopic === t.slug ? 'active' : ''}" data-action="topic" data-val="${t.slug}">
                      ${esc(t.name)}
                    </button>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

          <div class="personalize-status" data-filter-status>
            <span>Showing: <strong>Top Stories Across Africa</strong></span>
            <span><a href="/signup">Sign in</a> to synchronize preferences across your phone and laptop</span>
          </div>
        </div>

        <!-- News Stream Container -->
        <div data-news-stream>${skeletonRows(4)}</div>
      </div>
    </section>

    <!-- Interactive Continent Explorer -->
    <section class="section warm">
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

    <!-- Deep Research & Analysis -->
    <section class="section">
      <div class="wrap">
        <div class="section-head">
          <div><span class="eyebrow accent">Research &amp; analysis</span><h2>Read deeper</h2>
            <p>Long-form work from think tanks, universities, survey organisations and public institutions across and about Africa.</p></div>
          <a class="text-link" href="/research">All research ${icon('arrow-right')}</a>
        </div>
        <div data-research>${skeletonCards(3)}</div>
      </div>
    </section>

    <!-- Inside a Country File Spotlight -->
    <section class="section warm">
      <div class="wrap sample" data-sample></div>
    </section>

    <!-- Guest Personalization Invitation Banner (Gentle, Not Wall) -->
    <section class="section tight">
      <div class="wrap">
        <div class="guest-invite">
          <div>
            <span class="eyebrow accent">Your Personal Intelligence Feed</span>
            <h3>Follow countries and sectors across all your devices</h3>
            <p>StyleVault remembers your preferences in this browser automatically. Create a free account anytime to sync your followed markets and saved stories between your phone, tablet, and desktop.</p>
          </div>
          <div class="guest-invite-actions">
            <a class="btn btn-plum" href="/signup">Create free account</a>
            <a class="btn btn-outline" href="/login">Sign in</a>
          </div>
        </div>
      </div>
    </section>

    <!-- Trust Pillars -->
    <section class="section">
      <div class="wrap">
        <div class="section-head"><div><span class="eyebrow accent">Why you can trust it</span><h2>Built to be cited, not just read</h2></div></div>
        <div class="pillars">
          <div class="pillar"><span class="ic">${icon('chart')}</span><h3>Cited data</h3><p>Country indicators come from the World Bank’s World Development Indicators. Each figure shows its year and links to the source table.</p></div>
          <div class="pillar"><span class="ic">${icon('link')}</span><h3>Original sources</h3><p>We show a headline, a short teaser and the date, then send you to the publisher. Nothing is rewritten or summarised by AI.</p></div>
          <div class="pillar"><span class="ic">${icon('shield')}</span><h3>Open methods</h3><p>Every source is listed with how often we check it and whether it’s working. Our rules for sorting stories by country are public.</p>
            <a class="text-link" href="/sources">Sources &amp; methods ${icon('arrow-right')}</a></div>
        </div>
      </div>
    </section>

    <!-- Ria's Colony Band -->
    <section class="colony-band">
      <div class="wrap">
        <div><h2>Going beyond reading about a country?</h2>
          <p>Ria’s Colony helps people travel between African countries and do business across their markets, with local guides, introductions and market support.</p></div>
        <div class="btns">
          <a class="btn btn-white" href="https://riascolony.org/products" target="_blank" rel="noopener">Explore Ria’s Colony ${icon('arrow-up-right')}</a>
          <a class="btn btn-outline-light" href="https://riascolony.org/resources" target="_blank" rel="noopener">Country guides</a>
        </div>
      </div>
    </section>
  `;

  // Search form handler
  $('[data-search]', main).addEventListener('submit', (e) => {
    e.preventDefault();
    const q = e.target.q.value.trim();
    const country = countries.find((c) => c.name.toLowerCase() === q.toLowerCase());
    navigate(country ? `/country/${country.slug}` : `/search?q=${encodeURIComponent(q)}`);
  });

  // Init Interactive Map, Country Spotlight, and Research
  initMapAndPicker(main, navigate, countries);
  initSampleCountry(main, countries);
  initResearchCards(main);

  // ── Live Stream & Filter Manager ──────────────────────────────────────────
  const newsStreamBox = $('[data-news-stream]', main);
  const statusBox = $('[data-filter-status]', main);
  const drawer = $('[data-drawer]', main);

  function updateStatus(title, isFiltered = false) {
    if (!statusBox) return;
    statusBox.innerHTML = `
      <span>Showing: <strong>${esc(title)}</strong></span>
      <span>
        ${isFiltered ? `<button type="button" class="btn btn-sm btn-outline" data-reset-btn style="margin-right:8px;height:30px;padding:0 12px;font-size:0.78rem">Show all stories</button>` : ''}
        <a href="/signup">Sign in</a> to sync across devices
      </span>
    `;
    const reset = $('[data-reset-btn]', statusBox);
    if (reset) {
      reset.addEventListener('click', () => {
        activeCountry = null;
        activeTopic = null;
        activeMonitorIndex = null;
        $$('.personalize-chip', main).forEach((c) => c.classList.toggle('active', c.dataset.action === 'all'));
        loadNews();
      });
    }
  }

  function loadNews() {
    newsStreamBox.innerHTML = skeletonRows(4);

    let queryObj = { limit: 8 };
    let statusLabel = 'Top Stories Across Africa';
    let isFiltered = false;

    if (activeMonitorIndex !== null && localMonitors[activeMonitorIndex]) {
      const m = localMonitors[activeMonitorIndex];
      statusLabel = `Your Saved Feed: ${m.name}`;
      isFiltered = true;
      if (m.countries?.length) queryObj.country = m.countries;
      if (m.topics?.length) queryObj.topic = m.topics;
      if (m.keywords) queryObj.q = m.keywords;
    } else if (activeCountry || activeTopic) {
      isFiltered = true;
      const parts = [];
      if (activeCountry) {
        queryObj.country = activeCountry;
        parts.push(store.countryByCode.get(activeCountry)?.name || activeCountry);
      }
      if (activeTopic) {
        queryObj.topic = activeTopic;
        parts.push(store.topicBySlug.get(activeTopic)?.name || activeTopic);
      }
      statusLabel = parts.join(' · ');
    }

    updateStatus(statusLabel, isFiltered);

    api.articles(queryObj).then(({ items }) => {
      if (!items.length) {
        newsStreamBox.innerHTML = `
          <div class="empty" style="padding:40px 20px">
            <span class="ic">${icon('search')}</span>
            <h3>No recent stories found for this filter</h3>
            <p>We haven't received stories matching this criteria in the last 7 days. Try choosing another country or topic.</p>
            <button type="button" class="btn btn-outline" data-reset-empty>Show all top stories</button>
          </div>`;
        const reset = $('[data-reset-empty]', newsStreamBox);
        if (reset) {
          reset.addEventListener('click', () => {
            activeCountry = null;
            activeTopic = null;
            activeMonitorIndex = null;
            $$('.personalize-chip', main).forEach((c) => c.classList.toggle('active', c.dataset.action === 'all'));
            loadNews();
          });
        }
      } else {
        const half = Math.ceil(items.length / 2);
        newsStreamBox.innerHTML = `
          <div class="card-grid two" style="gap:0 48px">
            <div class="news-list">${items.slice(0, half).map(newsRow).join('')}</div>
            <div class="news-list">${items.slice(half).map(newsRow).join('')}</div>
          </div>`;
      }
    }).catch(() => {
      newsStreamBox.innerHTML = `<p class="muted" style="padding:24px 0">Unable to load stories at this time.</p>`;
    });
  }

  // Bind filter chips
  const chipContainer = $('[data-filter-chips]', main);
  if (chipContainer) {
    chipContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.personalize-chip');
      if (!chip) return;

      const action = chip.dataset.action;
      if (action === 'toggle-drawer') {
        drawer.classList.toggle('open');
        chip.classList.toggle('active', drawer.classList.contains('open'));
        return;
      }

      $$('.personalize-chip', main).forEach((c) => {
        if (c.dataset.action !== 'toggle-drawer') c.classList.remove('active');
      });
      chip.classList.add('active');

      if (action === 'all') {
        activeCountry = null;
        activeTopic = null;
        activeMonitorIndex = null;
      } else if (action === 'monitor') {
        activeMonitorIndex = Number(chip.dataset.idx);
        activeCountry = null;
        activeTopic = null;
      } else if (action === 'country') {
        activeCountry = chip.dataset.val;
        activeTopic = null;
        activeMonitorIndex = null;
      } else if (action === 'topic') {
        activeTopic = chip.dataset.val;
        activeCountry = null;
        activeMonitorIndex = null;
      }

      loadNews();
    });
  }

  // Drawer chips listener
  if (drawer) {
    drawer.addEventListener('click', (e) => {
      const chip = e.target.closest('.personalize-chip');
      if (!chip) return;

      const action = chip.dataset.action;
      $$('.personalize-chip', main).forEach((c) => {
        if (c.dataset.action !== 'toggle-drawer') c.classList.remove('active');
      });
      chip.classList.add('active');

      if (action === 'country') {
        activeCountry = chip.dataset.val;
        activeTopic = null;
        activeMonitorIndex = null;
      } else if (action === 'topic') {
        activeTopic = chip.dataset.val;
        activeCountry = null;
        activeMonitorIndex = null;
      }
      loadNews();
    });
  }

  // Initial load
  loadNews();
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
