import { api } from '../api.js';
import { $, esc, icon } from '../lib.js';
import { store } from '../store.js';
import { anyCard, emptyState, mountFeed, toast } from '../ui.js';
import { TOPIC_BLURBS } from './topics.js';

export default function topic(main, { params, query, setTitle, navigate }) {
  const t = store.topicBySlug.get(params.slug);
  if (!t) {
    main.innerHTML = `<div class="wrap" style="padding-top:48px">${emptyState({ title: 'Topic not found', body: 'We couldn’t find that topic.', action: '<a class="btn btn-plum" href="/topics">See all topics</a>' })}</div>`;
    return;
  }
  setTitle(t.name);
  const country = store.countryByCode.has(query.get('country')) ? query.get('country') : '';

  const followBtn = () => {
    const on = !!store.followFor('topic', t.slug);
    return `<button class="btn ${on ? 'is-on' : 'btn-plum'}" type="button" data-follow-topic>${icon(on ? 'star-fill' : 'star')} ${on ? 'Following' : 'Follow this topic'}</button>`;
  };

  main.innerHTML = `
    <section class="page-hero"><div class="wrap">
      <span class="eyebrow">Topic</span>
      <h1>${esc(t.name)}</h1>
      <p class="lede">${esc(TOPIC_BLURBS[t.slug] || '')}</p>
      <div style="margin-top:22px" data-follow-slot>${followBtn()}</div>
    </div></section>
    <div class="wrap" style="padding-top:36px;max-width:920px">
      <div class="toolbar">
        <select class="select" aria-label="Filter by country" data-country>
          <option value="">All 54 countries</option>
          ${store.meta.countries.map((c) => `<option value="${c.code}" ${c.code === country ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
        </select>
      </div>
      <div data-feed></div>
    </div>`;

  $('[data-country]', main).addEventListener('change', (e) =>
    navigate(`/topic/${t.slug}${e.target.value ? `?country=${e.target.value}` : ''}`, { replace: true }));

  main.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-follow-topic]')) return;
    try {
      const on = await store.toggleFollow('topic', t.slug);
      $('[data-follow-slot]', main).innerHTML = followBtn();
      toast(on ? `Following ${t.name}` : `Unfollowed ${t.name}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  mountFeed($('[data-feed]', main), (before) => api.articles({ topic: t.slug, country, before }), { render: anyCard });
}
