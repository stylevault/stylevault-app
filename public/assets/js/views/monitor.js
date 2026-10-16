import { api } from '../api.js';
import { $, $$, esc, flag, icon } from '../lib.js';
import { store } from '../store.js';
import { confirmDialog, emptyState, followEditor, mountFeed, openFollowingSwitcherModal, streamCard, toast } from '../ui.js';

const syncNote = () => store.user ? '' : `
  <div class="note flw-sync-note">${icon('lock')}<span>What you follow is saved in this browser. <a href="/signup">Create a free account</a> to keep it on every device.</span></div>`;

function criteria(m) {
  const pills = [];
  if (!m.countries.length) {
    pills.push(`<span class="crit-pill is-country">🌍 All 54 countries</span>`);
  } else {
    m.countries.forEach((code) => {
      const c = store.countryByCode.get(code);
      if (c) pills.push(`<a class="crit-pill is-country" href="/country/${c.slug}">${flag(code)} ${esc(c.name)}</a>`);
    });
  }
  m.topics.forEach((slug) => {
    const t = store.topicBySlug.get(slug);
    if (t) pills.push(`<a class="crit-pill is-topic" href="/topic/${slug}">${esc(t.name)}</a>`);
  });
  if (m.keywords) {
    m.keywords.split(',').map((k) => k.trim()).filter(Boolean).forEach((k) => {
      pills.push(`<span class="crit-pill is-keyword">“${esc(k)}”</span>`);
    });
  }
  return pills.join('');
}

