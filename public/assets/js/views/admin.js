import { api } from '../api.js';
import { $, $$, esc, flag, icon, nf } from '../lib.js';
import { store } from '../store.js';
import { toast } from '../ui.js';

function formatTimestamp(unixSec) {
  if (!unixSec) return 'Never';
  const d = new Date(unixSec * 1000);
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function adminView(main, { setTitle, navigate }) {
  setTitle('Admin Analytics & Data');

  let activeTab = 'overview';
  let adminKey = localStorage.getItem('sv_admin_key') || '';
  let metrics = null;
  let loading = true;
  let errorMsg = null;
  let isIngesting = false;

  // News publishing state (long-form HTML news, summary teaser, scope targeting)
  let newsTitle = '';
  let newsSummary = '';
  let newsContentHtml = '';
  let newsEditorTab = 'visual'; // 'visual' | 'html' | 'preview'
  let newsScope = 'everyone'; // 'everyone' | 'targeted'
  let newsSource = 'StyleVault Editorial';
  let newsUrl = '';
  let newsImageUrl = '';
  let newsKind = 'news';
  let newsCountries = new Set(['NG', 'GH', 'KE', 'ZA', 'EG']);
  let newsTopics = new Set(['business', 'technology', 'politics']);
  let isPublishing = false;

  // Ad manager state (riascolony style formats, creatives, page targeting)
  let adsList = [];
  let adsLoading = false;
  let adType = 'banner'; // 'banner' | 'native' | 'interstitial'
  let adSourceType = 'image'; // 'image' | 'html'
  let adTitle = '';
  let adSponsor = '';
  let adBody = '';
  let adLinkUrl = '';
  let adCtaText = 'Learn More';
  let adImageUrl = '';
  let adHtmlCode = '';
  let adTargetPagesMode = 'all'; // 'all' | 'custom'
  let adSelectedPages = new Set(['/']);
  let adCustomPagesInput = '';
  let adActive = true;
  let isSavingAd = false;

  const loadAds = async () => {
    adsLoading = true;
    render();
    try {
      const res = await api.adminAds(adminKey);
      adsList = res.ads || [];
      adsLoading = false;
    } catch (err) {
      adsLoading = false;
      toast('Failed to load ads: ' + err.message, 'error');
    }
    render();
  };

  const loadData = async () => {
    loading = true;
    errorMsg = null;
    render();
    try {
      metrics = await api.adminMetrics(adminKey);
      loading = false;
      errorMsg = null;
    } catch (err) {
      loading = false;
      errorMsg = err.message || 'Failed to load admin analytics';
    }
    render();
  };

  const NAV = [
    { id: 'overview', label: 'Overview', icon: 'chart' },
    { id: 'users', label: 'Readers', icon: 'user', count: () => metrics?.users.total },
    { id: 'sources', label: 'Newsrooms', icon: 'globe', count: () => metrics?.collector.stats?.total },
    { id: 'distribution', label: 'Popular follows', icon: 'star' },
    { id: 'publish', label: 'Publish', icon: 'edit' },
    { id: 'ads', label: 'Ads', icon: 'layers' },
  ];
  const KIND_LABEL = { news: 'News report', analysis: 'Analysis', research: 'Research', official: 'Official' };

  const badge = (text, tone = 'muted') => `<span class="adm-badge is-${tone}">${text}</span>`;
  const secHead = (title, sub, action = '') => `
    <div class="adm-sec-head">
      <div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>
      ${action}
    </div>`;
  const stat = (label, value, note = '', tone = '') => `
    <div class="adm-stat">
      <span class="adm-stat-lbl">${label}</span>
      <strong class="adm-stat-val">${value}</strong>
      ${note ? `<span class="adm-stat-note ${tone ? `is-${tone}` : ''}">${note}</span>` : ''}
    </div>`;
  const countryCell = (code) => (code ? `<span class="adm-country">${flag(code, 'flag', '')}${esc(store.countryByCode.get(code)?.name || code)}</span>` : '<span class="adm-muted">Pan-African</span>');

  const render = () => {
    const lastRun = metrics?.collector?.recentRuns?.[0];
    main.innerHTML = `
      <div class="adm">
        <header class="adm-top">
          <div class="wrap adm-top-inner">
            <div class="adm-title">
              <h1>Admin</h1>
              <span class="adm-status"><span class="adm-dot ${errorMsg ? 'is-off' : ''}"></span>${errorMsg ? 'Not connected' : lastRun ? `Live · last collection ${esc(formatTimestamp(lastRun.started_at))}` : 'Live'}</span>
            </div>
            <div class="adm-top-actions">
              <button type="button" class="btn btn-plum btn-sm" data-run-collect aria-label="Run collector now" ${isIngesting || errorMsg ? 'disabled' : ''}>${icon('radar')}<span>${isIngesting ? 'Collecting…' : 'Run collector'}</span></button>
              <button type="button" class="adm-icon-btn" data-refresh-metrics title="Refresh data" aria-label="Refresh data">${icon('clock')}</button>
              <button type="button" class="adm-icon-btn ${adminKey ? 'is-set' : ''}" data-toggle-key title="${adminKey ? 'Admin key saved' : 'Add admin key'}" aria-label="Admin key">${icon('lock')}</button>
            </div>
          </div>
        </header>

        <div class="wrap adm-shell">
          ${!loading && !errorMsg && metrics ? `
            <nav class="adm-nav" aria-label="Admin sections">
              ${NAV.map((n) => {
                const count = n.count?.();
                return `<button type="button" class="adm-nav-item ${activeTab === n.id ? 'is-active' : ''}" data-tab="${n.id}" ${activeTab === n.id ? 'aria-current="page"' : ''}>
                  ${icon(n.icon)}<span>${n.label}</span>${count != null ? `<em>${nf(count)}</em>` : ''}
                </button>`;
              }).join('')}
            </nav>` : ''}

          <div class="adm-main">
            ${renderKeyModal()}
            ${loading ? `
              <div class="adm-state"><span class="adm-dot"></span><p>Loading platform data…</p></div>
            ` : errorMsg ? `
              <div class="adm-state is-error">
                <span class="adm-state-icon">${icon('lock')}</span>
                <h2>Admin access required</h2>
                <p>${esc(errorMsg)}</p>
                <div class="adm-state-actions">
                  ${!store.user ? '<a class="btn btn-plum btn-sm" href="/login?next=/admin">Sign in</a>' : ''}
                  <button type="button" class="btn ${store.user ? 'btn-plum' : 'btn-outline'} btn-sm" data-toggle-key>Enter admin key</button>
                </div>
              </div>
            ` : renderMetricsContent()}
          </div>
        </div>
      </div>`;
  };

  function renderKeyModal() {
    return `
      <div class="adm-key" data-key-bar hidden>
        <label for="adm-key-input">Admin key</label>
        <div class="adm-key-row">
          <input type="password" id="adm-key-input" class="input" placeholder="Paste ADMIN_TOKEN" value="${esc(adminKey)}" autocomplete="off">
          <button type="button" class="btn btn-plum btn-sm" data-save-key>Save</button>
          <button type="button" class="btn btn-outline btn-sm" data-clear-key>Clear</button>
        </div>
        <span class="adm-hint">Only needed if you’re not signed in with an admin account. Stored in this browser.</span>
      </div>`;
  }

  function renderMetricsContent() {
    if (!metrics) return '';
    if (activeTab === 'publish') return renderPublishTab();
    if (activeTab === 'ads') return renderAdsTab();
    if (activeTab === 'users') return renderUsersTab();
    if (activeTab === 'sources') return renderSourcesTab();
    if (activeTab === 'distribution') return renderDistributionTab();
    return renderOverviewTab();
  }

  function renderOverviewTab() {
    const { users, content, collector } = metrics;
    const failing = collector.failingSources || [];
    const runs = collector.recentRuns || [];
    const s = collector.stats || {};

    return `
      ${secHead('Overview', 'Readers, content and newsroom health at a glance.')}
      <div class="adm-stats">
        ${stat('Readers', nf(users.total), `+${nf(users.new24h)} today · +${nf(users.new7d)} this week`, users.new24h ? 'up' : '')}
        ${stat('Articles', nf(content.totalArticles), `+${nf(content.articles24h)} in 24h · +${nf(content.articles7d)} in 7d`, content.articles24h ? 'up' : '')}
        ${stat('Newsrooms', `${nf(s.active || 0)}<small> / ${nf(s.total || 0)}</small>`, `${nf(s.healthy || 0)} healthy${s.failing ? ` · ${nf(s.failing)} with issues` : ''}`, s.failing ? 'warn' : 'up')}
        ${stat('Engagement', nf(content.totalMonitors), `follows · ${nf(content.totalSaved)} saved stories`)}
      </div>

      <div class="adm-stack">
        <section class="adm-card">
          ${secHead('Collector runs', 'Scheduled checks run automatically; you can also run one now.',
            `<button type="button" class="btn btn-outline btn-sm" data-run-collect ${isIngesting ? 'disabled' : ''}>${isIngesting ? 'Running…' : 'Run now'}</button>`)}
          ${runs.length ? `
            <div class="adm-table-wrap">
              <table class="adm-table">
                <thead><tr><th>Run</th><th>When</th><th>Trigger</th><th class="num">Checked</th><th class="num">Added</th><th class="num">Errors</th></tr></thead>
                <tbody>
                  ${runs.map((r) => `
                    <tr>
                      <td class="adm-strong">#${r.id}</td>
                      <td class="adm-nowrap">${formatTimestamp(r.started_at)}</td>
                      <td>${badge(esc(r.trigger), r.trigger === 'cron' ? 'muted' : 'plum')}</td>
                      <td class="num">${nf(r.sources_checked)}</td>
                      <td class="num is-up">+${nf(r.articles_added)}</td>
                      <td class="num ${r.errors ? 'is-bad' : 'adm-muted'}">${r.errors}</td>
                    </tr>`).join('')}
                </tbody>
              </table>
            </div>` : '<p class="adm-empty">No collection runs recorded yet.</p>'}
        </section>

        <section class="adm-card">
          ${secHead(`Needs attention${failing.length ? ` <em class="adm-count is-bad">${failing.length}</em>` : ''}`, 'Newsrooms whose feeds failed on recent checks.')}
          ${failing.length ? `
            <ul class="adm-list">
              ${failing.map((f) => `
                <li>
                  <div class="adm-list-main">
                    <strong>${esc(f.name)}</strong>
                    <span>${countryCell(f.country_code)}</span>
                  </div>
                  <div class="adm-list-side">
                    ${badge(`${f.consecutive_failures} ${f.consecutive_failures === 1 ? 'failure' : 'failures'}`, 'bad')}
                    <span class="adm-err" title="${esc(f.last_error || '')}">${esc(f.last_error || 'No response')}</span>
                  </div>
                </li>`).join('')}
            </ul>` : `
            <div class="adm-ok">${icon('check')}<div><strong>All feeds are healthy</strong><span>No failures on recent checks.</span></div></div>`}
        </section>
      </div>`;
  }

  function renderUsersTab() {
    const { users } = metrics;
    const list = users.recent || [];
    return `
      ${secHead('Readers', `${nf(users.total)} registered · the most recent sign-ups are listed below.`)}
      <section class="adm-card is-flush">
        ${list.length ? `
          <div class="adm-table-wrap">
            <table class="adm-table">
              <thead><tr><th>Reader</th><th>Email</th><th>Joined</th><th class="num">Follows</th><th class="num">Saved</th></tr></thead>
              <tbody>
                ${list.map((u) => `
                  <tr>
                    <td><span class="adm-person"><span class="adm-avatar">${esc((u.name || u.email).slice(0, 2).toUpperCase())}</span><span class="adm-strong">${esc(u.name || 'Unnamed reader')}</span></span></td>
                    <td class="adm-muted">${esc(u.email)}</td>
                    <td class="adm-nowrap">${formatTimestamp(u.created_at)}</td>
                    <td class="num">${u.monitor_count ? nf(u.monitor_count) : '<span class="adm-muted">0</span>'}</td>
                    <td class="num">${u.saved_count ? nf(u.saved_count) : '<span class="adm-muted">0</span>'}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>` : '<p class="adm-empty">No registered readers yet.</p>'}
      </section>`;
  }

  function renderSourcesTab() {
    const { content } = metrics;
    const top = content.topSources || [];
    return `
      ${secHead('Newsrooms', 'Top contributing publishers by number of stories collected.',
        `<a class="btn btn-outline btn-sm" href="/sources" target="_blank" rel="noopener">Public list ${icon('arrow-up-right')}</a>`)}
      <section class="adm-card is-flush">
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead><tr><th>Publication</th><th>Country</th><th class="num">Stories</th><th>Status</th><th>Last success</th></tr></thead>
            <tbody>
              ${top.map((s) => `
                <tr>
                  <td class="adm-strong">${esc(s.name)}</td>
                  <td>${countryCell(s.country_code)}</td>
                  <td class="num">${nf(s.total_articles)}</td>
                  <td>${s.consecutive_failures ? badge(`${s.consecutive_failures} failing`, 'bad') : badge('Healthy', 'ok')}</td>
                  <td class="adm-nowrap adm-muted">${formatTimestamp(s.last_success_at)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </section>`;
  }

  function renderDistributionTab() {
    const { content } = metrics;
    const countries = content.topCountries || [];
    const topics = content.topTopics || [];
    const ranked = (rows, label) => {
      if (!rows.length) return '<p class="adm-empty">Nothing followed yet.</p>';
      const max = Math.max(...rows.map((r) => r.count), 1);
      return `<ol class="adm-rank">${rows.map((r, i) => `
        <li>
          <span class="adm-rank-n">${i + 1}</span>
          <span class="adm-rank-name">${label(r)}</span>
          <span class="adm-rank-bar"><i style="width:${Math.max(6, (r.count / max) * 100)}%"></i></span>
          <span class="adm-rank-v">${nf(r.count)}</span>
        </li>`).join('')}</ol>`;
    };
    return `
      ${secHead('Popular follows', 'What readers choose to follow, by number of readers.')}
      <div class="adm-grid">
        <section class="adm-card">
          ${secHead('Countries', '')}
          ${ranked(countries, (c) => `${flag(c.code, 'flag', '')}${esc(store.countryByCode.get(c.code)?.name || c.code)}`)}
        </section>
        <section class="adm-card">
          ${secHead('Topics', '')}
          ${ranked(topics, (t) => esc(store.topicBySlug.get(t.slug)?.name || t.slug))}
        </section>
      </div>`;
  }

  function imageField(url, { removeAttr, fileAttr, urlAttr }) {
    return `
      <div class="adm-image">
        ${url ? `
          <img src="${esc(url)}" alt="" class="adm-image-thumb">
          <button type="button" class="btn btn-outline btn-sm" ${removeAttr}>Remove</button>
        ` : `
          <label class="adm-file">${icon('plus')}<span>Upload image</span><input type="file" accept="image/*" ${fileAttr}></label>
          <span class="adm-hint">or paste a link</span>
        `}
        <input type="url" class="input" ${urlAttr} placeholder="https://…" value="${esc(url.startsWith('data:') ? '' : url)}">
      </div>`;
  }

  function renderPublishTab() {
    // Selected countries first, so you can see what is tagged without scrolling.
    const allCountries = [...(store.meta.countries || [])].sort((x, y) => Number(newsCountries.has(y.code)) - Number(newsCountries.has(x.code)));
    const allTopics = store.meta.topics || [];
    const REGIONS = ['North', 'West', 'Central', 'East', 'Southern'];

    return `
      ${secHead('Publish a story', 'Write and publish news, analysis or official releases on Style Vault.')}
      <div class="adm-compose">
        <form class="adm-card adm-form" data-publish-form>
          <div class="adm-field is-full">
            <label>Who sees it</label>
            <div class="adm-scope-selector">
              <button type="button" class="adm-scope-btn ${newsScope === 'everyone' ? 'is-active' : ''}" data-set-scope="everyone">
                <span class="adm-scope-ico">${icon('globe')}</span><span class="adm-scope-text"><strong>Everyone</strong><span>Every reader, on every feed</span></span>
              </button>
              <button type="button" class="adm-scope-btn ${newsScope === 'targeted' ? 'is-active' : ''}" data-set-scope="targeted">
                <span class="adm-scope-ico">${icon('sliders')}</span><span class="adm-scope-text"><strong>Targeted</strong><span>Pick regions, countries or topics</span></span>
              </button>
            </div>
          </div>

          ${newsScope === 'targeted' ? `
            <div class="adm-field is-full">
              <label>Regions <span class="adm-opt">selects every country in the region</span></label>
              <div class="adm-region-pills">
                ${REGIONS.map((r) => {
                  const regCountries = (store.meta.countries || []).filter((c) => c.region === r);
                  const isAllOn = regCountries.length > 0 && regCountries.every((c) => newsCountries.has(c.code));
                  return `<button type="button" class="adm-region-btn ${isAllOn ? 'is-active' : ''}" data-toggle-region="${r}">${r} Africa (${regCountries.length})</button>`;
                }).join('')}
              </div>
            </div>

            <div class="adm-field is-full">
              <label>Countries <span class="adm-opt" data-country-count>${newsCountries.size} selected</span></label>
              <div class="adm-picker">
                <input class="input adm-picker-filter" type="search" placeholder="Filter countries" data-picker-filter aria-label="Filter countries">
                <div class="adm-picker-list" data-picker-list>
                  ${allCountries.map((c) => `
                    <button type="button" class="adm-pick ${newsCountries.has(c.code) ? 'is-on' : ''}" data-toggle-country="${c.code}" data-name="${esc(c.name.toLowerCase())}" aria-pressed="${newsCountries.has(c.code)}">${flag(c.code, 'flag', '')}${esc(c.name)}</button>`).join('')}
                </div>
              </div>
            </div>

            <div class="adm-field is-full">
              <label>Topics <span class="adm-opt" data-topic-count>${newsTopics.size} selected</span></label>
              <div class="adm-picks">
                ${allTopics.map((t) => `
                  <button type="button" class="adm-pick ${newsTopics.has(t.slug) ? 'is-on' : ''}" data-toggle-topic="${t.slug}" aria-pressed="${newsTopics.has(t.slug)}">${esc(t.name)}</button>`).join('')}
              </div>
            </div>
          ` : `
            <div class="adm-field is-full">
              <p class="adm-note">${icon('globe')}<span>This story will appear for every reader, in all country and topic feeds.</span></p>
            </div>
          `}

          <div class="adm-field is-full">
            <label for="adm-news-title">Headline <span class="adm-req">required</span></label>
            <input class="input" type="text" id="adm-news-title" data-input-news-title placeholder="e.g. AfCFTA launches a pan-African payments system" value="${esc(newsTitle)}" required>
          </div>

          <div class="adm-field is-full">
            <label for="adm-news-summary">Summary <span class="adm-req">required</span> <span class="adm-opt">shown on feed cards</span></label>
            <textarea class="input" id="adm-news-summary" data-input-news-summary rows="2" placeholder="Two or three sentences readers see on their home and news feeds" required>${esc(newsSummary)}</textarea>
          </div>

          <div class="adm-field is-full">
            <label>Story <span class="adm-opt">the full article readers open from the feed</span></label>
            <div class="adm-editor-box">
              <div class="adm-editor-top">
                <div class="adm-editor-toolbar">
                  <button type="button" class="adm-toolbar-btn" data-edit-cmd="bold" title="Bold"><b>B</b></button>
                  <button type="button" class="adm-toolbar-btn" data-edit-cmd="italic" title="Italic"><i>I</i></button>
                  <button type="button" class="adm-toolbar-btn" data-edit-cmd="underline" title="Underline"><u>U</u></button>
                  <span class="adm-toolbar-sep"></span>
                  <button type="button" class="adm-toolbar-btn" data-edit-block="h2" title="Section Heading (H2)">H2</button>
                  <button type="button" class="adm-toolbar-btn" data-edit-block="h3" title="Subheading (H3)">H3</button>
                  <button type="button" class="adm-toolbar-btn" data-edit-block="p" title="Paragraph">¶</button>
                  <button type="button" class="adm-toolbar-btn" data-edit-block="blockquote" title="Quote / Callout">“ ”</button>
                  <span class="adm-toolbar-sep"></span>
                  <button type="button" class="adm-toolbar-btn" data-edit-cmd="insertUnorderedList" title="Bullet list">• List</button>
                  <button type="button" class="adm-toolbar-btn" data-edit-cmd="insertOrderedList" title="Numbered List">1. List</button>
                  <button type="button" class="adm-toolbar-btn" data-edit-link title="Insert Link">Link</button>
                  <button type="button" class="adm-toolbar-btn" data-edit-img title="Insert Image">Image</button>
                  <button type="button" class="adm-toolbar-btn" data-edit-cmd="insertHorizontalRule" title="Divider Line">—</button>
                </div>
                <div class="adm-editor-tabs">
                  <button type="button" class="adm-editor-tab-btn ${newsEditorTab === 'visual' ? 'is-active' : ''}" data-editor-tab="visual">Visual</button>
                  <button type="button" class="adm-editor-tab-btn ${newsEditorTab === 'html' ? 'is-active' : ''}" data-editor-tab="html">HTML</button>
                  <button type="button" class="adm-editor-tab-btn ${newsEditorTab === 'preview' ? 'is-active' : ''}" data-editor-tab="preview">Preview</button>
                </div>
              </div>
              <div class="adm-editor-content">
                ${newsEditorTab === 'visual' ? `
                  <div class="adm-rich-editor prose" contenteditable="true" data-rich-editor>${newsContentHtml || '<p>Write your detailed story here...</p>'}</div>
                ` : newsEditorTab === 'html' ? `
                  <textarea class="adm-raw-html" data-raw-html rows="14" placeholder="<p>Write or paste your raw HTML here...</p>">${esc(newsContentHtml)}</textarea>
                ` : `
                  <div class="adm-preview-article prose">
                    ${newsContentHtml || '<p class="adm-muted">Nothing written yet. Switch to Visual or HTML to start.</p>'}
                  </div>
                `}
              </div>
            </div>
          </div>

          <div class="adm-field">
            <label for="adm-news-source">Byline</label>
            <input class="input" type="text" id="adm-news-source" data-input-news-source value="${esc(newsSource)}">
          </div>
          <div class="adm-field">
            <label for="adm-news-kind">Type</label>
            <select class="select" id="adm-news-kind" data-input-news-kind>
              ${Object.entries(KIND_LABEL).map(([v, l]) => `<option value="${v}" ${newsKind === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="adm-field is-full">
            <label for="adm-news-url">Original link <span class="adm-opt">optional · leave blank to publish on Style Vault</span></label>
            <input class="input" type="url" id="adm-news-url" data-input-news-url placeholder="https://…" value="${esc(newsUrl)}">
          </div>
          <div class="adm-field is-full">
            <label>Cover image <span class="adm-opt">optional · max 2 MB</span></label>
            ${imageField(newsImageUrl, { removeAttr: 'data-remove-news-img', fileAttr: 'data-upload-news-file', urlAttr: 'data-input-news-img-url' })}
          </div>

          <div class="adm-form-foot is-full">
            <button type="submit" class="btn btn-plum" ${isPublishing ? 'disabled' : ''}>${icon('check')}<span>${isPublishing ? 'Publishing…' : 'Publish story'}</span></button>
          </div>
        </form>

        <aside class="adm-preview">
          <span class="adm-preview-lbl">Feed Card Preview</span>
          <article class="adm-preview-card admin-ad-preview-panel">
            ${newsImageUrl ? `<div class="adm-preview-img"><img src="${esc(newsImageUrl)}" alt=""></div>` : ''}
            <div class="adm-preview-meta">
              <span class="news-source">${esc(newsSource || 'StyleVault Editorial')}</span>
              <span>·</span>
              <span>Just now</span>
              ${badge(KIND_LABEL[newsKind], 'plum')}
              ${newsScope === 'everyone' ? badge('Pan-African', 'ok') : ''}
            </div>
            <h3 class="news-title"><a>${esc(newsTitle || 'Your headline will appear here')}</a></h3>
            <p class="news-summary">${esc(newsSummary || 'The summary readers see in their feeds will appear here. Readers tap this card to read the full HTML story.')}</p>
          </article>
        </aside>
      </div>`;
  }

  function renderAdsTab() {
    const activeCount = adsList.filter((a) => a.active).length;
    const totalImps = adsList.reduce((acc, a) => acc + (a.impressions || 0), 0);
    const totalClicks = adsList.reduce((acc, a) => acc + (a.clicks || 0), 0);
    const overallCtr = totalImps > 0 ? `${((totalClicks / totalImps) * 100).toFixed(1)}%` : '0.0%';

    const PAGE_TARGET_OPTIONS = [
      { path: '/', label: 'Home Page (/)' },
      { path: '/news', label: 'News Wire (/news)' },
      { path: '/explore', label: 'Explore & Directory (/explore)' },
      { path: '/countries', label: 'Countries (/countries)' },
      { path: '/topics', label: 'Topics (/topics)' },
      { path: '/research', label: 'Research (/research)' },
      { path: '/monitor', label: 'Monitor (/monitor)' },
      { path: '/tools', label: 'Tools (/tools)' },
      { path: '/about', label: 'About & Sources (/about)' },
      { path: '/article', label: 'Articles (/article)' },
    ];

    return `
      ${secHead('Ads', 'Create and manage sponsored banners, in-feed cards and pop-ups.',
        `<button type="button" class="btn btn-outline btn-sm" data-refresh-ads>Refresh</button>`)}
      <div class="adm-stats">
        ${stat('Campaigns', nf(adsList.length), `${activeCount} active`)}
        ${stat('Impressions', nf(totalImps))}
        ${stat('Clicks', nf(totalClicks))}
        ${stat('Click rate', overallCtr)}
      </div>

      <section class="adm-card is-flush adm-ads-list">
        <div class="adm-card-pad">${secHead(`Your campaigns${adsList.length ? ` <em class="adm-count">${adsList.length}</em>` : ''}`, '')}</div>
        ${adsLoading ? '<div class="adm-state"><span class="adm-dot"></span><p>Loading ads…</p></div>'
          : !adsList.length ? '<p class="adm-empty adm-card-pad">No campaigns yet. Create one below.</p>'
          : `<ul class="adm-ads">${adsList.map((ad) => `
            <li>
              ${ad.imageUrl ? `<img src="${esc(ad.imageUrl)}" alt="" class="adm-ad-thumb">` : `<span class="adm-ad-thumb is-empty">${icon('layers')}</span>`}
              <div class="adm-ad-main">
                <div class="adm-ad-tags">
                  ${badge(esc(ad.type), 'plum')}
                  ${badge(esc(ad.sourceType || 'image'), 'muted')}
                  ${badge(`Pages: ${esc(ad.targetPages || ad.placement || 'all')}`)}
                  ${badge(ad.active ? 'Active' : 'Paused', ad.active ? 'ok' : 'muted')}
                </div>
                <strong>${esc(ad.title)}</strong>
                <span class="adm-muted">${esc(ad.sponsor)} · ${ad.linkUrl ? `<a href="${esc(ad.linkUrl)}" target="_blank" rel="noopener">${esc(ad.linkUrl)}</a>` : 'Raw code'}</span>
              </div>
              <div class="adm-ad-perf"><strong>${nf(ad.impressions)}</strong><span>views</span><strong>${nf(ad.clicks)}</strong><span>clicks</span><strong>${esc(String(ad.ctr))}</strong><span>rate</span></div>
              <div class="adm-ad-actions">
                <button type="button" class="btn btn-sm ${ad.active ? 'btn-outline' : 'btn-plum'}" data-toggle-ad="${esc(ad.id)}">${ad.active ? 'Pause' : 'Activate'}</button>
                <button type="button" class="adm-icon-btn is-danger" data-delete-ad="${esc(ad.id)}" title="Delete campaign" aria-label="Delete campaign">${icon('trash')}</button>
              </div>
            </li>`).join('')}</ul>`}
      </section>

      ${secHead('New campaign', 'Choose a format and where it shows. The preview updates as you type.')}
      <div class="adm-compose is-stacked">
        <form class="adm-card adm-form" data-ad-form>
          <div class="adm-field">
            <label for="adm-ad-type">Format</label>
            <select class="select" id="adm-ad-type" data-input-ad-type>
              <option value="banner" ${adType === 'banner' ? 'selected' : ''}>Banner strip</option>
              <option value="native" ${adType === 'native' ? 'selected' : ''}>In-feed card</option>
              <option value="interstitial" ${adType === 'interstitial' ? 'selected' : ''}>Pop-up</option>
            </select>
          </div>

          <div class="adm-field">
            <label for="adm-ad-source-type">Creative</label>
            <select class="select" id="adm-ad-source-type" data-input-ad-source-type>
              <option value="image" ${adSourceType === 'image' ? 'selected' : ''}>Image + Link</option>
              <option value="html" ${adSourceType === 'html' ? 'selected' : ''}>HTML / ad network code</option>
            </select>
          </div>

          <div class="adm-field is-full">
            <label>Where it shows</label>
            <div class="adm-scope-selector">
              <button type="button" class="adm-scope-btn ${adTargetPagesMode === 'all' ? 'is-active' : ''}" data-ad-target-mode="all">
                <span class="adm-scope-ico">${icon('globe')}</span><span class="adm-scope-text"><strong>All pages</strong><span>Everywhere on Style Vault</span></span>
              </button>
              <button type="button" class="adm-scope-btn ${adTargetPagesMode === 'custom' ? 'is-active' : ''}" data-ad-target-mode="custom">
                <span class="adm-scope-ico">${icon('layers')}</span><span class="adm-scope-text"><strong>Specific pages</strong><span>Choose the pages or sections</span></span>
              </button>
            </div>
            ${adTargetPagesMode === 'custom' ? `
              <div class="adm-pages-grid">
                ${PAGE_TARGET_OPTIONS.map((opt) => `
                  <label class="adm-page-label">
                    <input type="checkbox" data-ad-page-check="${esc(opt.path)}" ${adSelectedPages.has(opt.path) ? 'checked' : ''}>
                    <span>${esc(opt.label)}</span>
                  </label>
                `).join('')}
              </div>
              <div class="adm-custom-paths">
                <label for="adm-ad-custom-pages">Other paths <span class="adm-opt">comma-separated, e.g. /topic/energy, /country/ghana</span></label>
                <input class="input" type="text" id="adm-ad-custom-pages" data-input-ad-custom-pages placeholder="/news, /topic/energy" value="${esc(adCustomPagesInput)}">
              </div>
            ` : ''}
          </div>

          <div class="adm-field">
            <label for="adm-ad-sponsor">Sponsor <span class="adm-req">required</span></label>
            <input class="input" type="text" id="adm-ad-sponsor" data-input-ad-sponsor placeholder="e.g. Ria’s Colony" value="${esc(adSponsor)}" required>
          </div>
          <div class="adm-field">
            <label for="adm-ad-title">Headline <span class="adm-req">required</span></label>
            <input class="input" type="text" id="adm-ad-title" data-input-ad-title placeholder="e.g. Pan-African Business Summit" value="${esc(adTitle)}" required>
          </div>

          ${adSourceType === 'image' ? `
            <div class="adm-field is-full">
              <label for="adm-ad-body">Description</label>
              <textarea class="input" id="adm-ad-body" data-input-ad-body rows="2" placeholder="One short sentence">${esc(adBody)}</textarea>
            </div>
            <div class="adm-field">
              <label for="adm-ad-link">Link <span class="adm-req">required</span></label>
              <input class="input" type="url" id="adm-ad-link" data-input-ad-link placeholder="https://…" value="${esc(adLinkUrl)}" required>
            </div>
            <div class="adm-field">
              <label for="adm-ad-cta">Button text</label>
              <input class="input" type="text" id="adm-ad-cta" data-input-ad-cta value="${esc(adCtaText)}">
            </div>
            <div class="adm-field is-full">
              <label>Image <span class="adm-opt">optional · max 2 MB</span></label>
              ${imageField(adImageUrl, { removeAttr: 'data-remove-ad-img', fileAttr: 'data-upload-ad-file', urlAttr: 'data-input-ad-img-url' })}
            </div>
          ` : `
            <div class="adm-field is-full">
              <label for="adm-ad-html">Embed code <span class="adm-req">required</span></label>
              <textarea class="input font-mono" id="adm-ad-html" data-input-ad-html rows="8" placeholder="Paste an AdSense tag, sponsor widget or HTML" required>${esc(adHtmlCode)}</textarea>
            </div>
            <div class="adm-field is-full">
              <label for="adm-ad-link">Click-through URL <span class="adm-opt">optional</span></label>
              <input class="input" type="url" id="adm-ad-link" data-input-ad-link placeholder="https://…" value="${esc(adLinkUrl)}">
            </div>
          `}

          <label class="adm-check is-full"><input type="checkbox" data-input-ad-active ${adActive ? 'checked' : ''}><span>Start showing it straight away</span></label>
          <div class="adm-form-foot is-full">
            <button type="submit" class="btn btn-plum" ${isSavingAd ? 'disabled' : ''}>${icon('check')}<span>${isSavingAd ? 'Saving…' : 'Save campaign'}</span></button>
          </div>
        </form>

        <aside class="adm-preview">
          <span class="adm-preview-lbl">Preview · ${esc({ banner: 'Banner strip', native: 'In-feed card', interstitial: 'Pop-up' }[adType] || adType)} (${adSourceType === 'html' ? 'Raw HTML' : 'Image'})</span>
          ${renderAdPreviewHtml({ type: adType, sourceType: adSourceType, htmlCode: adHtmlCode, title: adTitle || 'Headline appears here', sponsor: adSponsor || 'Sponsor', body: adBody || 'Your short description shows here.', imageUrl: adImageUrl, linkUrl: adLinkUrl || '#', ctaText: adCtaText || 'Learn more' })}
        </aside>
      </div>`;
  }

  function renderAdPreviewHtml(ad) {
    if (ad.sourceType === 'html' && ad.htmlCode) {
      return `
        <div class="sv-ad-preview-wrap">
          <span class="sv-ad-kicker">Sponsored · ${esc(ad.sponsor || 'Partner')}</span>
          <div class="sv-ad-embed-body">${ad.htmlCode}</div>
        </div>`;
    }

    if (ad.type === 'banner') {
      return `
        <div class="sv-ad-banner" style="margin:0">
          <div class="sv-ad-banner-inner" style="padding:0 10px">
            <div class="sv-ad-banner-left">
              <span class="sv-ad-kicker">Sponsored · ${esc(ad.sponsor)}</span>
              ${ad.imageUrl ? `<img class="sv-ad-banner-thumb" src="${esc(ad.imageUrl)}" alt="">` : ''}
              <div class="sv-ad-banner-copy">
                <strong class="sv-ad-banner-title">${esc(ad.title)}</strong>
                ${ad.body ? `<span class="sv-ad-banner-desc">${esc(ad.body)}</span>` : ''}
              </div>
            </div>
            <div class="sv-ad-banner-actions">
              <span class="btn btn-plum btn-sm">${esc(ad.ctaText)} ↗</span>
            </div>
          </div>
        </div>`;
    }
    if (ad.type === 'native') {
      return `
        <div class="sv-ad-native-card" style="margin:0">
          <div class="news-content">
            <div class="news-meta"><span class="sv-ad-badge">Sponsored · ${esc(ad.sponsor)}</span></div>
            <h3 class="news-title"><a>${esc(ad.title)}</a></h3>
            ${ad.body ? `<p class="news-summary">${esc(ad.body)}</p>` : ''}
            <div class="news-foot"><span class="sv-ad-cta-link">${esc(ad.ctaText)} ↗</span></div>
          </div>
          ${ad.imageUrl ? `<div class="news-thumb sv-ad-thumb"><img src="${esc(ad.imageUrl)}" alt=""></div>` : ''}
        </div>`;
    }
    return `
      <div class="adm-pop-preview">
        ${ad.imageUrl ? `<div class="adm-pop-img"><img src="${esc(ad.imageUrl)}" alt=""></div>` : ''}
        <div class="adm-pop-body">
          <span class="sv-ad-interstitial-kicker">Sponsored · ${esc(ad.sponsor)}</span>
          <h3>${esc(ad.title)}</h3>
          <p>${esc(ad.body)}</p>
          <div class="adm-pop-actions"><span class="btn btn-plum btn-sm">${esc(ad.ctaText)} ↗</span><span class="btn btn-outline btn-sm">Close</span></div>
        </div>
      </div>`;
  }

  // Event handlers
  main.addEventListener('click', async (e) => {
    // Tab switching
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) {
      activeTab = tabBtn.dataset.tab;
      if (activeTab === 'ads') {
        loadAds();
      } else {
        render();
      }
      return;
    }

    // Set Scope (Everyone vs Targeted)
    const scopeBtn = e.target.closest('[data-set-scope]');
    if (scopeBtn) {
      newsScope = scopeBtn.dataset.setScope;
      render();
      return;
    }

    // Toggle Region in news publish form
    const regBtn = e.target.closest('[data-toggle-region]');
    if (regBtn) {
      const reg = regBtn.dataset.toggleRegion;
      const regCountries = (store.meta.countries || []).filter((c) => c.region === reg);
      const isAllOn = regCountries.length > 0 && regCountries.every((c) => newsCountries.has(c.code));
      regCountries.forEach((c) => {
        if (isAllOn) newsCountries.delete(c.code);
        else newsCountries.add(c.code);
      });
      render();
      return;
    }

    // Toggle Editor Tabs (Visual / HTML / Preview)
    const editorTabBtn = e.target.closest('[data-editor-tab]');
    if (editorTabBtn) {
      const richEl = $('[data-rich-editor]', main);
      const rawEl = $('[data-raw-html]', main);
      if (newsEditorTab === 'visual' && richEl) {
        newsContentHtml = richEl.innerHTML;
      } else if (newsEditorTab === 'html' && rawEl) {
        newsContentHtml = rawEl.value;
      }
      newsEditorTab = editorTabBtn.dataset.editorTab;
      render();
      return;
    }

    // Rich Text Editor Commands
    const cmdBtn = e.target.closest('[data-edit-cmd]');
    if (cmdBtn) {
      const cmd = cmdBtn.dataset.editCmd;
      document.execCommand(cmd, false, null);
      const richEl = $('[data-rich-editor]', main);
      if (richEl) newsContentHtml = richEl.innerHTML;
      return;
    }

    const blockBtn = e.target.closest('[data-edit-block]');
    if (blockBtn) {
      const block = blockBtn.dataset.editBlock;
      document.execCommand('formatBlock', false, `<${block}>`);
      const richEl = $('[data-rich-editor]', main);
      if (richEl) newsContentHtml = richEl.innerHTML;
      return;
    }

    if (e.target.closest('[data-edit-link]')) {
      const url = prompt('Enter link URL (https://…):');
      if (url) {
        document.execCommand('createLink', false, url);
        const richEl = $('[data-rich-editor]', main);
        if (richEl) newsContentHtml = richEl.innerHTML;
      }
      return;
    }

    if (e.target.closest('[data-edit-img]')) {
      const url = prompt('Enter image URL (https://…):');
      if (url) {
        document.execCommand('insertImage', false, url);
        const richEl = $('[data-rich-editor]', main);
        if (richEl) newsContentHtml = richEl.innerHTML;
      }
      return;
    }

    // Ad Target Mode Switch
    const adTargetModeBtn = e.target.closest('[data-ad-target-mode]');
    if (adTargetModeBtn) {
      adTargetPagesMode = adTargetModeBtn.dataset.adTargetMode;
      render();
      return;
    }

    // Toggle country pill in news publish form
    const countryBtn = e.target.closest('[data-toggle-country]');
    if (countryBtn) {
      const code = countryBtn.dataset.toggleCountry;
      if (newsCountries.has(code)) newsCountries.delete(code);
      else newsCountries.add(code);
      countryBtn.classList.toggle('is-on', newsCountries.has(code));
      countryBtn.setAttribute('aria-pressed', newsCountries.has(code));
      const countLbl = $('[data-country-count]', main);
      if (countLbl) countLbl.textContent = `${newsCountries.size} selected`;
      return;
    }

    // Toggle topic pill in news publish form
    const topicBtn = e.target.closest('[data-toggle-topic]');
    if (topicBtn) {
      const slug = topicBtn.dataset.toggleTopic;
      if (newsTopics.has(slug)) newsTopics.delete(slug);
      else newsTopics.add(slug);
      topicBtn.classList.toggle('is-on', newsTopics.has(slug));
      topicBtn.setAttribute('aria-pressed', newsTopics.has(slug));
      const topicLbl = $('[data-topic-count]', main);
      if (topicLbl) topicLbl.textContent = `${newsTopics.size} selected`;
      return;
    }

    // Remove news image
    if (e.target.closest('[data-remove-news-img]')) {
      newsImageUrl = '';
      render();
      return;
    }

    // Remove ad image
    if (e.target.closest('[data-remove-ad-img]')) {
      adImageUrl = '';
      render();
      return;
    }

    // Refresh ads
    if (e.target.closest('[data-refresh-ads]')) {
      loadAds();
      return;
    }

    // Toggle ad active/pause
    const toggleAdBtn = e.target.closest('[data-toggle-ad]');
    if (toggleAdBtn) {
      const id = toggleAdBtn.dataset.toggleAd;
      const ad = adsList.find((a) => a.id === id);
      if (ad) {
        try {
          await api.adminUpdateAd(adminKey, id, { active: !ad.active });
          toast(`Ad ${ad.active ? 'paused' : 'activated'}`, 'ok');
          await loadAds();
        } catch (err) {
          toast(err.message, 'error');
        }
      }
      return;
    }

    // Delete ad
    const deleteAdBtn = e.target.closest('[data-delete-ad]');
    if (deleteAdBtn) {
      const id = deleteAdBtn.dataset.deleteAd;
      if (confirm('Permanently delete this ad campaign?')) {
        try {
          await api.adminDeleteAd(adminKey, id);
          toast('Ad campaign deleted', 'ok');
          await loadAds();
        } catch (err) {
          toast(err.message, 'error');
        }
      }
      return;
    }

    // Toggle admin key bar
    if (e.target.closest('[data-toggle-key]')) {
      const bar = $('[data-key-bar]', main);
      if (bar) bar.hidden = !bar.hidden;
      return;
    }

    // Save admin key
    if (e.target.closest('[data-save-key]')) {
      const input = $('#adm-key-input', main);
      if (input) {
        adminKey = input.value.trim();
        localStorage.setItem('sv_admin_key', adminKey);
        toast('Admin key saved');
        loadData();
      }
      return;
    }

    // Clear admin key
    if (e.target.closest('[data-clear-key]')) {
      adminKey = '';
      localStorage.removeItem('sv_admin_key');
      const input = $('#adm-key-input', main);
      if (input) input.value = '';
      toast('Admin key cleared');
      loadData();
      return;
    }

    // Refresh metrics
    if (e.target.closest('[data-refresh-metrics]')) {
      loadData();
      return;
    }

    // Trigger collector
    if (e.target.closest('[data-run-collect]') && !isIngesting) {
      isIngesting = true;
      render();
      toast('Starting scraper run…');
      try {
        const res = await api.adminCollect(adminKey, false);
        toast(`Collected: ${res.articlesAdded || 0} articles added from ${res.sourcesChecked || 0} newsrooms!`);
        await loadData();
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        isIngesting = false;
        render();
      }
    }
  });

  // Input & Change handlers for real-time live preview
  main.addEventListener('input', (e) => {
    if (e.target.matches('[data-picker-filter]')) {
      const q = e.target.value.trim().toLowerCase();
      $$('[data-picker-list] [data-toggle-country]', main).forEach((b) => { b.hidden = Boolean(q) && !b.dataset.name.includes(q); });
      return;
    }
    if (e.target.matches('[data-rich-editor]')) {
      newsContentHtml = e.target.innerHTML;
    } else if (e.target.matches('[data-raw-html]')) {
      newsContentHtml = e.target.value;
    } else if (e.target.matches('[data-input-news-title]')) {
      newsTitle = e.target.value;
      const previewTitle = main.querySelector('.admin-ad-preview-panel .news-title a');
      if (previewTitle) previewTitle.textContent = newsTitle || 'Your Headline Will Appear Here';
    } else if (e.target.matches('[data-input-news-summary]')) {
      newsSummary = e.target.value;
      const previewSummary = main.querySelector('.admin-ad-preview-panel .news-summary');
      if (previewSummary) previewSummary.textContent = newsSummary || 'The summary readers see in their feeds will appear here.';
    } else if (e.target.matches('[data-input-news-source]')) {
      newsSource = e.target.value;
      const previewSource = main.querySelector('.admin-ad-preview-panel .news-source');
      if (previewSource) previewSource.textContent = newsSource || 'StyleVault Editorial';
    } else if (e.target.matches('[data-input-news-url]')) {
      newsUrl = e.target.value;
    } else if (e.target.matches('[data-input-news-img-url]')) {
      newsImageUrl = e.target.value;
    } else if (e.target.matches('[data-input-ad-title]')) {
      adTitle = e.target.value;
    } else if (e.target.matches('[data-input-ad-sponsor]')) {
      adSponsor = e.target.value;
    } else if (e.target.matches('[data-input-ad-body]')) {
      adBody = e.target.value;
    } else if (e.target.matches('[data-input-ad-link]')) {
      adLinkUrl = e.target.value;
    } else if (e.target.matches('[data-input-ad-cta]')) {
      adCtaText = e.target.value;
    } else if (e.target.matches('[data-input-ad-img-url]')) {
      adImageUrl = e.target.value;
    } else if (e.target.matches('[data-input-ad-html]')) {
      adHtmlCode = e.target.value;
    } else if (e.target.matches('[data-input-ad-custom-pages]')) {
      adCustomPagesInput = e.target.value;
    }
  });

  main.addEventListener('change', (e) => {
    if (e.target.matches('[data-input-news-kind]')) {
      newsKind = e.target.value;
      render();
    } else if (e.target.matches('[data-upload-news-file]')) {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) return toast('Image file is too large (max 2MB)', 'error');
        const reader = new FileReader();
        reader.onload = (re) => {
          newsImageUrl = re.target.result;
          render();
        };
        reader.readAsDataURL(file);
      }
    } else if (e.target.matches('[data-input-ad-type]')) {
      adType = e.target.value;
      render();
    } else if (e.target.matches('[data-input-ad-source-type]')) {
      adSourceType = e.target.value;
      render();
    } else if (e.target.matches('[data-ad-page-check]')) {
      const path = e.target.dataset.adPageCheck;
      if (e.target.checked) adSelectedPages.add(path);
      else adSelectedPages.delete(path);
    } else if (e.target.matches('[data-input-ad-active]')) {
      adActive = e.target.checked;
    } else if (e.target.matches('[data-upload-ad-file]')) {
      const file = e.target.files?.[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) return toast('Image file is too large (max 2MB)', 'error');
        const reader = new FileReader();
        reader.onload = (re) => {
          adImageUrl = re.target.result;
          render();
        };
        reader.readAsDataURL(file);
      }
    }
  });

  // Form submit handlers
  main.addEventListener('submit', async (e) => {
    // Publish News Form
    if (e.target.matches('[data-publish-form]')) {
      e.preventDefault();

      // Sync active editor content
      const richEl = $('[data-rich-editor]', main);
      const rawEl = $('[data-raw-html]', main);
      if (newsEditorTab === 'visual' && richEl) {
        newsContentHtml = richEl.innerHTML;
      } else if (newsEditorTab === 'html' && rawEl) {
        newsContentHtml = rawEl.value;
      }

      if (!newsTitle.trim()) return toast('Please enter a headline', 'error');
      if (!newsSummary.trim()) return toast('Please enter a summary or teaser for feed cards', 'error');

      isPublishing = true;
      render();
      try {
        await api.adminPublishArticle(adminKey, {
          title: newsTitle.trim(),
          summary: newsSummary.trim(),
          contentHtml: newsContentHtml.trim() || undefined,
          targetScope: newsScope,
          sourceName: newsSource.trim() || 'StyleVault Editorial',
          url: newsUrl.trim() || undefined,
          imageUrl: newsImageUrl.trim() || undefined,
          kind: newsKind,
          countries: newsScope === 'everyone' ? [] : [...newsCountries],
          topics: newsScope === 'everyone' ? [] : [...newsTopics],
        });
        toast('News story published successfully to StyleVault!', 'ok');
        newsTitle = '';
        newsSummary = '';
        newsContentHtml = '';
        newsUrl = '';
        newsImageUrl = '';
        activeTab = 'overview';
        await loadData();
      } catch (err) {
        toast(err.message || 'Failed to publish story', 'error');
      } finally {
        isPublishing = false;
        render();
      }
      return;
    }

    // Ad Creation Form
    if (e.target.matches('[data-ad-form]')) {
      e.preventDefault();
      if (!adTitle.trim()) return toast('Ad headline is required', 'error');
      if (!adSponsor.trim()) return toast('Sponsor brand name is required', 'error');

      if (adSourceType === 'image') {
        if (!adLinkUrl.trim() || !/^https?:\/\//i.test(adLinkUrl.trim())) {
          return toast('Valid destination link URL (https://...) is required', 'error');
        }
      } else if (adSourceType === 'html') {
        if (!adHtmlCode.trim()) {
          return toast('Raw HTML or network ad tag is required', 'error');
        }
      }

      // Calculate target pages
      let calculatedTargetPages = 'all';
      if (adTargetPagesMode === 'custom') {
        const extraPaths = adCustomPagesInput.split(',').map((s) => s.trim()).filter(Boolean);
        const allTargetPaths = [...adSelectedPages, ...extraPaths];
        calculatedTargetPages = allTargetPaths.length ? allTargetPaths.join(',') : 'all';
      }

      isSavingAd = true;
      render();
      try {
        await api.adminCreateAd(adminKey, {
          type: adType,
          sourceType: adSourceType,
          title: adTitle.trim(),
          sponsor: adSponsor.trim(),
          body: adBody.trim() || undefined,
          linkUrl: adLinkUrl.trim() || undefined,
          ctaText: adCtaText.trim() || 'Learn More',
          imageUrl: adImageUrl.trim() || undefined,
          htmlCode: adHtmlCode.trim() || undefined,
          targetPages: calculatedTargetPages,
          active: adActive,
        });
        toast('Ad campaign launched successfully!', 'ok');
        adTitle = '';
        adSponsor = '';
        adBody = '';
        adLinkUrl = '';
        adImageUrl = '';
        adHtmlCode = '';
        await loadAds();
      } catch (err) {
        toast(err.message || 'Failed to create ad', 'error');
      } finally {
        isSavingAd = false;
        render();
      }
      return;
    }
  });

  loadData();
}
