import { api } from '../api.js';
import { $, esc, icon, nf } from '../lib.js';
import { store } from '../store.js';
import { emptyState, mountFeed, toast } from '../ui.js';
import { TOPIC_BLURBS } from './topics.js';

export default function topic(main, { params, query, setTitle, navigate }) {
  const t = store.topicBySlug.get(params.slug);
  if (!t) {
    main.innerHTML = emptyState({ title: 'Topic not found', body: 'We couldn’t find that topic.', action: '<a class="btn btn-primary" href="/topics">See all topics</a>' });
    return;
  }
  setTitle(t.name);
  const country = store.countryByCode.get(query.get('country')) ? query.get('country') : '';

  const followBtn = () => {
    const on = !!store.followFor('topic', t.slug);
    return `<button class="btn ${on ? 'btn-ghost is-on' : 'btn-ghost'}" type="button" data-follow-topic>${icon(on ? 'star-fill' : 'star')} ${on ? 'Following' : 'Follow topic'}</button>`;
  };

  main.innerHTML = `
    <section class="topic-hero" style="--c:${t.color}">
      <span class="eyebrow">Topic</span>
      <h1>${esc(t.name)}</h1>
      <p>${esc(TOPIC_BLURBS[t.slug] || '')} ${nf(t.recent)} stories this week.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px"><span data-follow-slot>${followBtn()}</span></div>
    </section>
    <div class="toolbar">
      <select class="select" style="max-width:300px;height:44px" aria-label="Filter by country" data-country>
        <option value="">All 54 countries</option>
        ${store.meta.countries.map((c) => `<option value="${c.code}" ${c.code === country ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
      </select>
    </div>
    <div data-feed></div>`;

  $('[data-country]', main).addEventListener('change', (e) =>
    navigate(`/topic/${t.slug}${e.target.value ? `?country=${e.target.value}` : ''}`, { replace: true }));

  main.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-follow-topic]')) return;
    try {
      const on = await store.toggleFollow('topic', t.slug);
      $('[data-follow-slot]', main).innerHTML = followBtn();
      toast(on ? `Following ${t.name}. It’s now in My Monitor.` : `Unfollowed ${t.name}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  mountFeed($('[data-feed]', main), (before) => api.articles({ topic: t.slug, country, before }));
}
