import { api } from '../api.js';
import { $, $$, esc, flag, icon, nf, timeAgo, today } from '../lib.js';
import { store } from '../store.js';
import { REGION_COLORS, REGION_NAMES, monitorEditor, mountFeed, storyCard, topCard } from '../ui.js';

export default async function home(main, { setTitle }) {
  setTitle('');
  const { stats, topics, countries } = store.meta;
  const busiest = [...countries].sort((a, b) => b.recent - a.recent).slice(0, 8);
  const regionCounts = Object.keys(REGION_NAMES).map((r) => ({
    region: r,
    countries: countries.filter((c) => c.region === r).length,
    stories: countries.filter((c) => c.region === r).reduce((s, c) => s + c.recent, 0),
  }));

  main.innerHTML = `
    <section class="hero">
      <div class="hero-date"><span><span class="live-dot"></span>${esc(today())}</span>
        ${stats.lastCollectedAt ? `<span>Updated ${timeAgo(stats.lastCollectedAt)}</span>` : ''}</div>
      <h1>Africa, in its <em>own style.</em></h1>
      <p>How the continent does business, governs, creates, travels and plays, gathered hourly from newsrooms across all 54 countries.</p>
      <div class="hero-stats">
        <div class="hero-stat"><strong>54</strong><span>countries</span></div>
        <div class="hero-stat"><strong>${nf(stats.sources)}</strong><span>African newsrooms</span></div>
        <div class="hero-stat"><strong>${nf(stats.articles)}</strong><span>stories collected</span></div>
      </div>
    </section>

    <div class="layout">
      <div>
        <div data-monitor-strip></div>

        <section class="section" data-top hidden>
          <div class="section-head">
            <div><span class="eyebrow">Top stories</span><h2>What Africa is talking about</h2>
              <p>Stories reported by more than one newsroom in the last 24 hours.</p></div>
          </div>
          <div class="top-grid" data-top-grid></div>
        </section>

        <section class="section">
          <div class="section-head">
            <div><span class="eyebrow">Latest</span><h2>Across the continent</h2></div>
          </div>
          <div class="chips" role="toolbar" aria-label="Filter by topic" data-topic-chips>
            <button class="chip" type="button" aria-pressed="true" data-topic="">All stories</button>
            ${topics.map((t) => `<button class="chip" type="button" aria-pressed="false" data-topic="${t.slug}"><span class="dot" style="--c:${t.color}"></span>${esc(t.name)}</button>`).join('')}
          </div>
          <div style="margin-top:14px" data-feed></div>
        </section>
      </div>

      <aside class="sidebar">
        <div class="panel" data-side-monitor></div>
        <div class="panel">
          <h3>Busiest this week</h3>
          <div class="chips" style="flex-wrap:wrap">
            ${busiest.map((c) => `<a class="chip" href="/country/${c.slug}">${flag(c.code)} ${esc(c.name)} <span class="n">${nf(c.recent)}</span></a>`).join('')}
          </div>
        </div>
        <div class="panel">
          <h3>By region</h3>
          <div class="region-strip" style="grid-template-columns:1fr 1fr">
            ${regionCounts.map((r) => `<a class="region-tile" href="/countries?region=${r.region}" style="--c:${REGION_COLORS[r.region]}"><strong>${REGION_NAMES[r.region].replace(' Africa', '')}</strong><span>${r.countries} countries · ${nf(r.stories)} this week</span></a>`).join('')}
          </div>
        </div>
        <div class="panel">
          <h3>Straight from the source</h3>
          <p>We show the headline, the publisher and a short teaser, then send you to the newsroom that reported it. <a class="link-more" href="/about">How it works ${icon('arrow-right')}</a></p>
        </div>
      </aside>
    </div>`;

  // Personal strip & sidebar panel
  const renderPersonal = () => {
    const side = $('[data-side-monitor]', main);
    if (!side) return;
    if (store.monitors.length) {
      side.innerHTML = `<h3>Your monitor</h3>
        <div class="chips" style="flex-wrap:wrap">${store.monitors.slice(0, 8).map((m) => `<a class="chip" href="/monitor?m=${encodeURIComponent(m.id)}">${icon('radar')} ${esc(m.name)}</a>`).join('')}</div>
        <a class="link-more" style="margin-top:12px" href="/monitor">Open My Monitor ${icon('arrow-right')}</a>`;
    } else {
      side.innerHTML = `<h3>Follow what matters to you</h3>
        <p>Track a market, an industry or a whole region. Pick countries, topics and keywords, and your stories come to you.</p>
        <button class="btn btn-primary btn-sm" style="margin-top:14px" type="button" data-new-monitor>${icon('plus')} Create a monitor</button>`;
    }
  };
  renderPersonal();
  const off = store.on(renderPersonal);
  main.addEventListener('click', async (e) => {
    if (e.target.closest('[data-new-monitor]')) await monitorEditor();
  });

  // First monitor preview
  if (store.monitors.length) {
    const m = store.monitors[0];
    api.articles({ country: m.countries, topic: m.topics, keywords: m.keywords, limit: 3 }).then(({ items }) => {
      const strip = $('[data-monitor-strip]', main);
      if (!items.length || !strip) return;
      strip.innerHTML = `<section class="section"><div class="section-head"><div><span class="eyebrow">Your monitor</span><h2>${esc(m.name)}</h2></div>
        <a class="link-more" href="/monitor?m=${encodeURIComponent(m.id)}">See all ${icon('arrow-right')}</a></div>
        <div class="feed">${items.map(storyCard).join('')}</div></section>`;
    }).catch(() => {});
  }

  // Top stories
  api.topStories().then(({ items }) => {
    if (!items.length) return;
    const section = $('[data-top]', main);
    if (!section) return;
    section.hidden = false;
    $('[data-top-grid]', main).innerHTML = items.slice(0, 4).map((a, i) => topCard(a, i === 0)).join('');
  }).catch(() => {});

  // Latest feed with topic filter
  const feed = $('[data-feed]', main);
  let topic = '';
  const loadFeed = () => mountFeed(feed, (before) => api.articles({ topic, before }));
  loadFeed();
  $('[data-topic-chips]', main).addEventListener('click', (e) => {
    const chip = e.target.closest('[data-topic]');
    if (!chip) return;
    $$('[data-topic]', main).forEach((c) => c.setAttribute('aria-pressed', c === chip));
    topic = chip.dataset.topic;
    loadFeed();
  });

  return off;
}
