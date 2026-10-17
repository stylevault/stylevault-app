import { api } from '../api.js';
import { $, $$, esc, icon, nf } from '../lib.js';
import { store } from '../store.js';
import { anyCard, emptyState, mountFeed, openDialog, readCard, toast } from '../ui.js';
import { TOPIC_BLURBS } from './topics.js';
import { brandSelect } from '../brand-select.js';

// Sprite icons that stand in for each topic, where the country page shows a flag.
const TOPIC_ICONS = {
  business: 'chart', politics: 'building', trade: 'globe', technology: 'radar', agriculture: 'map',
  education: 'book', tourism: 'globe', style: 'eye', energy: 'sun', health: 'shield',
  climate: 'sun', security: 'shield', sport: 'stack',
};

const TABS = [
  ['latest', 'Latest', '⚡', 'Everything new: reporting, research and official releases'],
  ['news', 'News', '📰', 'Stories from newsrooms across the continent'],
  ['research', 'Research', '📑', 'Policy papers, university studies and think-tank analysis'],
  ['related', 'Related topics', '🧭', 'Other beats we follow across all 54 countries'],
];
const FEEDS = {
  latest: { kind: undefined, limit: 12 },
  news: { kind: 'news', limit: 12 },
  research: { kind: ['research', 'analysis', 'official'], limit: 9 },
};

// Compact section switcher, styled like the country page's (sec-modal-* rows).
function openTopicSectionModal({ topic: t, tileIcon, sections, activeTab, onSelectTab }) {
  return openDialog(`
    <div class="sheet-drag-handle" aria-hidden="true"></div>
    <div class="sheet-head sec-modal-head">
      <div style="display:flex;align-items:center;gap:10px;min-width:0">
        <span class="tp-tile xs" aria-hidden="true">${icon(tileIcon)}</span>
        <div style="min-width:0">
          <h2 style="margin:0;font-size:1.12rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Explore ${esc(t.name)}</h2>
          <p class="sec-modal-sub">Jump to any section of this topic</p>
        </div>
      </div>
      <button type="button" class="icon-btn" data-close aria-label="Close">${icon('close')}</button>
    </div>
    <div class="sheet-body sec-modal-body" style="padding:14px 18px;max-height:75vh;overflow-y:auto">
      <div class="sec-modal-list">
        ${sections.map((s) => `
          <button type="button" class="sec-modal-row ${activeTab === s.id ? 'is-active' : ''}" data-sec-tab="${s.id}">
            <span class="smr-icon">${s.icon}</span>
            <div class="smr-info">
              <strong class="smr-title">${esc(s.title)}</strong>
              <span class="smr-desc">${esc(s.desc)}</span>
            </div>
            <div class="smr-check" aria-hidden="true">
              ${activeTab === s.id ? `<span class="fmi-active-pill">${icon('check')} Viewing</span>` : icon('arrow-right')}
            </div>
          </button>`).join('')}
      </div>
    </div>`, (dialog, close) => {
    $$('[data-sec-tab]', dialog).forEach((btn) => btn.addEventListener('click', () => {
      close();
      onSelectTab(btn.dataset.secTab);
    }));
  });
}

