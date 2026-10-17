import { $, $$, esc, icon, nf } from '../lib.js';
import { store } from '../store.js';
import { toast } from '../ui.js';

export const TOPIC_BLURBS = {
  business: 'Markets, banks, enterprise and the money moving the continent.',
  politics: 'Elections, governments, parliaments and the institutions that run countries.',
  trade: 'AfCFTA, ports, corridors and the goods crossing borders.',
  technology: 'Fintech, telecoms, start-ups and Africa’s digital build-out.',
  agriculture: 'Farming, food prices, cocoa, coffee and food security.',
  education: 'Schools, universities, exams and the next generation.',
  tourism: 'Travel, visas, airlines, hotels and heritage.',
  style: 'Fashion, music, film, art and design: Africa’s creative signature.',
  energy: 'Power, oil and gas, renewables, mining and infrastructure.',
  health: 'Hospitals, outbreaks, medicines and public health.',
  climate: 'Weather, conservation, drought, floods and the green transition.',
  security: 'Conflict, peace efforts, policing and the courts.',
  sport: 'Football, athletics and the stars of African sport.',
};

export const TOPIC_ICONS = {
  business: '💼',
  politics: '🏛️',
  trade: '🚢',
  technology: '📱',
  agriculture: '🌾',
  education: '🎓',
  tourism: '✈️',
  style: '✨',
  energy: '⚡',
  health: '🏥',
  climate: '🌱',
  security: '🛡️',
  sport: '⚽',
};

export function topicCard(t) {
  const following = store.isFollowed('topic', t.slug);
  const iconChar = TOPIC_ICONS[t.slug] || '📌';
  const blurb = TOPIC_BLURBS[t.slug] || 'Latest news, research and analysis across all 54 African countries.';
  return `
    <article class="topic-card" data-topic-card data-name="${esc(t.name.toLowerCase())}" data-slug="${t.slug}">
      <div class="topic-card-head">
        <div class="topic-card-title-group">
          <span class="topic-card-icon" aria-hidden="true">${iconChar}</span>
          <h3><a href="/topic/${t.slug}">${esc(t.name)}</a></h3>
        </div>
        <button class="act follow-star ${following ? 'is-on' : ''}" type="button" data-follow-topic="${t.slug}"
          aria-pressed="${following}" aria-label="${following ? `Unfollow ${esc(t.name)}` : `Follow ${esc(t.name)}`}"
          title="${following ? 'Following' : 'Follow'}">
          ${icon(following ? 'star-fill' : 'star')}
        </button>
      </div>
      <p>${esc(blurb)}</p>
      <div class="topic-card-foot">
        <span class="topic-card-count">${nf(t.recent || 0)} pieces this week</span>
        <span class="topic-card-arrow">${icon('arrow-right')}</span>
      </div>
    </article>`;
}

export default function topics(main, { setTitle }) {
  setTitle('Strategic Topics');
  const allTopics = store.meta.topics || [];
  let filterQuery = '';

  main.innerHTML = `
    <section class="cl-hero">
      <div class="wrap">
        <span class="eyebrow accent" style="color:rgba(255,255,255,0.85)">Explore by Sector</span>
        <h1>Strategic topics across Africa</h1>
        <p>Follow a subject across all 54 countries at once: research, analysis and reporting, sorted the moment it arrives.</p>
      </div>
    </section>

    <div class="cl-body">
      <div class="wrap cl-page">
        <!-- Unified Hub Switcher (Countries vs Topics) -->
        <div class="explore-nav-wrap">
          <nav class="explore-nav" role="tablist" aria-label="Explore StyleVault">
            <a href="/countries" class="explore-tab" role="tab" aria-selected="false">
              <span class="explore-tab-icon">🌍</span>
              <span>African Countries</span>
              <span class="explore-tab-count">${store.meta.countries?.length || 54}</span>
            </a>
            <a href="/topics" class="explore-tab is-active" role="tab" aria-selected="true" aria-current="page">
              <span class="explore-tab-icon">📌</span>
              <span>Strategic Topics</span>
              <span class="explore-tab-count">${allTopics.length || 13}</span>
            </a>
          </nav>
        </div>

        <div class="cl-toolbar">
          <label class="cl-search">
            ${icon('search')}
            <input type="search" placeholder="Find a topic (e.g. Trade, Technology, Farming)…" aria-label="Find a topic" data-topic-search>
          </label>
          <div class="cl-meta-count">
            <span>Showing <strong data-topic-visible-count>${allTopics.length}</strong> of ${allTopics.length} topics</span>
          </div>
        </div>

        <div class="topic-grid" data-topic-grid>
          ${allTopics.map(topicCard).join('')}
        </div>

        <div class="empty" data-topic-empty hidden style="margin-top:30px">
          <div class="ic">${icon('search')}</div>
          <h3>No topics matched your search</h3>
          <p>Try searching for words like “Trade”, “Energy”, “Tech” or “Farming”.</p>
        </div>
      </div>
    </div>`;

  const searchInput = $('[data-topic-search]', main);
  const cards = $$('[data-topic-card]', main);
  const countEl = $('[data-topic-visible-count]', main);
  const emptyEl = $('[data-topic-empty]', main);

  const applyFilter = () => {
    const q = filterQuery.trim().toLowerCase();
    let visible = 0;
    cards.forEach((card) => {
      const name = card.dataset.name || '';
      const slug = card.dataset.slug || '';
      const blurb = (TOPIC_BLURBS[slug] || '').toLowerCase();
      const match = !q || name.includes(q) || blurb.includes(q);
      card.hidden = !match;
      if (match) visible++;
    });
    if (countEl) countEl.textContent = String(visible);
    if (emptyEl) emptyEl.hidden = visible > 0;
  };

  searchInput?.addEventListener('input', (e) => {
    filterQuery = e.target.value;
    applyFilter();
  });

  main.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-follow-topic]');
    if (!btn) return;
    e.stopPropagation();
    e.preventDefault();
    const slug = btn.dataset.followTopic;
    try {
      const on = await store.toggleFollow('topic', slug);
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
      btn.innerHTML = icon(on ? 'star-fill' : 'star');
      const topicObj = store.topicBySlug.get(slug);
      const name = topicObj?.name || slug;
      btn.setAttribute('aria-label', on ? `Unfollow ${name}` : `Follow ${name}`);
      btn.setAttribute('title', on ? 'Following' : 'Follow');
      toast(on ? `Following ${name}` : `Unfollowed ${name}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}
