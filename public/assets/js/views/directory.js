import { $, $$, esc, flag, icon } from '../lib.js';
import { store } from '../store.js';

export default function directoryView(main, { setTitle }) {
  setTitle('Directory · Countries & Topics');

  const POPULAR_COUNTRIES = [
    { code: 'NG', name: 'Nigeria' },
    { code: 'KE', name: 'Kenya' },
    { code: 'ZA', name: 'South Africa' },
    { code: 'GH', name: 'Ghana' },
    { code: 'EG', name: 'Egypt' },
    { code: 'RW', name: 'Rwanda' },
    { code: 'MA', name: 'Morocco' },
    { code: 'ET', name: 'Ethiopia' },
    { code: 'TZ', name: 'Tanzania' },
    { code: 'SN', name: 'Senegal' },
    { code: 'CI', name: 'Côte d’Ivoire' },
  ];

  const POPULAR_TOPICS = [
    { slug: 'trade', name: 'Trade & AfCFTA', icon: '🚢' },
    { slug: 'business', name: 'Business & Banking', icon: '💼' },
    { slug: 'energy', name: 'Energy & Power', icon: '⚡' },
    { slug: 'technology', name: 'Technology & AI', icon: '📱' },
    { slug: 'agriculture', name: 'Farming & Food', icon: '🌾' },
    { slug: 'mining', name: 'Mining & Minerals', icon: '⛏️' },
    { slug: 'climate', name: 'Climate & Green Energy', icon: '🌱' },
    { slug: 'tourism', name: 'Travel & Tourism', icon: '✈️' },
  ];

  main.innerHTML = `
    <section class="dir-hero">
      <div class="wrap">
        <span class="eyebrow accent" style="color:rgba(255,255,255,0.85)">StyleVault Directory</span>
        <h1>Browse Africa by Country or Topic</h1>
        <p>Access deep country files with 15 years of World Bank figures, or follow strategic industry sectors spanning trade, energy, tech, and finance across all 54 nations.</p>
      </div>
    </section>

    <div class="dir-body">
      <div class="wrap dir-wrap">
        <div class="dir-grid">

          <!-- Division 1: Countries -->
          <article class="dir-division-card">
            <div class="dir-card-header">
              <div class="dir-emblem">🌍</div>
              <div class="dir-card-title-group">
                <span class="eyebrow">Geographic Division</span>
                <h2>African Countries</h2>
              </div>
            </div>
            <p class="dir-desc">
              Explore individual country files for all 54 African nations. Every country features verified World Bank indicators, local newsrooms, capital profiles, and economic overviews.
            </p>
            <div class="dir-badges">
              <span class="dir-badge">54 Country Files</span>
              <span class="dir-badge">5 Geographic Regions</span>
              <span class="dir-badge">15 Yrs Indicators</span>
            </div>

            <div class="dir-sample-section">
              <span class="dir-sample-lbl">Popular country profiles:</span>
              <div class="dir-sample-chips">
                ${POPULAR_COUNTRIES.map((c) => `
                  <a href="/country/${store.countryByCode.get(c.code)?.slug || c.code.toLowerCase()}" class="dir-chip">
                    ${flag(c.code, 'flag', '')} <span>${esc(c.name)}</span>
                  </a>
                `).join('')}
              </div>
            </div>

            <div class="dir-card-action">
              <a href="/countries" class="btn btn-plum dir-btn">
                <span>Browse All 54 Countries</span>
                ${icon('arrow-right')}
              </a>
            </div>
          </article>

          <!-- Division 2: Topics -->
          <article class="dir-division-card">
            <div class="dir-card-header">
              <div class="dir-emblem">📌</div>
              <div class="dir-card-title-group">
                <span class="eyebrow">Sectoral Division</span>
                <h2>Strategic Topics</h2>
              </div>
            </div>
            <p class="dir-desc">
              Follow subjects as they unfold across the continent. Track cross-border commerce under AfCFTA, renewable power grids, mineral supply chains, mobile banking, and agriculture.
            </p>
            <div class="dir-badges">
              <span class="dir-badge">13 Strategic Sectors</span>
              <span class="dir-badge">Pan-African Scope</span>
              <span class="dir-badge">1-Tap Follow</span>
            </div>

            <div class="dir-sample-section">
              <span class="dir-sample-lbl">Strategic beats to follow:</span>
              <div class="dir-sample-chips">
                ${POPULAR_TOPICS.map((t) => `
                  <a href="/topic/${t.slug}" class="dir-chip">
                    <span>${t.icon}</span> <span>${esc(t.name)}</span>
                  </a>
                `).join('')}
              </div>
            </div>

            <div class="dir-card-action">
              <a href="/topics" class="btn btn-plum dir-btn">
                <span>Browse All 13 Topics</span>
                ${icon('arrow-right')}
              </a>
            </div>
          </article>

        </div>
      </div>
    </div>`;
}