export default function topic(main, { params, query, setTitle }) {
  const t = store.topicBySlug.get(params.slug);
  if (!t) {
    main.innerHTML = `<div class="wrap" style="padding-top:48px">${emptyState({ title: 'Topic not found', body: 'We couldn’t find that topic.', action: '<a class="btn btn-plum" href="/topics">See all topics</a>' })}</div>`;
    return;
  }
  setTitle(`${t.name}: Topic Hub`);
  store.recordVisit('topic', t.slug);

  let country = store.countryByCode.has(query.get('country')) ? query.get('country') : '';
  const blurb = TOPIC_BLURBS[t.slug] || 'Latest news, research and analysis across all 54 African countries.';
  const related = store.meta.topics.filter((x) => x.slug !== t.slug);

  const followBtn = () => {
    const on = store.isFollowed('topic', t.slug);
    return `<button class="btn btn-sm ${on ? 'is-on' : 'btn-plum'}" type="button" data-follow-topic aria-pressed="${on}">${icon(on ? 'star-fill' : 'star')} ${on ? 'Following' : 'Follow'}</button>`;
  };

  const sectionHead = (title, intro) => `
    <div class="sec-head"><div><h2>${title}</h2><p class="sec-intro">${intro}</p></div></div>`;

  main.innerHTML = `
    <section class="cf-hero tp-hero">
      <div class="wrap">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="/topics">Topics</a>
        </nav>
        <div class="cf-head tp-head">
          <div class="cf-head-left">
            <span class="tp-tile" aria-hidden="true">${icon(TOPIC_ICONS[t.slug] || 'news')}</span>
            <div class="cf-id">
              <span class="cf-kicker">Topic hub · All 54 countries</span>
              <h1>${esc(t.name)}</h1>
            </div>
          </div>
          <div class="cf-actions">
            <span data-follow-slot>${followBtn()}</span>
            <button class="btn btn-sm btn-outline" type="button" data-share-topic aria-label="Share this topic">${icon('share')}<span>Share</span></button>
          </div>
        </div>
        <p class="tp-blurb">${esc(blurb)}</p>
        <dl class="cf-keyfacts">
          <div><dt>This week</dt><dd>${nf(t.recent || 0)} ${t.recent === 1 ? 'story' : 'stories'}</dd></div>
          <div><dt>Coverage</dt><dd>54 countries</dd></div>
          <div><dt>Formats</dt><dd>News &amp; research</dd></div>
          <div><dt>Updated</dt><dd>Every hour</dd></div>
        </dl>
      </div>
    </section>

    <nav class="subnav cf-subnav" aria-label="Topic sections">
      <div class="wrap cf-subnav-wrap">
        <button type="button" class="cf-section-btn" data-open-topic-modal aria-haspopup="dialog" title="Switch section">
          <span class="cf-sb-icon" data-sb-icon>⚡</span>
          <span class="cf-sb-label">Section:</span>
          <strong class="cf-sb-name" data-sb-name>Latest</strong>
          <span class="cf-sb-count">${TABS.length} sections</span>
          <span class="cf-sb-chev" aria-hidden="true">${icon('chevron-down')}</span>
        </button>
        <div class="cf-desktop-tabs" role="tablist">
          ${TABS.map(([id, label]) => `<a href="#${id}" role="tab" data-tab="${id}" aria-controls="${id}">${label}</a>`).join('')}
        </div>
      </div>
    </nav>

    <div class="wrap" data-filter-bar>
      <div class="tp-filter">
        <label for="tp-country">Showing stories from</label>
        <select class="select" id="tp-country" data-country-select>
          <option value="">All 54 countries</option>
          ${store.meta.countries.map((c) => `<option value="${c.code}" ${c.code === country ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
        </select>
      </div>
    </div>

    <section class="cf-section tp-section" id="latest" role="tabpanel">
      <div class="wrap">
        ${sectionHead('Latest', `Everything new on ${esc(t.name.toLowerCase())}: reporting, research and official releases.`)}
        <div class="tp-feed" data-feed="latest"></div>
      </div>
    </section>

    <section class="cf-section tp-section" id="news" role="tabpanel" hidden>
      <div class="wrap">
        ${sectionHead('News', 'Stories from newsrooms across the continent, updated hourly.')}
        <div class="tp-feed" data-feed="news"></div>
      </div>
    </section>

    <section class="cf-section tp-section" id="research" role="tabpanel" hidden>
      <div class="wrap">
        ${sectionHead('Research &amp; reports', 'Papers from think tanks, universities and African institutions.')}
        <div class="tp-feed" data-feed="research"></div>
      </div>
    </section>

    <section class="cf-section tp-section" id="related" role="tabpanel" hidden>
      <div class="wrap">
        ${sectionHead('Related topics', 'Other beats we follow across all 54 countries.')}
        <div class="tp-related">
          ${related.map((x) => `
            <a class="tp-related-row" href="/topic/${x.slug}">
              <span class="tp-tile sm" aria-hidden="true">${icon(TOPIC_ICONS[x.slug] || 'news')}</span>
              <span class="tp-related-text"><strong>${esc(x.name)}</strong><span>${esc(TOPIC_BLURBS[x.slug] || '')}</span></span>
              ${x.recent ? `<span class="tp-related-count">${nf(x.recent)}</span>` : ''}
            </a>`).join('')}
        </div>
      </div>
    </section>`;

  // Feeds mount the first time their tab opens, and remount when the country filter changes.
  const mounted = new Set();
  const isGuest = !store.user;
  const mountTab = (id) => {
    const cfg = FEEDS[id];
    if (!cfg || mounted.has(id)) return;
    mounted.add(id);
    const where = country ? ` in ${esc(store.countryByCode.get(country)?.name || '')}` : '';
    mountFeed($(`[data-feed="${id}"]`, main), (before) => api.articles({ topic: t.slug, country, kind: cfg.kind, before, limit: cfg.limit }), {
      layout: id === 'research' ? 'cards' : 'rows',
      render: id === 'research' ? (a, idx) => readCard(a, { locked: isGuest && idx >= 2 }) : id === 'news' ? undefined : anyCard,
      empty: emptyState({ title: 'Nothing here yet', body: `No ${id === 'latest' ? 'stories' : id} on ${esc(t.name)}${where} right now. Try another country.`, iconName: id === 'research' ? 'book' : 'news' }),
    });
  };

  const filterBar = $('[data-filter-bar]', main);
  const hero = $('.cf-hero', main);
  const showTab = (id, fromClick = false) => {
    $$('.tp-section', main).forEach((s) => { s.hidden = s.id !== id; });
    $$('[data-tab]', main).forEach((a) => {
      const on = a.dataset.tab === id;
      a.classList.toggle('on', on);
      a.setAttribute('aria-selected', on);
      if (on && fromClick) a.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    });
    const [, label, emoji] = TABS.find(([tId]) => tId === id) || TABS[0];
    $('[data-sb-icon]', main).textContent = emoji;
    $('[data-sb-name]', main).textContent = label;
    filterBar.hidden = !FEEDS[id];
    mountTab(id);
    history.replaceState(history.state, '', `${location.pathname}${location.search}${id === 'latest' ? '' : `#${id}`}`);
    const top = hero.offsetTop + hero.offsetHeight - ($('.site-header')?.offsetHeight || 0);
    if (fromClick && window.scrollY > top) window.scrollTo({ top, behavior: 'instant' });
  };
  const current = () => $('[data-tab].on', main)?.dataset.tab || 'latest';

  brandSelect($('[data-country-select]', main));
  $('[data-country-select]', main).addEventListener('change', (e) => {
    country = e.target.value;
    const p = new URLSearchParams(location.search);
    if (country) p.set('country', country); else p.delete('country');
    history.replaceState(history.state, '', `${location.pathname}${p.toString() ? `?${p}` : ''}${location.hash}`);
    mounted.clear();
    Object.keys(FEEDS).forEach((id) => { $(`[data-feed="${id}"]`, main).innerHTML = ''; });
    mountTab(current());
  });

  main.addEventListener('click', async (e) => {
    if (e.target.closest('[data-open-topic-modal]')) {
      openTopicSectionModal({
        topic: t,
        tileIcon: TOPIC_ICONS[t.slug] || 'news',
        sections: TABS.map(([id, title, emoji, desc]) => ({ id, title, icon: emoji, desc })),
        activeTab: current(),
        onSelectTab: (id) => showTab(id, true),
      });
      return;
    }
    const jump = e.target.closest('a[href^="#"]');
    if (jump && TABS.some(([id]) => `#${id}` === jump.getAttribute('href'))) {
      e.preventDefault();
      showTab(jump.getAttribute('href').slice(1), true);
      return;
    }
    if (e.target.closest('[data-follow-topic]')) {
      try {
        const on = await store.toggleFollow('topic', t.slug);
        $('[data-follow-slot]', main).innerHTML = followBtn();
        toast(on ? `Following ${t.name}` : `Unfollowed ${t.name}`);
      } catch (err) {
        toast(err.message, 'error');
      }
      return;
    }
    if (e.target.closest('[data-share-topic]')) {
      const data = { title: `${t.name} · Style Vault`, url: location.href };
      if (navigator.share) navigator.share(data).catch(() => {});
      else navigator.clipboard.writeText(location.href).then(() => toast('Link copied'), () => {});
    }
  });

  const initial = location.hash.slice(1);
  showTab(TABS.some(([id]) => id === initial) ? initial : 'latest');
}
