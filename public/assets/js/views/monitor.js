import { api } from '../api.js';
import { $, $$, esc, flag, icon } from '../lib.js';
import { store } from '../store.js';
import { confirmDialog, emptyState, followEditor, mountFeed, openManageFollowModal, openFollowingSwitcherModal, streamCard, toast } from '../ui.js';

const syncNote = () => store.user ? '' : `
  <div class="note flw-sync-note">${icon('lock')}<span>What you follow is saved in this browser. <a href="/signup">Create a free account</a> to keep it on every device.</span></div>`;

export default function following(main, { query, setTitle, navigate }) {
  setTitle('Following');
  let viewMode = localStorage.getItem('sv_flw_view') || 'grid';

  const draw = () => {
    const followedCountries = store.followedCountries;
    const followedTopics = store.followedTopics;
    const pairs = store.countryTopicPairs;
    const list = store.monitors;
    const totalFollows = followedCountries.length + followedTopics.length + pairs.length + list.filter((m) => m.keywords).length;

    const head = `
      <header class="flw-header">
        <div class="wrap flw-header-inner">
          <div class="flw-header-copy">
            <h1>Following</h1>
            <p class="flw-lede">All stories from the countries and topics you follow, brought together in one place.</p>
          </div>
          <div class="flw-header-right">
            ${totalFollows ? `
              <div class="flw-stats">
                <div class="flw-stat"><strong>${followedCountries.length}</strong><span>${followedCountries.length === 1 ? 'Country' : 'Countries'}</span></div>
                <span class="flw-stat-sep"></span>
                <div class="flw-stat"><strong>${followedTopics.length}</strong><span>${followedTopics.length === 1 ? 'Topic' : 'Topics'}</span></div>
                ${pairs.length ? `
                  <span class="flw-stat-sep"></span>
                  <div class="flw-stat"><strong>${pairs.length}</strong><span>${pairs.length === 1 ? 'Focus' : 'Focuses'}</span></div>
                ` : ''}
              </div>
            ` : ''}
            <button class="btn btn-plum flw-new-btn" type="button" data-manage-countries>${icon('plus')} Manage</button>
          </div>
        </div>
      </header>`;

    if (!totalFollows && !list.length) {
      main.innerHTML = `
        ${head}
        <section class="flw-body">
          <div class="wrap flw-container">
            ${syncNote()}
            ${emptyState({
              title: 'You’re not following any countries or topics yet',
              body: 'Choose the countries you want to follow to see their latest stories here together.',
              action: `<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
                <button class="btn btn-plum" type="button" data-manage-countries>${icon('plus')} Choose countries & topics to follow</button>
                <a class="btn btn-outline" href="/countries">Browse 54 countries</a>
              </div>`,
              iconName: 'star',
            })}
          </div>
        </section>`;
      return;
    }

    // Determine filter state
    const countryParam = query.get('country');
    const topicParam = query.get('topic');
    const monitorParam = query.get('m');

    let activeSelection = { type: 'all', name: 'Followed' };
    let activeCountry = null;
    let activeTopic = null;
    let activeMonitor = null;

    if (countryParam && topicParam) {
      activeCountry = store.countryByCode.get(countryParam);
      activeTopic = store.topicBySlug.get(topicParam);
      const cName = activeCountry ? activeCountry.name : countryParam;
      const tName = activeTopic ? activeTopic.name : topicParam;
      activeSelection = { type: 'pair', country: countryParam, topic: topicParam, name: `${tName} in ${cName}` };
    } else if (countryParam && (followedCountries.includes(countryParam) || store.countryByCode.has(countryParam))) {
      activeCountry = store.countryByCode.get(countryParam);
      activeSelection = { type: 'country', value: countryParam, name: activeCountry ? activeCountry.name : countryParam };
    } else if (topicParam && (followedTopics.includes(topicParam) || store.topicBySlug.has(topicParam))) {
      activeTopic = store.topicBySlug.get(topicParam);
      activeSelection = { type: 'topic', value: topicParam, name: activeTopic ? activeTopic.name : topicParam };
    } else if (monitorParam) {
      activeMonitor = list.find((m) => m.id === monitorParam);
      if (activeMonitor) {
        activeSelection = { type: 'monitor', value: monitorParam, name: activeMonitor.name };
      }
    }

    // Prepare control bar metadata
    let indicatorHtml = '<span class="flw-dd-dot"></span>';
    let label = 'Followed';
    let countBadge = `${followedCountries.length || 54} countries`;

    if (activeSelection.type === 'pair') {
      indicatorHtml = flag(activeSelection.country, 'flag', '');
      label = activeSelection.name;
      countBadge = 'Topic in Country';
    } else if (activeSelection.type === 'country' && activeCountry) {
      indicatorHtml = flag(activeCountry.code, 'flag', '');
      label = activeCountry.name;
      countBadge = '1 country';
    } else if (activeSelection.type === 'topic' && activeTopic) {
      indicatorHtml = '📌';
      label = activeTopic.name;
      countBadge = 'Topic';
    } else if (activeSelection.type === 'monitor' && activeMonitor) {
      label = activeMonitor.name;
      countBadge = 'Watchlist';
    } else {
      indicatorHtml = '🌍';
      label = 'Followed';
      countBadge = `${followedCountries.length} countries`;
    }

    main.innerHTML = `
      ${head}
      <section class="flw-body">
        <div class="wrap flw-container">
          ${syncNote()}

          <!-- Unbundled Control Bar -->
          <div class="flw-panel">
            <div class="flw-bar">
              <div class="flw-bar-top">
                <button type="button" class="flw-dropdown-btn" data-open-switcher aria-haspopup="dialog" title="Filter what you are viewing">
                  <span class="flw-dd-indicator">${indicatorHtml}</span>
                  <span class="flw-dd-name">${esc(label)}</span>
                  <span class="flw-dd-count">${countBadge}</span>
                  <span class="flw-dd-chev" aria-hidden="true">${icon('chevron-down')}</span>
                </button>

                ${activeSelection.type !== 'all' ? `
                  <div class="flw-summary-actions">
                    <button class="btn btn-outline btn-sm flw-action-btn" type="button" data-reset-all>${icon('close')} <span>View all</span></button>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- Feed Section -->
          <div class="flw-feed-section">
            <div class="flw-feed-head">
              <div>
                <span class="eyebrow">${activeSelection.type === 'all' ? 'All followed countries' : esc(label)}</span>
                <h3>${activeSelection.type === 'all' ? 'Latest stories across your followed countries' : `Latest stories · ${esc(label)}`}</h3>
              </div>
              <div class="flw-feed-controls">
                <span class="flw-feed-meta"><span class="live-dot-sm"></span> Updated live</span>
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

    // Build feed loader query
    const feedQuery = { limit: 20 };
    if (activeSelection.type === 'pair') {
      feedQuery.country = [activeSelection.country];
      feedQuery.topic = [activeSelection.topic];
    } else if (activeSelection.type === 'country') {
      feedQuery.country = [activeSelection.value];
    } else if (activeSelection.type === 'topic') {
      feedQuery.topic = [activeSelection.value];
    } else if (activeSelection.type === 'monitor' && activeMonitor) {
      if (activeMonitor.countries?.length) feedQuery.country = activeMonitor.countries;
      if (activeMonitor.topics?.length) feedQuery.topic = activeMonitor.topics;
      if (activeMonitor.keywords) feedQuery.keywords = activeMonitor.keywords;
    } else {
      // Default: ALL followed countries together!
      if (followedCountries.length) {
        feedQuery.country = followedCountries.slice(0, 54);
      }
    }

    mountFeed($('[data-feed]', main), (before) => api.articles({ ...feedQuery, before }), {
      render: streamCard,
      empty: emptyState({
        title: 'No new stories right now',
        body: 'There are no recent stories matching this selection. Try choosing a few more countries or topics.',
        action: `<button class="btn btn-outline btn-sm" type="button" data-manage-countries>${icon('plus')} Follow more countries & topics</button>`,
        iconName: 'star',
      }),
    });
  };

  const handleManage = () => {
    openManageFollowModal({
      onSaved: () => {
        draw();
      },
    });
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

    if (e.target.closest('[data-manage-countries]')) {
      handleManage();
      return;
    }

    if (e.target.closest('[data-reset-all]')) {
      navigate('/following', { replace: true });
      return;
    }

    if (e.target.closest('[data-open-switcher]')) {
      const countryParam = query.get('country');
      const topicParam = query.get('topic');
      let activeSelection = { type: 'all' };
      if (countryParam && topicParam) activeSelection = { type: 'pair', country: countryParam, topic: topicParam };
      else if (countryParam) activeSelection = { type: 'country', value: countryParam };
      else if (topicParam) activeSelection = { type: 'topic', value: topicParam };

      openFollowingSwitcherModal({
        activeSelection,
        onSelect: (sel) => {
          if (!sel || sel.type === 'all') {
            navigate('/following', { replace: true });
          } else if (sel.type === 'pair') {
            navigate(`/following?country=${encodeURIComponent(sel.country)}&topic=${encodeURIComponent(sel.topic)}`, { replace: true });
          } else if (sel.type === 'country') {
            navigate(`/following?country=${encodeURIComponent(sel.value)}`, { replace: true });
          } else if (sel.type === 'topic') {
            navigate(`/following?topic=${encodeURIComponent(sel.value)}`, { replace: true });
          }
        },
        onManage: handleManage,
      });
      return;
    }
  });

  const off = store.on(draw);
  draw();
  return () => off?.();
}
