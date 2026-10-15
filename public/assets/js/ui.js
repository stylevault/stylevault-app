import { $, $$, esc, flag, icon, shortDate, longDate, formatIndicator, sparkline, KIND_LABELS } from './lib.js';
import { store } from './store.js';

/** Articles rendered on screen, by id, so save/share buttons can find the full object. */
const registry = new Map();

export const REGION_NAMES = { North: 'North Africa', West: 'West Africa', Central: 'Central Africa', East: 'East Africa', Southern: 'Southern Africa' };

function countryLinks(codes, max = 3, withName = true) {
  if (!codes.length) return '';
  const items = codes.slice(0, max).map((code) => {
    const c = store.countryByCode.get(code);
    if (!c) return '';
    return `<a class="flag-link" href="/country/${c.slug}" title="${esc(c.name)}">${flag(code, 'flag', '')}${withName && codes.length === 1 ? esc(c.name) : ''}</a>`;
  });
  return `<span class="flags">${items.join('')}${codes.length > max ? `<span class="muted">+${codes.length - max}</span>` : ''}</span>`;
}

const kindTag = (kind) => (kind && kind !== 'news' ? `<span class="tag kind-${kind}">${KIND_LABELS[kind]}</span>` : '');

const saveButton = (a) => {
  const saved = store.isSaved(a.id);
  return `<button class="act ${saved ? 'saved' : ''}" type="button" data-save="${a.id}" aria-pressed="${saved}" aria-label="${saved ? 'Remove from saved' : 'Save for later'}" title="${saved ? 'Saved' : 'Save for later'}">${icon(saved ? 'bookmark-fill' : 'bookmark')}</button>`;
};
const shareButton = (a) => `<button class="act" type="button" data-share="${a.id}" aria-label="Share" title="Share">${icon('share')}</button>`;
const time = (a) => `<time datetime="${new Date(a.publishedAt * 1000).toISOString()}" title="${esc(longDate(a.publishedAt))}">${shortDate(a.publishedAt)}</time>`;

/** Long-form reading: research, analysis and official publications. */
export function readCard(a) {
  registry.set(a.id, a);
  const kind = a.source.kind || 'news';
  return `
  <article class="read-card kind-${kind}">
    <div class="rc-meta">${kindTag(kind)}<strong>${esc(a.source.name)}</strong></div>
    <h3><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.title)}</a></h3>
    ${a.summary ? `<p class="summary">${esc(a.summary)}</p>` : ''}
    <div class="rc-foot">
      <span style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${time(a)}${countryLinks(a.countries, 3, false)}</span>
      <span class="actions">${saveButton(a)}${shareButton(a)}</span>
    </div>
  </article>`;
}

/** Reporting from newsrooms, as a calm list row. */
export function newsRow(a) {
  registry.set(a.id, a);
  return `
  <article class="news-row">
    <div>
      <div class="nr-meta"><strong>${esc(a.source.name)}</strong><span class="dot-sep"></span>${time(a)}${a.countries.length ? `<span class="dot-sep"></span>${countryLinks(a.countries)}` : ''}</div>
      <h3><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.title)}</a></h3>
      ${a.summary ? `<p class="summary">${esc(a.summary)}</p>` : ''}
      <div class="nr-foot">
        ${kindTag(a.source.kind)}
        ${a.topics.slice(0, 2).map((s) => {
          const t = store.topicBySlug.get(s);
          return t ? `<a class="tag" href="/topic/${s}">${esc(t.name)}</a>` : '';
        }).join('')}
        <span class="actions">${saveButton(a)}${shareButton(a)}</span>
      </div>
    </div>
  </article>`;
}

/** Picks the layout for an article based on what its source publishes. */
export const anyCard = (a) => (a.source.kind && a.source.kind !== 'news' ? readCard(a) : newsRow(a));

/** One World Bank indicator with its latest value, year, trend and source link. */
export function indicatorCard(ind, series, country) {
  const last = series?.at(-1);
  const src = `https://data.worldbank.org/indicator/${ind.code}?locations=${country.code}`;
  if (!last) {
    return `<div class="ind-card empty-ind"><span class="lbl">${esc(ind.label)}</span><span class="unit">${esc(ind.unit || '')}</span>
      <span class="val">No recent data</span><span class="yr">Not reported to the World Bank in the last 15 years</span></div>`;
  }
  const first = series[0];
  return `
  <div class="ind-card">
    <span class="lbl">${esc(ind.label)}</span>
    ${ind.unit ? `<span class="unit">${esc(ind.unit)}</span>` : ''}
    <span class="val">${formatIndicator(last[1], ind.format)}</span>
    <span class="yr">${last[0]}${last[0] < new Date().getFullYear() - 3 ? ' · latest available' : ''}</span>
    ${sparkline(series)}
    ${series.length > 1 ? `<div class="spark-range"><span>${first[0]}</span><span>${last[0]}</span></div>` : ''}
    <a class="src-link" href="${src}" target="_blank" rel="noopener">World Bank ${icon('arrow-up-right')}</a>
  </div>`;
}

