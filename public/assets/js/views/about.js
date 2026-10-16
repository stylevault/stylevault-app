import { icon, nf } from '../lib.js';
import { store } from '../store.js';

export default function about(main, { setTitle }) {
  setTitle('About');
  const { stats } = store.meta || { stats: { sources: 150 } };
  const sourceCount = stats?.sources || 150;

  main.innerHTML = `
    <article class="ab-page">
      <!-- Hero Header -->
      <header class="ab-hero">
        <div class="wrap ab-hero-wrap">
          <span class="ab-badge">
            <img src="/assets/img/stylevault-mark.png" alt="" width="16" height="16" style="display:block;object-fit:contain">
            <span>About Style Vault</span>
          </span>
          <h1>Understand Africa, one country at a time</h1>
          <p class="ab-hero-lede">Style Vault is the intelligence and learning platform of Ria’s Colony, created to make Africa easier to understand, explore, navigate and do business across.</p>

          <div class="ab-quick-links">
            <a href="/sources" class="ab-quick-chip">${icon('book')} Sources &amp; methods ↗</a>
            <a href="/privacy" class="ab-quick-chip">${icon('shield')} Privacy Policy ↗</a>
          </div>
          
          <div class="ab-stats-grid">
            <div class="ab-stat-card">
              <strong>54</strong>
              <span>African countries covered with unified profiles</span>
            </div>
            <div class="ab-stat-card">
              <strong>15+ Yrs</strong>
              <span>World Bank indicator trends with full citation</span>
            </div>
            <div class="ab-stat-card">
              <strong>${nf(sourceCount)}+</strong>
              <span>Independent newsrooms, think tanks and research bodies</span>
            </div>
            <div class="ab-stat-card">
              <strong>100%</strong>
              <span>Direct publisher attribution with zero AI rewriting</span>
            </div>
          </div>
        </div>
      </header>

      <div class="wrap">
        <!-- The Purpose & Origin -->
        <section class="ab-section">
          <div class="ab-story-grid">
            <div class="ab-card">
              <div class="ab-card-icon">${icon('map')}</div>
              <h3>The Pan-African Knowledge Gap</h3>
              <p>Africa is home to 54 sovereign nations, over 1.4 billion people, and thousands of distinct languages and trade ecosystems. Yet people across the continent often know surprisingly little about their neighbours. Investors, diaspora travelers, researchers, and students routinely have to piece together information from dozens of outdated websites, paywalls, and fragmented portals. Style Vault unifies the dependable parts in one clean, reliable reference vault.</p>
            </div>

            <div class="ab-card">
              <div class="ab-card-icon">${icon('compass')}</div>
              <h3>Why We Call It Style</h3>
              <p><strong>Style</strong> is the distinctive way something is done: a technique, a tradition, a manner of creating, building, and living. Every African country possesses its own unique style of governing, trading, innovating, and traveling. Style Vault is where this collective knowledge is preserved, updated, and organized so anyone can navigate the continent with confidence and respect.</p>
            </div>
          </div>
        </section>

        <!-- What’s in Style Vault: 4 Key Pillars -->
        <section class="ab-section">
          <div class="ab-pillars-head">
            <h2>What’s in Style Vault</h2>
            <p>Every country file is curated to give you reliable context, verified numbers, and real-time news in seconds.</p>
          </div>

          <div class="ab-pillars-grid">
            <div class="ab-pillar-item">
              <div class="ab-pillar-top">
                <span class="tp-tile xs" aria-hidden="true">${icon('globe')}</span>
                <strong>54 Country Files</strong>
              </div>
              <p>Capitals, official and national languages, currencies, population baselines, and membership in regional trade blocs including ECOWAS, SADC, EAC, COMESA, and AMU.</p>
            </div>

            <div class="ab-pillar-item">
              <div class="ab-pillar-top">
                <span class="tp-tile xs" aria-hidden="true">${icon('chart')}</span>
                <strong>World Bank Macro &amp; Social Indicators</strong>
              </div>
              <p>Nine core indicators from GDP growth and urbanisation to electricity access and literacy, each displayed with up to 15 years of historical trajectory and official source citations.</p>
            </div>

            <div class="ab-pillar-item">
              <div class="ab-pillar-top">
                <span class="tp-tile xs" aria-hidden="true">${icon('book')}</span>
                <strong>Original Research &amp; Policy Papers</strong>
              </div>
              <p>In-depth publications and policy briefs from verified think tanks, university faculties, multilateral survey bodies, and African institutions.</p>
            </div>

            <div class="ab-pillar-item">
              <div class="ab-pillar-top">
                <span class="tp-tile xs" aria-hidden="true">${icon('layers')}</span>
                <strong>Practical Travel &amp; Mobility Intelligence</strong>
              </div>
              <p>Actionable travel intelligence including entry &amp; visa tracker, airport baggage contraband regulations, and our comprehensive Women’s Safety Score across all 54 African countries.</p>
            </div>
          </div>
        </section>

        <!-- Editorial Charter & Standards -->
        <section class="ab-section">
          <div class="ab-charter-box">
            <div class="ab-charter-head">
              <h2>Our Editorial Charter &amp; Trust Standards</h2>
              <p>We believe dependable African intelligence requires uncompromising transparency.</p>
            </div>

            <div class="ab-charter-list">
              <div class="ab-charter-item">
                <div class="chk">✓</div>
                <strong>Source &amp; Year Verification</strong>
                <p>Every statistic shows its originating institution and measurement year. If an indicator is older than recent cycles, we state it explicitly.</p>
              </div>

              <div class="ab-charter-item">
                <div class="chk">✓</div>
                <strong>Zero AI Rewriting</strong>
                <p>We direct readers straight to original publishers. We never scrape full text, summarise stories with synthetic AI, or obscure journalists’ bylines.</p>
              </div>

              <div class="ab-charter-item">
                <div class="chk">✓</div>
                <strong>Open Methodology</strong>
                <p>Our feed polling frequencies, automated tag algorithms, and source health checks are public. See our <a href="/sources">Sources &amp; methods</a> page.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Trust, Sources & Privacy -->
        <section class="ab-section">
          <div class="ab-pillars-head">
            <span class="eyebrow accent" style="justify-content:center;margin-bottom:8px">${icon('shield')} Open Standards &amp; Methods</span>
            <h2>Sources, Methodology &amp; Privacy</h2>
            <p>Style Vault operates with complete openness regarding how data is collected, attributed, and protected.</p>
          </div>

          <div class="ab-policy-grid">
            <div class="ab-policy-card">
              <div class="ab-policy-icon">${icon('book')}</div>
              <div class="ab-policy-body">
                <h3>Sources &amp; Methods</h3>
                <p>Explore our complete directory of ${nf(sourceCount)}+ vetted newsrooms and research bodies, hourly collection schedules, World Bank citation rules, and country tagging algorithms.</p>
                <div class="ab-policy-foot">
                  <a class="btn btn-outline btn-sm" href="/sources">${icon('book')} <span>Explore sources &amp; methods</span> ${icon('arrow-right')}</a>
                </div>
              </div>
            </div>

            <div class="ab-policy-card">
              <div class="ab-policy-icon">${icon('shield')}</div>
              <div class="ab-policy-body">
                <h3>Privacy Policy</h3>
                <p>Read our commitment to data minimization, zero advertising trackers, strong encryption, and giving you full ownership with instant one-click data erasure.</p>
                <div class="ab-policy-foot">
                  <a class="btn btn-outline btn-sm" href="/privacy">${icon('shield')} <span>Read privacy policy</span> ${icon('arrow-right')}</a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Ria’s Colony Banner -->
        <section class="ab-section">
          <div class="ab-colony-card">
            <div class="ab-colony-copy">
              <span class="colony-kicker">${icon('compass')} Ria’s Colony</span>
              <h3>For the life you are becoming</h3>
              <p>Style Vault is built and maintained by Ria’s Colony. We help individuals, founders, and teams travel, relocate, and work across Africa with local guides, warm introductions, and practical on-the-ground support.</p>
              <p style="margin-top:12px;font-size:0.86rem;opacity:0.92">Questions or feedback? Reach our support team at <a href="mailto:support@stylevault.app" style="color:#ffffff;text-decoration:underline;font-weight:600">support@stylevault.app</a></p>
            </div>
            <div class="ab-colony-btns">
              <a class="btn btn-white" href="/countries">Explore countries ${icon('arrow-right')}</a>
              <a class="btn btn-outline-light" href="/tools">Travel tools</a>
              <a class="btn btn-outline-light" href="https://riascolony.org" target="_blank" rel="noopener">Ria’s Colony ↗</a>
            </div>
          </div>
        </section>
      </div>
    </article>
  `;
}
