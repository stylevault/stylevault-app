import { $, $$, esc, flag, formatIndicator, icon, nf } from '../lib.js';
import { store } from '../store.js';
import { REGION_NAMES, toast } from '../ui.js';
import { countryCard, handleFollow as handleCountryFollow } from './countries.js';
import { TOPIC_BLURBS, TOPIC_ICONS, topicCard } from './topics.js';

export default function explore(main, { query, setTitle, navigate }) {
  const activeTab = query.get('tab') === 'topics' ? 'topics' : 'countries';
  setTitle(activeTab === 'topics' ? 'Explore Topics' : 'Explore Countries');

  const allCountries = store.meta.countries || [];
  const allTopics = store.meta.topics || [];
  let regionFilter = '';
  let searchQuery = '';

  const draw = () => {
    main.innerHTML = `
      <section class="cl-hero">
        <div class="wrap">
          <span class="eyebrow accent" style="color:rgba(255,255,255,0.85)">Explore Hub</span>
          <h1>Understand Africa, by Country and Topic</h1>
          <p>Browse verified figures, local newsrooms, and strategic beats across all 54 African countries.</p>
        </div>
      </section>

      <div class="cl-body">
        <div class="wrap cl-page">
          <!-- Unified Switcher -->
          <div class="explore-nav-wrap">
            <nav class="explore-nav" role="tablist" aria-label="Explore StyleVault">
              <button type="button" class="explore-tab ${activeTab === 'countries' ? 'is-active' : ''}" data-hub-tab="countries" role="tab" aria-selected="${activeTab === 'countries'}">
                <span class="explore-tab-icon">🌍</span>
                <span>African Countries</span>
                <span class="explore-tab-count">${allCountries.length || 54}</span>
              </button>
              <button type="button" class="explore-tab ${activeTab === 'topics' ? 'is-active' : ''}" data-hub-tab="topics" role="tab" aria-selected="${activeTab === 'topics'}">
                <span class="explore-tab-icon">📌</span>
                <span>Strategic Topics</span>
                <span class="explore-tab-count">${allTopics.length || 13}</span>
              </button>
            </nav>
          </div>

          ${activeTab === 'countries' ? `
            <div class="cl-toolbar">
              <label class="cl-search">
                ${icon('search')}
                <input type="search" placeholder="Find a country or capital" aria-label="Find a country or capital" data-country-search value="${esc(searchQuery)}">
              </label>
              <div class="chips cl-chips" role="toolbar" aria-label="Filter by region">
                <button class="chip" type="button" data-region="" aria-pressed="${!regionFilter}">All regions</button>
                ${Object.entries(REGION_NAMES).map(([k, v]) => `<button class="chip" type="button" data-region="${k}" aria-pressed="${regionFilter === k}">${v}</button>`).join('')}
              </div>
            </div>

            <div class="cl-grid" data-country-grid>
              ${renderFilteredCountries()}
            </div>
          ` : `
            <div class="cl-toolbar">
              <label class="cl-search">
                ${icon('search')}
                <input type="search" placeholder="Find a topic (e.g. Trade, Energy, Technology)" aria-label="Find a topic" data-topic-search value="${esc(searchQuery)}">
              </label>
              <div class="cl-meta-count">
                <span>All 13 strategic sectors across Africa</span>
              </div>
            </div>

            <div class="topic-grid" data-topic-grid>
              ${renderFilteredTopics()}
            </div>
          `}
        </div>
      </div>`;
  };

  function renderFilteredCountries() {
    const q = searchQuery.trim().toLowerCase();
    const filtered = allCountries.filter((c) => {
      const matchRegion = !regionFilter || c.region === regionFilter;
      const matchQ = !q || c.name.toLowerCase().includes(q) || (c.capital || '').toLowerCase().includes(q);
      return matchRegion && matchQ;
    });
    if (!filtered.length) {
      return `<div class="empty" style="grid-column: 1 / -1"><div class="ic">${icon('search')}</div><h3>No countries found</h3><p>Try searching for a different country or clear the region filter.</p></div>`;
    }
    return filtered.map(countryCard).join('');
  }

  function renderFilteredTopics() {
    const q = searchQuery.trim().toLowerCase();
    const filtered = allTopics.filter((t) => {
      const blurb = (TOPIC_BLURBS[t.slug] || '').toLowerCase();
      return !q || t.name.toLowerCase().includes(q) || blurb.includes(q);
    });
    if (!filtered.length) {
      return `<div class="empty" style="grid-column: 1 / -1"><div class="ic">${icon('search')}</div><h3>No topics found</h3><p>Try searching for words like Trade, Tech, Energy, or Agriculture.</p></div>`;
    }
    return filtered.map(topicCard).join('');
  }

  main.addEventListener('click', async (e) => {
    const tabBtn = e.target.closest('[data-hub-tab]');
    if (tabBtn) {
      const nextTab = tabBtn.dataset.hubTab;
      if (nextTab === 'countries') navigate('/countries');
      else navigate('/topics');
      return;
    }

    const regBtn = e.target.closest('[data-region]');
    if (regBtn) {
      regionFilter = regBtn.dataset.region || '';
      draw();
      return;
    }

    if (e.target.closest('[data-follow]')) {
      await handleCountryFollow(e);
      return;
    }

    const topicFollowBtn = e.target.closest('[data-follow-topic]');
    if (topicFollowBtn) {
      e.stopPropagation();
      e.preventDefault();
      const slug = topicFollowBtn.dataset.followTopic;
      try {
        const on = await store.toggleFollow('topic', slug);
        topicFollowBtn.classList.toggle('is-on', on);
        topicFollowBtn.setAttribute('aria-pressed', String(on));
        topicFollowBtn.innerHTML = icon(on ? 'star-fill' : 'star');
        const name = store.topicBySlug.get(slug)?.name || slug;
        topicFollowBtn.setAttribute('aria-label', on ? `Unfollow ${name}` : `Follow ${name}`);
        topicFollowBtn.setAttribute('title', on ? 'Following' : 'Follow');
        toast(on ? `Following ${name}` : `Unfollowed ${name}`);
      } catch (err) {
        toast(err.message, 'error');
      }
    }
  });

  main.addEventListener('input', (e) => {
    if (e.target.matches('[data-country-search], [data-topic-search]')) {
      searchQuery = e.target.value;
      if (activeTab === 'countries') {
        const grid = $('[data-country-grid]', main);
        if (grid) grid.innerHTML = renderFilteredCountries();
      } else {
        const grid = $('[data-topic-grid]', main);
        if (grid) grid.innerHTML = renderFilteredTopics();
      }
    }
  });

  draw();
}
