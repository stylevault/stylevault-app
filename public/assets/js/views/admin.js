import { api } from '../api.js';
import { $, $$, esc, flag, formatRelativeDate, icon, nf } from '../lib.js';
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
  }

  // Event handlers
  main.addEventListener('click', async (e) => {
    // Tab switching
    const tabBtn = e.target.closest('[data-tab]');
    if (tabBtn) {
      activeTab = tabBtn.dataset.tab;
      render();
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

  loadData();
}
