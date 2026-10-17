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

  // News publishing state
  let newsTitle = '';
  let newsSummary = '';
  let newsSource = 'StyleVault Editorial';
  let newsUrl = '';
  let newsImageUrl = '';
  let newsKind = 'news';
  let newsCountries = new Set(['NG']);
  let newsTopics = new Set(['business']);
  let isPublishing = false;

  // Ad manager state
  let adsList = [];
  let adsLoading = false;
  let adType = 'banner';
  let adTitle = '';
  let adSponsor = '';
  let adBody = '';
  let adLinkUrl = '';
  let adCtaText = 'Learn More';
  let adImageUrl = '';
  let adPlacement = 'all';
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

  const render = () => {
    main.innerHTML = `
      <section class="admin-hero">
        <div class="wrap admin-hero-inner">
          <div>
            <div class="admin-badge-row">
              <span class="admin-pill"><span class="live-dot-sm"></span> System Live</span>
              <span class="admin-pill muted">Admin Control &amp; Analytics</span>
            </div>
            <h1>Platform Analytics &amp; Admin</h1>
            <p>Real-time reader growth, newsroom ingestion health, and content distribution across Africa.</p>
          </div>
          <div class="admin-actions">
            <button type="button" class="btn btn-plum admin-btn" data-run-collect ${isIngesting ? 'disabled' : ''}>
              ${icon('sparkles')} <span>${isIngesting ? 'Collecting…' : 'Run Scraper Now'}</span>
            </button>
            <button type="button" class="btn btn-outline admin-btn" data-refresh-metrics title="Reload stats">
              ${icon('refresh')} <span>Refresh</span>
            </button>
            <button type="button" class="btn btn-outline admin-btn" data-toggle-key title="Set Admin API Key">
              ${icon('lock')} <span>${adminKey ? 'Key Set' : 'Add Key'}</span>
            </button>
          </div>
        </div>
      </section>

      <div class="admin-body">
        <div class="wrap admin-wrap">
          ${renderKeyModal()}

          ${loading ? `
            <div class="admin-loading">
              <span class="live-dot-sm" style="width:12px;height:12px"></span>
              <p>Fetching real-time platform metrics from Cloudflare D1…</p>
            </div>
          ` : errorMsg ? `
            <div class="empty admin-empty-error">
              <div class="ic">${icon('lock')}</div>
              <h3>Admin Access Required</h3>
              <p>${esc(errorMsg)}</p>
              ${!store.user ? `
                <div style="margin-top:14px;display:flex;gap:10px;justify-content:center">
                  <a class="btn btn-plum btn-sm" href="/login?next=/admin">Sign in to Admin</a>
                  <button type="button" class="btn btn-outline btn-sm" data-toggle-key>Enter Admin Key</button>
                </div>
              ` : `
                <div style="margin-top:14px">
                  <button type="button" class="btn btn-plum btn-sm" data-toggle-key>Set Admin Key</button>
                </div>
              `}
            </div>
          ` : renderMetricsContent()}
        </div>
      </div>`;
  };

  function renderKeyModal() {
    return `
      <div class="admin-key-bar" data-key-bar hidden>
        <div class="admin-key-inner">
          <label for="adm-key-input"><strong>Admin Token / Secret Key:</strong></label>
          <input type="password" id="adm-key-input" class="input admin-key-input" placeholder="Paste ADMIN_TOKEN if configured" value="${esc(adminKey)}">
          <button type="button" class="btn btn-plum btn-sm" data-save-key>Save Key</button>
          <button type="button" class="btn btn-outline btn-sm" data-clear-key>Clear</button>
        </div>
      </div>`;
  }

  function renderMetricsContent() {
    if (!metrics) return '';
    const { users, content, collector } = metrics;
    const failingCount = collector.stats?.failing || 0;
    const healthyCount = collector.stats?.healthy || 0;
    const totalSources = collector.stats?.total || 0;

    return `
      <!-- KPI Top Grid -->
      <div class="admin-kpi-grid">
        <div class="admin-kpi-card">
          <div class="kpi-head">
            <span class="kpi-lbl">Total Readers</span>
            <span class="kpi-icon">👥</span>
          </div>
          <div class="kpi-value">${nf(users.total)}</div>
          <div class="kpi-sub">
            <span class="kpi-badge positive">+${users.new24h} today</span>
            <span class="kpi-badge muted">+${users.new7d} this week</span>
          </div>
        </div>

        <div class="admin-kpi-card">
          <div class="kpi-head">
            <span class="kpi-lbl">Articles Ingested</span>
            <span class="kpi-icon">📰</span>
          </div>
          <div class="kpi-value">${nf(content.totalArticles)}</div>
          <div class="kpi-sub">
            <span class="kpi-badge positive">+${content.articles24h} last 24h</span>
            <span class="kpi-badge muted">+${content.articles7d} last 7d</span>
          </div>
        </div>

        <div class="admin-kpi-card">
          <div class="kpi-head">
            <span class="kpi-lbl">Newsrooms Active</span>
            <span class="kpi-icon">📡</span>
          </div>
          <div class="kpi-value">${collector.stats?.active || 0} <span style="font-size:0.9rem;font-weight:400;color:var(--muted)">/ ${totalSources}</span></div>
          <div class="kpi-sub">
            <span class="kpi-badge positive">${healthyCount} Healthy</span>
            ${failingCount > 0 ? `<span class="kpi-badge negative">${failingCount} Issues</span>` : `<span class="kpi-badge muted">0 Failures</span>`}
          </div>
        </div>

        <div class="admin-kpi-card">
          <div class="kpi-head">
            <span class="kpi-lbl">User Engagement</span>
            <span class="kpi-icon">⭐</span>
          </div>
          <div class="kpi-value">${nf(content.totalMonitors)} <span style="font-size:0.85rem;font-weight:400;color:var(--muted)">Monitors</span></div>
          <div class="kpi-sub">
            <span class="kpi-badge accent">${nf(content.totalSaved)} Bookmarks saved</span>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="admin-tabs-bar">
        <button type="button" class="admin-tab ${activeTab === 'overview' ? 'active' : ''}" data-tab="overview">
          ${icon('compass')} Overview &amp; Health
        </button>
        <button type="button" class="admin-tab ${activeTab === 'publish' ? 'active' : ''}" data-tab="publish">
          ${icon('sparkles')} Publish News
        </button>
        <button type="button" class="admin-tab ${activeTab === 'ads' ? 'active' : ''}" data-tab="ads">
          ${icon('layers')} Ad Manager
        </button>
        <button type="button" class="admin-tab ${activeTab === 'users' ? 'active' : ''}" data-tab="users">
          ${icon('user')} Registered Readers (${users.total})
        </button>
        <button type="button" class="admin-tab ${activeTab === 'sources' ? 'active' : ''}" data-tab="sources">
          ${icon('globe')} Newsrooms &amp; Collector (${totalSources})
        </button>
        <button type="button" class="admin-tab ${activeTab === 'distribution' ? 'active' : ''}" data-tab="distribution">
          ${icon('sparkles')} Popular Follows &amp; Content
        </button>
      </div>

      <!-- Tab Content -->
      ${activeTab === 'overview' ? renderOverviewTab() : ''}
      ${activeTab === 'publish' ? renderPublishTab() : ''}
      ${activeTab === 'ads' ? renderAdsTab() : ''}
      ${activeTab === 'users' ? renderUsersTab() : ''}
      ${activeTab === 'sources' ? renderSourcesTab() : ''}
      ${activeTab === 'distribution' ? renderDistributionTab() : ''}
    `;
  }

  function renderOverviewTab() {
    const { users, content, collector } = metrics;
    const failing = collector.failingSources || [];
    const runs = collector.recentRuns || [];

    return `
      <div class="admin-grid-2">
        <!-- Collector Status -->
        <div class="admin-card">
          <div class="admin-card-head">
            <div>
              <h3>RSS Ingestion &amp; Scraper Runs</h3>
              <p>Automatic scheduled checks run every 5 minutes on Cloudflare Workers Cron.</p>
            </div>
            <button type="button" class="btn btn-outline btn-sm" data-run-collect ${isIngesting ? 'disabled' : ''}>
              ${isIngesting ? 'Running…' : 'Trigger Run'}
            </button>
          </div>

          <div class="admin-table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Trigger</th>
                  <th>Checked</th>
                  <th>Added</th>
                  <th>Errors</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                ${runs.length ? runs.map((r) => `
                  <tr>
                    <td><strong>#${r.id}</strong></td>
                    <td><span class="admin-badge ${r.trigger === 'cron' ? 'muted' : 'accent'}">${esc(r.trigger)}</span></td>
                    <td>${r.sources_checked}</td>
                    <td><span class="positive-text">+${r.articles_added}</span></td>
                    <td>${r.errors > 0 ? `<span class="negative-text">${r.errors}</span>` : '0'}</td>
                    <td>${formatTimestamp(r.started_at)}</td>
                  </tr>
                `).join('') : '<tr><td colspan="6" class="muted text-center">No recorded collection runs yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Failing / Degraded Sources -->
        <div class="admin-card">
          <div class="admin-card-head">
            <div>
              <h3>Sources Requiring Attention (${failing.length})</h3>
              <p>Outlets with consecutive fetch failures or unreachable feeds.</p>
            </div>
          </div>

          ${failing.length ? `
            <div class="admin-table-wrap">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Outlet</th>
                    <th>Country</th>
                    <th>Failures</th>
                    <th>Last Error</th>
                  </tr>
                </thead>
                <tbody>
                  ${failing.map((s) => `
                    <tr>
                      <td><strong>${esc(s.name)}</strong></td>
                      <td>${s.country_code ? `${flag(s.country_code)} ${s.country_code}` : 'Pan-Africa'}</td>
                      <td><span class="admin-badge negative">${s.consecutive_failures} fails</span></td>
                      <td class="admin-err-snippet" title="${esc(s.last_error || '')}">${esc(s.last_error || 'No response')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="admin-success-box">
              <span class="positive-icon">${icon('check')}</span>
              <strong>All newsroom feeds are operating normally!</strong>
              <p>Zero consecutive failures recorded across all active sources.</p>
            </div>
          `}
        </div>
      </div>`;
  }

  function renderUsersTab() {
    const { users } = metrics;
    const list = users.recent || [];

    return `
      <div class="admin-card">
        <div class="admin-card-head">
          <div>
            <h3>Registered Readers Directory</h3>
            <p>Recent accounts created on StyleVault with their bookmark and monitor activity.</p>
          </div>
          <span class="admin-badge muted">${users.total} Total Registered</span>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Reader</th>
                <th>Email Address</th>
                <th>Date Joined</th>
                <th>Monitors</th>
                <th>Bookmarks</th>
              </tr>
            </thead>
            <tbody>
              ${list.length ? list.map((u) => `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div class="admin-avatar">${esc((u.name || u.email).slice(0, 2).toUpperCase())}</div>
                      <strong>${esc(u.name || 'Anonymous Reader')}</strong>
                    </div>
                  </td>
                  <td><span class="admin-email">${esc(u.email)}</span></td>
                  <td>${formatTimestamp(u.created_at)}</td>
                  <td><span class="admin-badge ${u.monitor_count > 0 ? 'accent' : 'muted'}">${u.monitor_count} active</span></td>
                  <td><span class="admin-badge ${u.saved_count > 0 ? 'positive' : 'muted'}">${u.saved_count} saved</span></td>
                </tr>
              `).join('') : '<tr><td colspan="5" class="muted text-center">No registered accounts found.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function renderSourcesTab() {
    const { content, collector } = metrics;
    const top = content.topSources || [];

    return `
      <div class="admin-card">
        <div class="admin-card-head">
          <div>
            <h3>Active African Newsrooms (${top.length} Top Contributors)</h3>
            <p>News publications, state wire agencies, and research publishers indexed in StyleVault.</p>
          </div>
          <a class="btn btn-outline btn-sm" href="/sources" target="_blank">View Public Directory ${icon('arrow-right')}</a>
        </div>

        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Publication Name</th>
                <th>Country</th>
                <th>Articles Held</th>
                <th>Health Status</th>
                <th>Last Success</th>
              </tr>
            </thead>
            <tbody>
              ${top.map((s) => `
                <tr>
                  <td><strong>${esc(s.name)}</strong></td>
                  <td>${s.country_code ? `${flag(s.country_code)} ${s.country_code}` : 'Pan-Africa'}</td>
                  <td><strong>${nf(s.total_articles)}</strong></td>
                  <td>
                    ${s.consecutive_failures > 0
                      ? `<span class="admin-badge negative">${s.consecutive_failures} failures</span>`
                      : `<span class="admin-badge positive">Healthy</span>`}
                  </td>
                  <td>${formatTimestamp(s.last_success_at)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function renderDistributionTab() {
    const { content } = metrics;
    const countries = content.topCountries || [];
    const topics = content.topTopics || [];

    return `
      <div class="admin-grid-2">
        <div class="admin-card">
          <div class="admin-card-head">
            <div>
              <h3>Most Followed Countries</h3>
              <p>The countries readers follow most often in their personal feeds.</p>
            </div>
          </div>
          <div class="admin-chip-list">
            ${countries.length ? countries.map((c) => {
              const countryObj = store.countryByCode.get(c.code);
              return `
                <div class="admin-stat-pill">
                  <span class="stat-flag">${flag(c.code, 'flag', '')}</span>
                  <span class="stat-name">${esc(countryObj?.name || c.code)}</span>
                  <span class="stat-count">${c.count} readers</span>
                </div>`;
            }).join('') : '<p class="muted">No followed countries recorded yet.</p>'}
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-head">
            <div>
              <h3>Most Followed Topics</h3>
              <p>Top business and industry sectors followed across Africa.</p>
            </div>
          </div>
          <div class="admin-chip-list">
            ${topics.length ? topics.map((t) => {
              const topicObj = store.topicBySlug.get(t.slug);
              return `
                <div class="admin-stat-pill">
                  <span class="stat-icon">📌</span>
                  <span class="stat-name">${esc(topicObj?.name || t.slug)}</span>
                  <span class="stat-count">${t.count} readers</span>
                </div>`;
            }).join('') : '<p class="muted">No followed topics recorded yet.</p>'}
          </div>
        </div>
      </div>`;
  function renderPublishTab() {
    const allCountries = store.meta.countries || [];
    const allTopics = store.meta.topics || [];

    return `
      <div class="admin-card">
        <div class="admin-card-head-row">
          <div>
            <h3>Publish News Story &amp; Media</h3>
            <p>Directly publish verified reports, breaking news, and editorial analysis to StyleVault.</p>
          </div>
          <span class="admin-pill"><span class="live-dot-sm"></span> Instant Publishing</span>
        </div>

        <form class="admin-form-grid" data-publish-form>
          <div class="admin-form-group admin-form-full">
            <label for="adm-news-title">Story Headline *</label>
            <input type="text" id="adm-news-title" data-input-news-title placeholder="e.g. AfCFTA Launches Pan-African Digital Payments System" value="${esc(newsTitle)}" required>
          </div>

          <div class="admin-form-group admin-form-full">
            <label for="adm-news-summary">Teaser / Summary</label>
            <textarea id="adm-news-summary" data-input-news-summary rows="3" placeholder="Brief 2-3 sentence overview of the news or finding...">${esc(newsSummary)}</textarea>
          </div>

          <div class="admin-form-group">
            <label for="adm-news-source">Newsroom / Publisher Name</label>
            <input type="text" id="adm-news-source" data-input-news-source placeholder="e.g. StyleVault Editorial" value="${esc(newsSource)}">
          </div>

          <div class="admin-form-group">
            <label for="adm-news-kind">Content Classification</label>
            <select id="adm-news-kind" data-input-news-kind>
              <option value="news" ${newsKind === 'news' ? 'selected' : ''}>News Report</option>
              <option value="analysis" ${newsKind === 'analysis' ? 'selected' : ''}>Market Analysis</option>
              <option value="research" ${newsKind === 'research' ? 'selected' : ''}>Research / Policy Paper</option>
              <option value="official" ${newsKind === 'official' ? 'selected' : ''}>Official Communiqué</option>
            </select>
          </div>

          <div class="admin-form-group admin-form-full">
            <label for="adm-news-url">Original Source Link (Optional)</label>
            <input type="url" id="adm-news-url" data-input-news-url placeholder="https://... (leave blank for StyleVault story)" value="${esc(newsUrl)}">
          </div>

          <div class="admin-form-group admin-form-full">
            <label>Upload Image / Creative Media</label>
            <div class="admin-img-upload-box">
              ${newsImageUrl ? `
                <img src="${esc(newsImageUrl)}" alt="Preview" class="admin-img-preview-thumb">
                <button type="button" class="btn btn-outline btn-sm" data-remove-news-img>Remove Image</button>
              ` : `
                <p><strong>Upload an image from your device</strong> or paste an image URL below.</p>
                <input type="file" accept="image/*" data-upload-news-file style="max-width:320px">
              `}
              <div style="width:100%;max-width:480px;margin-top:6px">
                <input type="url" data-input-news-img-url placeholder="Or paste image URL (https://...)" value="${esc(newsImageUrl.startsWith('data:') ? '' : newsImageUrl)}">
              </div>
            </div>
          </div>

          <div class="admin-form-group admin-form-full">
            <label>Tagged Countries (${newsCountries.size} selected)</label>
            <div class="admin-pill-selector">
              ${allCountries.map((c) => `
                <button type="button" class="admin-select-pill ${newsCountries.has(c.code) ? 'active' : ''}" data-toggle-country="${c.code}">
                  ${flag(c.code)} ${esc(c.name)}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="admin-form-group admin-form-full">
            <label>Strategic Topics (${newsTopics.size} selected)</label>
            <div class="admin-pill-selector">
              ${allTopics.map((t) => `
                <button type="button" class="admin-select-pill ${newsTopics.has(t.slug) ? 'active' : ''}" data-toggle-topic="${t.slug}">
                  ${esc(t.name)}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Live Card Preview -->
          <div class="admin-form-full admin-ad-preview-panel">
            <h4>Live Reader Card Preview</h4>
            <article class="news-row ${newsImageUrl ? 'has-thumb' : ''}" style="border:1px solid var(--line);border-radius:12px;padding:16px;background:#faf6fc">
              <div class="news-content">
                <div class="news-meta">
                  <span class="news-source">${esc(newsSource || 'StyleVault Editorial')}</span>
                  <span class="dot-sep"></span>
                  <time class="news-time">Just now</time>
                  <span class="tag kind-${newsKind}">${newsKind.toUpperCase()}</span>
                </div>
                <h3 class="news-title">
                  <a href="#">${esc(newsTitle || 'Your Headline Will Appear Here')}</a>
                </h3>
                <p class="news-summary">${esc(newsSummary || 'Your article summary or teaser copy will be presented here to readers across StyleVault news feeds.')}</p>
              </div>
              ${newsImageUrl ? `
                <div class="news-thumb">
                  <img src="${esc(newsImageUrl)}" alt="Thumb">
                </div>` : ''}
            </article>
          </div>

          <div class="admin-form-full" style="margin-top:16px;display:flex;gap:12px;justify-content:flex-end">
            <button type="submit" class="btn btn-plum" ${isPublishing ? 'disabled' : ''}>
              ${icon('sparkles')} <span>${isPublishing ? 'Publishing…' : 'Publish Story to StyleVault'}</span>
            </button>
          </div>
        </form>
      </div>
    `;
  }

  function renderAdsTab() {
    const totalCount = adsList.length;
    const activeCount = adsList.filter((a) => a.active).length;
    const totalImps = adsList.reduce((acc, a) => acc + (a.impressions || 0), 0);
    const totalClicks = adsList.reduce((acc, a) => acc + (a.clicks || 0), 0);
    const overallCtr = totalImps > 0 ? ((totalClicks / totalImps) * 100).toFixed(1) + '%' : '0.0%';

    return `
      <!-- Stats Summary -->
      <div class="admin-kpi-grid">
        <div class="admin-kpi-card">
          <div class="kpi-head"><span class="kpi-lbl">Total Ad Campaigns</span><span class="kpi-icon">📢</span></div>
          <div class="kpi-value">${totalCount} <span style="font-size:0.85rem;font-weight:400;color:var(--muted)">(${activeCount} active)</span></div>
        </div>
        <div class="admin-kpi-card">
          <div class="kpi-head"><span class="kpi-lbl">Ad Impressions</span><span class="kpi-icon">👁️</span></div>
          <div class="kpi-value">${nf(totalImps)}</div>
        </div>
        <div class="admin-kpi-card">
          <div class="kpi-head"><span class="kpi-lbl">Total Clicks</span><span class="kpi-icon">🖱️</span></div>
          <div class="kpi-value">${nf(totalClicks)}</div>
        </div>
        <div class="admin-kpi-card">
          <div class="kpi-head"><span class="kpi-lbl">Average CTR</span><span class="kpi-icon">📈</span></div>
          <div class="kpi-value">${overallCtr}</div>
        </div>
      </div>

      <!-- Create New Ad Section -->
      <div class="admin-card" style="margin-top:24px">
        <div class="admin-card-head-row">
          <div>
            <h3>Create New Manual Ad</h3>
            <p>Launch Banner strips, Native in-feed cards, or Interstitial takeovers across diverse pages.</p>
          </div>
          <span class="admin-pill muted">Monetization Engine</span>
        </div>

        <form class="admin-form-grid" data-ad-form>
          <div class="admin-form-group">
            <label for="adm-ad-type">Ad Format *</label>
            <select id="adm-ad-type" data-input-ad-type>
              <option value="banner" ${adType === 'banner' ? 'selected' : ''}>Banner Strip (Top &amp; In-page)</option>
              <option value="native" ${adType === 'native' ? 'selected' : ''}>Native Card (In-feed sponsored story)</option>
              <option value="interstitial" ${adType === 'interstitial' ? 'selected' : ''}>Interstitial Modal (Session takeover)</option>
            </select>
          </div>

          <div class="admin-form-group">
            <label for="adm-ad-placement">Target Placement</label>
            <select id="adm-ad-placement" data-input-ad-placement>
              <option value="all" ${adPlacement === 'all' ? 'selected' : ''}>All Diverse Pages</option>
              <option value="home" ${adPlacement === 'home' ? 'selected' : ''}>Home Page Only</option>
              <option value="news" ${adPlacement === 'news' ? 'selected' : ''}>News Wire Feed Only</option>
              <option value="countries" ${adPlacement === 'countries' ? 'selected' : ''}>Countries Section</option>
              <option value="topics" ${adPlacement === 'topics' ? 'selected' : ''}>Strategic Topics</option>
              <option value="directory" ${adPlacement === 'directory' ? 'selected' : ''}>Directory / Explore</option>
            </select>
          </div>

          <div class="admin-form-group">
            <label for="adm-ad-sponsor">Sponsor / Advertiser Name *</label>
            <input type="text" id="adm-ad-sponsor" data-input-ad-sponsor placeholder="e.g. Ria's Colony, Safaricom, AfDB" value="${esc(adSponsor)}" required>
          </div>

          <div class="admin-form-group">
            <label for="adm-ad-title">Ad Headline / Tagline *</label>
            <input type="text" id="adm-ad-title" data-input-ad-title placeholder="e.g. Pan-African Business Summit 2026" value="${esc(adTitle)}" required>
          </div>

          <div class="admin-form-group admin-form-full">
            <label for="adm-ad-body">Ad Copy / Pitch Description</label>
            <textarea id="adm-ad-body" data-input-ad-body rows="2" placeholder="Brief compelling sentence for readers...">${esc(adBody)}</textarea>
          </div>

          <div class="admin-form-group">
            <label for="adm-ad-link">Destination Link URL *</label>
            <input type="url" id="adm-ad-link" data-input-ad-link placeholder="https://example.com/promo" value="${esc(adLinkUrl)}" required>
          </div>

          <div class="admin-form-group">
            <label for="adm-ad-cta">Call to Action (CTA) Button</label>
            <input type="text" id="adm-ad-cta" data-input-ad-cta placeholder="e.g. Learn More, Register Now, Explore" value="${esc(adCtaText)}">
          </div>

          <div class="admin-form-group admin-form-full">
            <label>Ad Creative / Banner Image</label>
            <div class="admin-img-upload-box">
              ${adImageUrl ? `
                <img src="${esc(adImageUrl)}" alt="Ad Preview" class="admin-img-preview-thumb">
                <button type="button" class="btn btn-outline btn-sm" data-remove-ad-img>Remove Image</button>
              ` : `
                <p><strong>Upload creative banner/logo</strong> or paste an image URL:</p>
                <input type="file" accept="image/*" data-upload-ad-file style="max-width:320px">
              `}
              <div style="width:100%;max-width:480px;margin-top:6px">
                <input type="url" data-input-ad-img-url placeholder="Or paste image URL (https://...)" value="${esc(adImageUrl.startsWith('data:') ? '' : adImageUrl)}">
              </div>
            </div>
          </div>

          <div class="admin-form-full" style="display:flex;align-items:center;gap:8px">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
              <input type="checkbox" data-input-ad-active ${adActive ? 'checked' : ''}>
              <span>Launch this ad campaign as <strong>Active immediately</strong></span>
            </label>
          </div>

          <!-- Live Interactive Ad Preview -->
          <div class="admin-form-full admin-ad-preview-panel">
            <h4>Live Preview: ${adType.toUpperCase()} AD</h4>
            ${renderAdPreviewHtml({ type: adType, title: adTitle || 'Headline Appears Here', sponsor: adSponsor || 'Sponsor Name', body: adBody || 'Your promotional copy and message will show here.', imageUrl: adImageUrl, linkUrl: adLinkUrl || '#', ctaText: adCtaText || 'Learn More' })}
          </div>

          <div class="admin-form-full" style="margin-top:16px;display:flex;gap:12px;justify-content:flex-end">
            <button type="submit" class="btn btn-plum" ${isSavingAd ? 'disabled' : ''}>
              ${icon('sparkles')} <span>${isSavingAd ? 'Saving Campaign…' : 'Save &amp; Launch Ad'}</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Existing Ads Table -->
      <div class="admin-card" style="margin-top:24px">
        <div class="admin-card-head-row">
          <div>
            <h3>All Created Ads (${adsList.length})</h3>
            <p>Manage active campaigns, pause ads, and review CTR analytics.</p>
          </div>
          <button type="button" class="btn btn-outline btn-sm" data-refresh-ads>Refresh Ads</button>
        </div>

        ${adsLoading ? `
          <div class="admin-loading"><span class="live-dot-sm"></span> Loading ads…</div>
        ` : !adsList.length ? `
          <div class="empty"><div class="ic">${icon('layers')}</div><h3>No ads created yet</h3><p>Create your first banner, native, or interstitial campaign above.</p></div>
        ` : `
          <div class="admin-ads-table-wrap">
            ${adsList.map((ad) => `
              <div class="admin-ad-card-item">
                ${ad.imageUrl ? `<img src="${esc(ad.imageUrl)}" alt="" class="sv-ad-banner-thumb">` : `<div style="width:44px;height:44px;border-radius:8px;background:#faf6fc;border:1px solid var(--line);display:grid;place-items:center;font-weight:700;color:var(--plum)">${ad.type[0].toUpperCase()}</div>`}
                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                    <span class="sv-ad-badge">${ad.type.toUpperCase()}</span>
                    <span class="tag">${esc(ad.placement.toUpperCase())}</span>
                    <span class="kpi-badge ${ad.active ? 'positive' : 'muted'}">${ad.active ? 'ACTIVE' : 'PAUSED'}</span>
                  </div>
                  <strong style="display:block;font-size:0.95rem;color:var(--deep)">${esc(ad.title)}</strong>
                  <span style="font-size:0.80rem;color:var(--muted)">Sponsor: <strong>${esc(ad.sponsor)}</strong> &bull; <a href="${esc(ad.linkUrl)}" target="_blank" style="color:var(--plum);text-decoration:underline">${esc(ad.linkUrl)}</a></span>
                </div>
                <div style="text-align:right;flex:none">
                  <div style="font-weight:700;font-size:0.90rem">${nf(ad.impressions)} imps &bull; ${nf(ad.clicks)} clicks</div>
                  <div style="font-size:0.80rem;color:var(--muted)">CTR: <strong style="color:var(--deep)">${ad.ctr}</strong></div>
                </div>
                <div style="display:flex;gap:8px;flex:none">
                  <button type="button" class="btn btn-sm ${ad.active ? 'btn-outline' : 'btn-plum'}" data-toggle-ad="${esc(ad.id)}">
                    ${ad.active ? 'Pause' : 'Activate'}
                  </button>
                  <button type="button" class="btn btn-outline btn-sm" data-delete-ad="${esc(ad.id)}" style="color:#b8405a" title="Delete ad">
                    Delete
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }

  function renderAdPreviewHtml(ad) {
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
            <div class="news-meta">
              <span class="sv-ad-badge">${icon('sparkles')} Sponsored · ${esc(ad.sponsor)}</span>
            </div>
            <h3 class="news-title"><a>${esc(ad.title)}</a></h3>
            ${ad.body ? `<p class="news-summary">${esc(ad.body)}</p>` : ''}
            <div class="news-foot">
              <span class="sv-ad-cta-link">${esc(ad.ctaText)} ↗</span>
            </div>
          </div>
          ${ad.imageUrl ? `<div class="news-thumb sv-ad-thumb"><img src="${esc(ad.imageUrl)}" alt=""></div>` : ''}
        </div>`;
    }
    // Interstitial
    return `
      <div style="background:#faf6fc;border:1px solid var(--line);border-radius:16px;max-width:440px;margin:0 auto;overflow:hidden">
        ${ad.imageUrl ? `<div style="height:140px;overflow:hidden"><img src="${esc(ad.imageUrl)}" style="width:100%;height:100%;object-fit:cover"></div>` : ''}
        <div style="padding:16px 20px">
          <span class="sv-ad-interstitial-kicker">Sponsored Message · ${esc(ad.sponsor)}</span>
          <h3 style="font-size:1.15rem;font-weight:700;color:var(--deep);margin-block:6px 8px">${esc(ad.title)}</h3>
          <p style="font-size:0.85rem;color:var(--ink-2);margin-bottom:14px">${esc(ad.body)}</p>
          <div style="display:flex;gap:8px">
            <span class="btn btn-plum btn-sm" style="flex:1;text-align:center">${esc(ad.ctaText)} ↗</span>
            <span class="btn btn-outline btn-sm">Close</span>
          </div>
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

    // Toggle country pill in news publish form
    const countryBtn = e.target.closest('[data-toggle-country]');
    if (countryBtn) {
      const code = countryBtn.dataset.toggleCountry;
      if (newsCountries.has(code)) newsCountries.delete(code);
      else newsCountries.add(code);
      render();
      return;
    }

    // Toggle topic pill in news publish form
    const topicBtn = e.target.closest('[data-toggle-topic]');
    if (topicBtn) {
      const slug = topicBtn.dataset.toggleTopic;
      if (newsTopics.has(slug)) newsTopics.delete(slug);
      else newsTopics.add(slug);
      render();
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
    if (e.target.matches('[data-input-news-title]')) {
      newsTitle = e.target.value;
      const previewTitle = main.querySelector('.admin-ad-preview-panel .news-title a');
      if (previewTitle) previewTitle.textContent = newsTitle || 'Your Headline Will Appear Here';
    } else if (e.target.matches('[data-input-news-summary]')) {
      newsSummary = e.target.value;
      const previewSummary = main.querySelector('.admin-ad-preview-panel .news-summary');
      if (previewSummary) previewSummary.textContent = newsSummary || 'Your article summary or teaser copy will be presented here to readers across StyleVault news feeds.';
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
    } else if (e.target.matches('[data-input-ad-placement]')) {
      adPlacement = e.target.value;
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
      if (!newsTitle.trim()) return toast('Please enter a headline', 'error');
      isPublishing = true;
      render();
      try {
        await api.adminPublishArticle(adminKey, {
          title: newsTitle.trim(),
          summary: newsSummary.trim(),
          sourceName: newsSource.trim() || 'StyleVault Editorial',
          url: newsUrl.trim() || undefined,
          imageUrl: newsImageUrl.trim() || undefined,
          kind: newsKind,
          countries: [...newsCountries],
          topics: [...newsTopics],
        });
        toast('News story published successfully to StyleVault!', 'ok');
        newsTitle = '';
        newsSummary = '';
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
      if (!adLinkUrl.trim() || !/^https?:\/\//i.test(adLinkUrl.trim())) {
        return toast('Valid destination link URL (https://...) is required', 'error');
      }
      isSavingAd = true;
      render();
      try {
        await api.adminCreateAd(adminKey, {
          type: adType,
          title: adTitle.trim(),
          sponsor: adSponsor.trim(),
          body: adBody.trim() || undefined,
          linkUrl: adLinkUrl.trim(),
          ctaText: adCtaText.trim() || 'Learn More',
          imageUrl: adImageUrl.trim() || undefined,
          placement: adPlacement,
          active: adActive,
        });
        toast('Ad campaign launched successfully!', 'ok');
        adTitle = '';
        adSponsor = '';
        adBody = '';
        adLinkUrl = '';
        adImageUrl = '';
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