export default function following(main, { query, setTitle, navigate }) {
  setTitle('Following');
  let viewMode = localStorage.getItem('sv_flw_view') || 'grid';

  const draw = () => {
    const list = store.monitors;
    const totalCountries = new Set(list.flatMap((m) => m.countries)).size;
    const totalTopics = new Set(list.flatMap((m) => m.topics)).size;

    const head = `
      <header class="flw-header">
        <div class="wrap flw-header-inner">
          <div class="flw-header-copy">
            <h1>Following</h1>
            <p class="flw-lede">Keep up with the countries, topics, and keywords you care about. We check for new stories every hour.</p>
          </div>
          <div class="flw-header-right">
            ${list.length ? `
              <div class="flw-stats">
                <div class="flw-stat"><strong>${list.length}</strong><span>Following</span></div>
                <span class="flw-stat-sep"></span>
                <div class="flw-stat"><strong>${totalCountries || 54}</strong><span>Countries</span></div>
                <span class="flw-stat-sep"></span>
                <div class="flw-stat"><strong>${totalTopics}</strong><span>${totalTopics === 1 ? 'Topic' : 'Topics'}</span></div>
              </div>
            ` : ''}
            <button class="btn btn-plum flw-new-btn" type="button" data-new>${icon('plus')} Follow something new</button>
          </div>
        </div>
      </header>`;

    if (!list.length) {
      main.innerHTML = `
        ${head}
        <section class="flw-body">
          <div class="wrap flw-container">
            ${syncNote()}
            ${emptyState({
              title: 'You’re not following anything yet',
              body: 'Follow any country or topic to get your own feed here. For example, try <strong>Rwanda + Technology</strong>, or <strong>All 54 countries + Agriculture &amp; Food</strong>.',
              action: `<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
                <button class="btn btn-plum" type="button" data-new>${icon('plus')} Choose what to follow</button>
                <a class="btn btn-outline" href="/countries">Browse 54 countries</a>
              </div>`,
              iconName: 'star',
            })}
          </div>
        </section>`;
      return;
    }

    const activeId = list.some((m) => m.id === query.get('m')) ? query.get('m') : list[0].id;
    const m = list.find((x) => x.id === activeId);
    const singleCountry = m.countries?.length === 1 ? store.countryByCode.get(m.countries[0]) : null;

    main.innerHTML = `
      ${head}
      <section class="flw-body">
        <div class="wrap flw-container">
          ${syncNote()}

          <!-- Cohesive Compact Control Bar -->
          <div class="flw-panel">
            <div class="flw-bar">
              <div class="flw-bar-top">
                <button type="button" class="flw-dropdown-btn" data-open-switcher aria-haspopup="dialog" title="Switch what you are viewing">
                  <span class="flw-dd-indicator">
                    ${singleCountry ? flag(singleCountry.code, 'flag', '') : '<span class="flw-dd-dot"></span>'}
                  </span>
                  <span class="flw-dd-name">${esc(m.name)}</span>
                  <span class="flw-dd-count">${list.length}</span>
                  <span class="flw-dd-chev" aria-hidden="true">${icon('chevron-down')}</span>
                </button>

                <div class="flw-summary-actions">
                  <button class="btn btn-outline btn-sm flw-action-btn" type="button" data-edit>${icon('edit')} <span>Edit</span></button>
                  <button class="btn btn-outline btn-sm flw-action-btn flw-add-btn" type="button" data-new>${icon('plus')} <span>Add</span></button>
                  <button class="btn btn-danger btn-sm flw-action-btn flw-delete-btn" type="button" data-delete aria-label="Stop following" title="Stop following">${icon('trash')}</button>
                </div>
              </div>

              <div class="flw-scope-row">
                <span class="flw-scope-lbl">Includes</span>
                <div class="crit">${criteria(m)}</div>
              </div>
            </div>
          </div>

          <!-- Feed Section -->
          <div class="flw-feed-section">
            <div class="flw-feed-head">
              <div>
                <span class="eyebrow">Picked for you</span>
                <h3>Latest stories and reports</h3>
              </div>
              <div class="flw-feed-controls">
                <span class="flw-feed-meta"><span class="live-dot-sm"></span> Updated hourly</span>
                <div class="flw-view-switch" role="group" aria-label="Feed layout">
                  <button type="button" class="flw-view-btn ${viewMode === 'grid' ? 'active' : ''}" data-view="grid">Cards</button>
                  <button type="button" class="flw-view-btn ${viewMode === 'list' ? 'active' : ''}" data-view="list">List</button>
                </div>
              </div>
            </div>
            <div class="flw-feed-box is-${viewMode}" data-feed></div>
          </div>
        </div>
      </section>`;

    mountFeed($('[data-feed]', main), (before) => api.articles({ country: m.countries, topic: m.topics, keywords: m.keywords, before }), {
      render: streamCard,
      empty: emptyState({
        title: 'No stories match this right now',
        body: 'We couldn’t find any recent stories for this exact mix. Try adding a few more countries, topics, or keywords.',
        action: `<button class="btn btn-outline btn-sm" type="button" data-edit>${icon('edit')} Edit what’s included</button>`,
        iconName: 'star',
      }),
    });
  };

  const handleCreateNew = async () => {
    const saved = await followEditor();
    if (saved) {
      toast(`Now following “${saved.name}”`);
      navigate(`/following?m=${encodeURIComponent(saved.id)}`, { replace: true });
    }
  };

  main.addEventListener('click', async (e) => {
    const viewBtn = e.target.closest('[data-view]');
    if (viewBtn) {
      viewMode = viewBtn.dataset.view;
      localStorage.setItem('sv_flw_view', viewMode);
      $$('[data-view]', main).forEach((b) => b.classList.toggle('active', b.dataset.view === viewMode));
      const feedBox = $('[data-feed]', main);
      if (feedBox) {
        feedBox.classList.remove('is-grid', 'is-list');
        feedBox.classList.add(`is-${viewMode}`);
      }
      return;
    }
    if (e.target.closest('[data-open-switcher]')) {
      const list = store.monitors;
      const activeId = list.some((m) => m.id === query.get('m')) ? query.get('m') : list[0]?.id;
      openFollowingSwitcherModal({
        list,
        activeId,
        onSelect: (id) => navigate(`/following?m=${encodeURIComponent(id)}`),
        onNew: handleCreateNew,
      });
      return;
    }
    if (e.target.closest('[data-new]')) {
      await handleCreateNew();
      return;
    }
    const current = store.monitors.find((x) => x.id === query.get('m')) || store.monitors[0];
    if (e.target.closest('[data-edit]') && current) {
      if (await followEditor(current)) { toast('Updated'); draw(); }
    }
    if (e.target.closest('[data-delete]') && current) {
      const ok = await confirmDialog({ title: 'Stop following?', body: `“${current.name}” will be removed. Your saved items are not affected.`, confirmLabel: 'Stop following', danger: true });
      if (!ok) return;
      try {
        await store.removeMonitor(current.id);
        toast('Removed');
        navigate('/following', { replace: true });
      } catch (err) {
        toast(err.message, 'error');
      }
    }
  });

  draw();
}

