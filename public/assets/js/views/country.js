import { api } from '../api.js';
import { $, $$, esc, flag, icon, nf, timeAgo } from '../lib.js';
import { store } from '../store.js';
import { REGION_NAMES, emptyState, mountFeed, toast, topCard } from '../ui.js';

export default async function country(main, { params, setTitle }) {
  const c = store.countryBySlug.get(params.slug);
  if (!c) {
    main.innerHTML = emptyState({ title: 'Country not found', body: 'We couldn’t find that country.', action: '<a class="btn btn-primary" href="/countries">See all 54 countries</a>' });
    return;
  }
  setTitle(c.name);

  const followBtn = () => {
    const on = !!store.followFor('country', c.code);
    return `<button class="btn ${on ? 'btn-ghost is-on' : 'btn-primary'}" type="button" data-follow-country aria-pressed="${on}">${icon(on ? 'star-fill' : 'star')} ${on ? 'Following' : `Follow ${esc(c.name)}`}</button>`;
  };

  main.innerHTML = `
    <section class="country-hero">
      ${flag(c.code, 'flag-xl', `Flag of ${c.name}`)}
      <div>
        <span class="eyebrow">${REGION_NAMES[c.region]}</span>
        <h1>${esc(c.name)}</h1>
        <div class="facts">
          ${c.capital ? `<span>Capital: ${esc(c.capital)}</span>` : ''}
          <span>${nf(c.recent)} stories this week</span>
          <span>${c.sources} local ${c.sources === 1 ? 'source' : 'sources'}</span>
        </div>
        <div class="hero-actions"><span data-follow-slot>${followBtn()}</span>
          <a class="btn btn-ghost" href="/search?country=${c.code}">${icon('search')} Search ${esc(c.name)}</a></div>
      </div>
    </section>

    ${c.sources === 0 ? `<p class="notice" style="margin-top:16px">We don’t yet collect from a newsroom based in ${esc(c.name)}. Stories here come from regional and pan-African publishers, and we’re adding local sources.</p>` : ''}

    <section class="section" data-top hidden>
      <div class="section-head"><div><span class="eyebrow">Top stories</span><h2>Most reported</h2></div></div>
      <div class="top-grid" data-top-grid></div>
    </section>

    <section class="section">
      <div class="section-head"><div><span class="eyebrow">Latest</span><h2>News from ${esc(c.name)}</h2></div></div>
      <div class="chips" role="toolbar" aria-label="Filter by topic" data-topic-chips>
        <button class="chip" type="button" aria-pressed="true" data-topic="">All topics</button>
        ${store.meta.topics.map((t) => `<button class="chip" type="button" aria-pressed="false" data-topic="${t.slug}"><span class="dot" style="--c:${t.color}"></span>${esc(t.name)}</button>`).join('')}
      </div>
      <div style="margin-top:14px" data-feed></div>
    </section>

    <section class="section" data-sources hidden>
      <div class="section-head"><div><span class="eyebrow">Newsrooms</span><h2>Sources based in ${esc(c.name)}</h2></div></div>
      <div class="source-list" data-source-list></div>
    </section>`;

  main.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-follow-country]')) return;
    try {
      const on = await store.toggleFollow('country', c.code);
      $('[data-follow-slot]', main).innerHTML = followBtn();
      toast(on ? `Following ${c.name}. It’s now in My Monitor.` : `Unfollowed ${c.name}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  api.topStories({ country: c.code }).then(({ items }) => {
    if (!items.length) return;
    $('[data-top]', main).hidden = false;
    $('[data-top-grid]', main).innerHTML = items.slice(0, 3).map((a, i) => topCard(a, i === 0)).join('');
  }).catch(() => {});

  const feed = $('[data-feed]', main);
  let topic = '';
  const load = () => mountFeed(feed, (before) => api.articles({ country: c.code, topic, before }), {
    empty: emptyState({ title: 'No stories yet', body: `Nothing ${topic ? 'on this topic ' : ''}from ${esc(c.name)} in our sources yet. New stories are collected every hour.` }),
  });
  load();
  $('[data-topic-chips]', main).addEventListener('click', (e) => {
    const chip = e.target.closest('[data-topic]');
    if (!chip) return;
    $$('[data-topic]', main).forEach((x) => x.setAttribute('aria-pressed', x === chip));
    topic = chip.dataset.topic;
    load();
  });

  if (c.sources > 0) {
    api.sources().then(({ items }) => {
      const mine = items.filter((s) => s.country === c.code);
      if (!mine.length) return;
      $('[data-sources]', main).hidden = false;
      $('[data-source-list]', main).innerHTML = mine.map((s) => `
        <div class="source-row"><span class="health ${s.failures ? (s.failures > 3 ? 'bad' : 'warn') : s.lastSuccessAt ? '' : 'idle'}"></span>
          <div><a class="name" href="${esc(s.homepage)}" target="_blank" rel="noopener">${esc(s.name)}</a>
            <div class="sub">${s.lastSuccessAt ? `Checked ${timeAgo(s.lastSuccessAt)}` : 'Not checked yet'} · ${nf(s.articles)} stories</div></div>
          <a class="act" href="${esc(s.homepage)}" target="_blank" rel="noopener" aria-label="Visit ${esc(s.name)}">${icon('external')}</a></div>`).join('');
    }).catch(() => {});
  }
}
