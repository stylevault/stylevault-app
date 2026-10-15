import { api } from '../api.js';
import { $, esc, flag, icon } from '../lib.js';
import { store } from '../store.js';
import { anyCard, confirmDialog, emptyState, followEditor, mountFeed, toast } from '../ui.js';

const syncNote = () => store.user ? '' : `
  <div class="note" style="margin-bottom:24px">${icon('lock')}<span>What you follow is saved in this browser. <a href="/signup">Create a free account</a> to keep it on every device.</span></div>`;

function criteria(m) {
  const pills = [
    ...m.countries.map((code) => {
      const c = store.countryByCode.get(code);
      return c ? `<a class="crit-pill" href="/country/${c.slug}">${flag(code)} ${esc(c.name)}</a>` : '';
    }),
    ...m.topics.map((slug) => {
      const t = store.topicBySlug.get(slug);
      return t ? `<a class="crit-pill" href="/topic/${slug}">${esc(t.name)}</a>` : '';
    }),
    ...(m.keywords ? m.keywords.split(',').map((k) => k.trim()).filter(Boolean).map((k) => `<span class="crit-pill">“${esc(k)}”</span>`) : []),
  ];
  if (!m.countries.length) pills.unshift('<span class="crit-pill">All 54 countries</span>');
  return pills.join('');
}

export default function following(main, { query, setTitle, navigate }) {
  setTitle('Following');

  const draw = () => {
    const list = store.monitors;
    const head = `
      <section class="page-hero"><div class="wrap" style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap">
        <div><span class="eyebrow">Your vault</span><h1>Following</h1>
          <p class="lede">Countries, subjects and keywords you keep an eye on. New material is gathered here every hour.</p></div>
        <button class="btn btn-plum" type="button" data-new>${icon('plus')} Follow something new</button>
      </div></section>`;

    if (!list.length) {
      main.innerHTML = `${head}<div class="wrap" style="padding-top:36px">${syncNote()}
        ${emptyState({
          title: 'You’re not following anything yet',
          body: 'Follow a country from its file, a topic from its page, or build your own: for example <strong>Rwanda + Tourism</strong>, or <strong>all of Africa + “lithium”</strong>.',
          action: `<a class="btn btn-outline" href="/countries">Browse countries</a>`,
          iconName: 'star',
        })}</div>`;
      return;
    }

    const activeId = list.some((m) => m.id === query.get('m')) ? query.get('m') : list[0].id;
    const m = list.find((x) => x.id === activeId);
    main.innerHTML = `${head}
      <div class="wrap" style="padding-top:32px;max-width:960px">
        ${syncNote()}
        <div class="follow-tabs" role="tablist" aria-label="What you follow">
          ${list.map((x) => `<a class="chip ${x.id === activeId ? 'active' : ''}" role="tab" aria-selected="${x.id === activeId}" href="/following?m=${encodeURIComponent(x.id)}">${esc(x.name)}</a>`).join('')}
        </div>
        <div class="follow-summary">
          <div class="crit">${criteria(m)}</div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-outline btn-sm" type="button" data-edit>${icon('edit')} Edit</button>
            <button class="btn btn-danger btn-sm" type="button" data-delete aria-label="Stop following">${icon('trash')}</button>
          </div>
        </div>
        <div data-feed style="margin-top:12px"></div>
      </div>`;

    mountFeed($('[data-feed]', main), (before) => api.articles({ country: m.countries, topic: m.topics, keywords: m.keywords, before }), {
      render: anyCard,
      empty: emptyState({ title: 'Nothing new yet', body: 'No recent material matches. Widen it with more countries, topics or keywords.', iconName: 'star' }),
    });
  };

  main.addEventListener('click', async (e) => {
    if (e.target.closest('[data-new]')) {
      const saved = await followEditor();
      if (saved) {
        toast(`Now following “${saved.name}”`);
        navigate(`/following?m=${encodeURIComponent(saved.id)}`, { replace: true });
      }
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