export const skeletonRows = (n = 4) => '<div class="skeleton sk-row"></div>'.repeat(n);
export const skeletonCards = (n = 3) => `<div class="card-grid">${'<div class="skeleton sk-card"></div>'.repeat(n)}</div>`;

export function emptyState({ title, body, action = '', iconName = 'book' }) {
  return `<div class="empty"><span class="ic">${icon(iconName)}</span><h3>${esc(title)}</h3><p>${body}</p>${action}</div>`;
}

export function errorState(err) {
  return emptyState({
    title: 'We couldn’t load this just now',
    body: esc(err?.message || 'Something went wrong.'),
    action: '<button class="btn btn-outline" type="button" data-reload>Try again</button>',
  });
}

/**
 * Paged list with "Load more". `fetchPage(cursor)` returns { items, nextCursor }.
 * `layout` is 'rows' (news list) or 'cards' (research grid).
 */
export async function mountFeed(container, fetchPage, { empty, layout = 'rows', render } = {}) {
  container.innerHTML = layout === 'cards' ? skeletonCards() : skeletonRows();
  let cursor = null;
  const list = document.createElement('div');
  list.className = layout === 'cards' ? 'card-grid' : 'news-list';
  const draw = render || (layout === 'cards' ? readCard : newsRow);
  const more = document.createElement('div');
  more.className = 'load-more';

  const load = async () => {
    const btn = more.querySelector('button');
    if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }
    const page = await fetchPage(cursor);
    list.insertAdjacentHTML('beforeend', page.items.map(draw).join(''));
    cursor = page.nextCursor;
    more.innerHTML = cursor ? '<button class="btn btn-outline" type="button">Show more</button>' : '';
    return page;
  };

  try {
    const first = await load();
    container.innerHTML = '';
    if (!first.items.length) {
      container.innerHTML = empty || emptyState({ title: 'Nothing here yet', body: 'New material is collected every hour.' });
      return;
    }
    container.append(list, more);
    more.addEventListener('click', (e) => {
      if (e.target.closest('button')) load().catch((err) => toast(err.message, 'error'));
    });
  } catch (err) {
    container.innerHTML = errorState(err);
  }
}

// ── Toasts ──────────────────────────────────────────────────────────────────
export function toast(message, kind = 'ok', { html = false } = {}) {
  const region = $('[data-toasts]');
  const el = document.createElement('div');
  el.className = `toast ${kind === 'error' ? 'error' : ''}`;
  el.innerHTML = `${icon(kind === 'error' ? 'close' : 'check')}<span>${html ? message : esc(message)}</span>`;
  region.append(el);
  setTimeout(() => el.remove(), 3800);
}

// ── Dialog ──────────────────────────────────────────────────────────────────
export function openDialog(html, onMount) {
  const dialog = $('[data-dialog]');
  dialog.innerHTML = html;
  dialog.showModal();
  const close = () => dialog.close();
  $$('[data-close]', dialog).forEach((b) => b.addEventListener('click', close));
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); }, { once: true });
  onMount?.(dialog, close);
  return dialog;
}

export function confirmDialog({ title, body, confirmLabel = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    const dialog = openDialog(`
      <div class="sheet-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Close">${icon('close')}</button></div>
      <div class="sheet-body"><p>${esc(body)}</p></div>
      <div class="sheet-foot"><button class="btn btn-outline" data-close>Cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-plum'}" data-ok>${esc(confirmLabel)}</button></div>`,
    (d, close) => $('[data-ok]', d).addEventListener('click', () => { resolve(true); close(); }));
    dialog.addEventListener('close', () => resolve(false), { once: true });
  });
}

