import { api } from '../api.js';
import { $, esc, flag, icon } from '../lib.js';
import { store } from '../store.js';
import { confirmDialog, emptyState, monitorEditor, mountFeed, toast } from '../ui.js';

const syncNote = () => store.user ? '' : `
  <div class="sync-note">${icon('lock')}<span>Your monitors are saved in this browser. <a href="/signup">Create a free account</a> to keep them on every device.</span></div>`;

function criteria(m) {
  const pills = [
    ...m.countries.map((code) => {
      const c = store.countryByCode.get(code);
      return c ? `<a class="crit-pill" href="/country/${c.slug}">${flag(code)} ${esc(c.name)}</a>` : '';
    }),
    ...m.topics.map((slug) => {
      const t = store.topicBySlug.get(slug);
      return t ? `<a class="crit-pill tag" style="--c:${t.color}" href="/topic/${slug}">${esc(t.name)}</a>` : '';
    }),
    ...(m.keywords ? m.keywords.split(',').map((k) => k.trim()).filter(Boolean).map((k) => `<span class="crit-pill">“${esc(k)}”</span>`) : []),
  ];
  if (!m.countries.length) pills.unshift('<span class="crit-pill">All 54 countries</span>');
  return pills.join('');
}

export default function monitor(main, { query, setTitle, navigate }) {
  setTitle('My Monitor');

  const draw = () => {
    const monitors = store.monitors;
    if (!monitors.length) {
      main.innerHTML = `
        <header class="page-head"><span class="eyebrow">My Monitor</span><h1>Your own news desk</h1>
          <p>Follow a market, an industry or a region. StyleVault checks every source hourly and gathers the matching stories here.</p></header>
        ${syncNote()}
        ${emptyState({
          title: 'Start your first monitor',
          body: 'For example: <strong>Rwanda + Tourism</strong>, or <strong>Nigeria, Ghana, Kenya + Technology</strong>, or <strong>all of Africa + “lithium”</strong>. You can also tap the star on any country or topic to follow it.',
          action: `<button class="btn btn-primary" type="button" data-new>${icon('plus')} Create a monitor</button>`,
        })}`;
      return;
    }

    const activeId = monitors.some((m) => m.id === query.get('m')) ? query.get('m') : monitors[0].id;
    const m = monitors.find((x) => x.id === activeId);

    main.innerHTML = `
      <header class="page-head" style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap">
        <div><span class="eyebrow">My Monitor</span><h1>Your news desk</h1></div>
        <button class="btn btn-primary" type="button" data-new>${icon('plus')} New monitor</button>
      </header>
      ${syncNote()}
      <div class="monitor-tabs" role="tablist" aria-label="Your monitors">
        ${monitors.map((x) => `<a class="chip ${x.id === activeId ? 'active' : ''}" role="tab" aria-selected="${x.id === activeId}" href="/monitor?m=${encodeURIComponent(x.id)}">${icon('radar')} ${esc(x.name)}</a>`).join('')}
      </div>
      <div class="monitor-summary">
        <div class="crit">${criteria(m)}</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" type="button" data-edit>${icon('edit')} Edit</button>
          <button class="btn btn-danger btn-sm" type="button" data-delete aria-label="Delete monitor">${icon('trash')}</button>
        </div>
      </div>
      <div data-feed></div>`;

    mountFeed($('[data-feed]', main), (before) => api.articles({ country: m.countries, topic: m.topics, keywords: m.keywords, before }), {
      empty: emptyState({ title: 'Nothing yet', body: 'No recent stories match this monitor. New stories arrive every hour; you can also widen it with more countries or keywords.' }),
    });
  };

  main.addEventListener('click', async (e) => {
    if (e.target.closest('[data-new]')) {
      const saved = await monitorEditor();
      if (saved) {
        toast(`“${saved.name}” created`);
        navigate(`/monitor?m=${encodeURIComponent(saved.id)}`, { replace: true });
      }
      return;
    }
    const current = store.monitors.find((x) => x.id === query.get('m')) || store.monitors[0];
    if (e.target.closest('[data-edit]') && current) {
      const saved = await monitorEditor(current);
      if (saved) { toast('Monitor updated'); draw(); }
    }
    if (e.target.closest('[data-delete]') && current) {
      const ok = await confirmDialog({ title: 'Delete this monitor?', body: `“${current.name}” will be removed. Your saved stories are not affected.`, confirmLabel: 'Delete', danger: true });
      if (!ok) return;
      try {
        await store.removeMonitor(current.id);
        toast('Monitor deleted');
        navigate('/monitor', { replace: true });
      } catch (err) {
        toast(err.message, 'error');
      }
    }
  });

  draw();
}