/** Create or edit a followed set of countries/topics/keywords. Resolves with it, or null. */
export function followEditor(existing = null) {
  const m = existing || { name: '', countries: [], topics: [], keywords: '' };
  return new Promise((resolve) => {
    const dialog = openDialog(`
      <form style="display:contents" novalidate>
        <div class="sheet-head"><h2>${existing ? 'Edit' : 'Follow a subject'}</h2><button type="button" class="icon-btn" data-close aria-label="Close">${icon('close')}</button></div>
        <div class="sheet-body">
          <div class="field"><label for="mon-name">Name</label>
            <input id="mon-name" class="input" name="name" maxlength="80" placeholder="e.g. East African tourism" value="${esc(m.name)}"></div>
          <div class="field"><label>Countries</label>
            <input class="input" type="search" placeholder="Filter countries…" data-country-filter aria-label="Filter countries">
            <div class="check-list">
              ${store.meta.countries.map((c) => `<label class="check-row" data-name="${esc(c.name.toLowerCase())}"><input type="checkbox" name="countries" value="${c.code}" ${m.countries.includes(c.code) ? 'checked' : ''}>${flag(c.code)} ${esc(c.name)}</label>`).join('')}
            </div>
            <span class="hint">Leave empty to follow the whole continent.</span></div>
          <div class="field"><label>Topics</label>
            <div class="chips wrap-chips">
              ${store.meta.topics.map((t) => `<button type="button" class="chip" data-topic="${t.slug}" aria-pressed="${m.topics.includes(t.slug)}">${esc(t.name)}</button>`).join('')}
            </div></div>
          <div class="field"><label for="mon-kw">Keywords <span class="muted">(optional)</span></label>
            <input id="mon-kw" class="input" name="keywords" maxlength="300" placeholder="e.g. port, visa, lithium, fintech" value="${esc(m.keywords)}">
            <span class="hint">Separate with commas. A story matches if it mentions any of them.</span></div>
          <p class="form-error" data-error></p>
        </div>
        <div class="sheet-foot">
          <button type="button" class="btn btn-outline" data-close>Cancel</button>
          <button type="submit" class="btn btn-plum">${existing ? 'Save changes' : 'Follow'}</button>
        </div>
      </form>`,
    (d, close) => {
      const topics = new Set(m.topics);
      $$('[data-topic]', d).forEach((b) => b.addEventListener('click', () => {
        const on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', on);
        on ? topics.add(b.dataset.topic) : topics.delete(b.dataset.topic);
      }));
      $('[data-country-filter]', d).addEventListener('input', (e) => {
        const q = e.target.value.trim().toLowerCase();
        $$('[data-name]', d).forEach((row) => { row.hidden = q && !row.dataset.name.includes(q); });
      });
      $('form', d).addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const data = {
          name: form.name.value.trim(),
          countries: $$('input[name="countries"]:checked', d).map((i) => i.value),
          topics: [...topics],
          keywords: form.keywords.value.trim(),
        };
        if (!data.name) {
          const parts = [...data.countries.map((c) => store.countryByCode.get(c)?.name), ...data.topics.map((t) => store.topicBySlug.get(t)?.name)].filter(Boolean);
          data.name = parts.slice(0, 2).join(' · ') || data.keywords.split(',')[0] || '';
        }
        const btn = $('[type="submit"]', d);
        btn.disabled = true;
        try {
          const saved = await store.saveMonitor(data, existing?.id);
          resolve(saved);
          close();
        } catch (err) {
          const box = $('[data-error]', d);
          box.textContent = err.message;
          box.classList.add('show');
          btn.disabled = false;
        }
      });
    });
    dialog.addEventListener('close', () => resolve(null), { once: true });
  });
}

// ── Global delegated actions (save, share, reload, broken images) ─────────────
export function bindGlobalActions() {
  document.addEventListener('click', async (e) => {
    if (e.target.closest('[data-reload]')) return location.reload();

    const saveBtn = e.target.closest('[data-save]');
    if (saveBtn) {
      const article = registry.get(Number(saveBtn.dataset.save));
      if (!article) return;
      try {
        const nowSaved = await store.toggleSave(article);
        $$(`[data-save="${article.id}"]`).forEach((b) => {
          b.classList.toggle('saved', nowSaved);
          b.setAttribute('aria-pressed', nowSaved);
          b.setAttribute('aria-label', nowSaved ? 'Remove from saved' : 'Save for later');
          b.innerHTML = icon(nowSaved ? 'bookmark-fill' : 'bookmark');
        });
        if (nowSaved && !store.user && store.savedIds.size === 1) {
          toast('Saved on this device. <a href="/signup">Create a free account</a> to keep it everywhere.', 'ok', { html: true });
        } else {
          toast(nowSaved ? 'Saved to your vault' : 'Removed from saved');
        }
      } catch (err) {
        toast(err.message, 'error');
      }
      return;
    }

    const shareBtn = e.target.closest('[data-share]');
    if (shareBtn) {
      const a = registry.get(Number(shareBtn.dataset.share));
      if (!a) return;
      if (navigator.share) {
        navigator.share({ title: a.title, text: `${a.title} (${a.source.name})`, url: a.url }).catch(() => {});
      } else {
        try {
          await navigator.clipboard.writeText(a.url);
          toast('Link copied');
        } catch {
          toast('Could not copy the link', 'error');
        }
      }
    }
  });

  // Publisher images sometimes 404 or block hotlinking: hide them gracefully.
  document.addEventListener('error', (e) => {
    const img = e.target;
    if (img.tagName !== 'IMG' || !img.hasAttribute('data-fallback')) return;
    (img.closest('.news-thumb') || img).remove();
  }, true);
}
