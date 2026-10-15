import { $, $$, esc, flag, icon, timeAgo, fullDate } from './lib.js';
import { store } from './store.js';

/** Articles rendered on screen, by id, so save/share buttons can find the full object. */
const registry = new Map();

export const REGION_COLORS = { North: '#C2502D', West: '#D99A2B', Central: '#2F7D5B', East: '#1E2A5A', Southern: '#7A4E9C' };
export const REGION_NAMES = { North: 'North Africa', West: 'West Africa', Central: 'Central Africa', East: 'East Africa', Southern: 'Southern Africa' };

const topicColor = (slug) => store.topicBySlug.get(slug)?.color || '#C2502D';

function countryFlags(codes, max = 3) {
  if (!codes.length) return '';
  const shown = codes.slice(0, max).map((code) => {
    const c = store.countryByCode.get(code);
    return c ? `<a class="flag-link" href="/country/${c.slug}" title="${esc(c.name)}">${flag(code, 'flag', c.name)}</a>` : '';
  });
  const firstName = codes.length === 1 ? store.countryByCode.get(codes[0])?.name : null;
  return `<span class="flags">${shown.join('')}${firstName ? `<a class="flag-link" href="/country/${store.countryByCode.get(codes[0]).slug}">${esc(firstName)}</a>` : ''}${codes.length > max ? `<span class="muted">+${codes.length - max}</span>` : ''}</span>`;
}

function topicTags(slugs, max = 2) {
  return slugs.slice(0, max).map((s) => {
    const t = store.topicBySlug.get(s);
    return t ? `<a class="tag" href="/topic/${s}" style="--c:${t.color}">${esc(t.name)}</a>` : '';
  }).join('');
}

const saveButton = (a) => {
  const saved = store.isSaved(a.id);
  return `<button class="act ${saved ? 'saved' : ''}" type="button" data-save="${a.id}" aria-pressed="${saved}" aria-label="${saved ? 'Remove from saved' : 'Save story'}" title="${saved ? 'Saved' : 'Save for later'}">${icon(saved ? 'bookmark-fill' : 'bookmark')}</button>`;
};

const image = (src, alt = '') =>
  src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-fallback>` : '';

export function storyCard(a) {
  registry.set(a.id, a);
  return `
  <article class="story" data-id="${a.id}">
    <div class="story-body">
      <div class="meta">
        <span class="source">${esc(a.source.name)}</span>
        <span class="sep"></span>
        <time datetime="${new Date(a.publishedAt * 1000).toISOString()}" title="${esc(fullDate(a.publishedAt))}">${timeAgo(a.publishedAt)}</time>
        ${a.countries.length ? `<span class="sep"></span>${countryFlags(a.countries)}` : ''}
      </div>
      <h3><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.title)}</a></h3>
      ${a.summary ? `<p class="summary">${esc(a.summary)}</p>` : ''}
      <div class="story-foot">
        ${topicTags(a.topics)}
        ${a.clusterSources > 1 ? `<span class="badge-cluster" title="Reported by ${a.clusterSources} publishers">${icon('stack')} ${a.clusterSources} publishers</span>` : ''}
        <div class="story-actions">
          ${saveButton(a)}
          <button class="act" type="button" data-share="${a.id}" aria-label="Share story" title="Share">${icon('share')}</button>
        </div>
      </div>
    </div>
    ${a.image ? `<div class="story-thumb">${image(a.image)}</div>` : ''}
  </article>`;
}

export function topCard(a, lead = false) {
  registry.set(a.id, a);
  const primary = a.countries[0];
  const art = `<div class="art" style="--c:${topicColor(a.topics[0])}">${primary ? flag(primary, '', '') : ''}</div>`;
  const coverage = a.coverage?.length
    ? `<div class="coverage">${a.coverage.slice(0, lead ? 4 : 2).map((c) =>
      `<a href="${esc(c.url)}" target="_blank" rel="noopener"><strong>${esc(c.source)}</strong><span>${esc(c.title)}</span></a>`).join('')}</div>`
    : '';
  return `
  <article class="top-card ${lead ? 'top-lead' : ''}" data-id="${a.id}">
    ${lead ? `<div class="lead-media">${a.image ? art + image(a.image).replace('<img ', '<img style="position:relative" ') : art}</div>` : ''}
    <div class="${lead ? 'lead-body' : 'story-body'}">
      <div class="meta">
        <span class="badge-cluster">${icon('stack')} ${a.clusterSources} publishers</span>
        ${a.countries.length ? countryFlags(a.countries, 4) : ''}
      </div>
      <h3><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.title)}</a></h3>
      ${lead && a.summary ? `<p class="summary">${esc(a.summary)}</p>` : ''}
      <div class="meta"><span class="source">${esc(a.source.name)}</span><span class="sep"></span><span>${timeAgo(a.latestAt || a.publishedAt)}</span>
        <div class="story-actions">${saveButton(a)}<button class="act" type="button" data-share="${a.id}" aria-label="Share story">${icon('share')}</button></div>
      </div>
      ${coverage}
    </div>
  </article>`;
}

export const skeletonFeed = (n = 5) => `<div class="feed">${'<div class="skeleton sk-story"></div>'.repeat(n)}</div>`;

export function emptyState({ title, body, action = '' }) {
  return `<div class="empty"><svg class="empty-mark" viewBox="0 0 40 40" aria-hidden="true"><use href="/assets/img/sprite.svg#mark"/></svg><h3>${esc(title)}</h3><p>${body}</p>${action}</div>`;
}

export function errorState(err, retryLabel = 'Try again') {
  return emptyState({
    title: 'We couldn’t load this just now',
    body: esc(err?.message || 'Something went wrong.'),
    action: `<button class="btn btn-ghost" type="button" data-reload>${retryLabel}</button>`,
  });
}

/**
 * Paged feed with "Load more". `fetchPage(cursor)` returns { items, nextCursor }.
 */
export async function mountFeed(container, fetchPage, { empty } = {}) {
  container.innerHTML = skeletonFeed();
  let cursor = null;
  const list = document.createElement('div');
  list.className = 'feed';
  const more = document.createElement('div');
  more.className = 'load-more';

  const load = async () => {
    const btn = more.querySelector('button');
    if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }
    const page = await fetchPage(cursor);
    list.insertAdjacentHTML('beforeend', page.items.map(storyCard).join(''));
    cursor = page.nextCursor;
    more.innerHTML = cursor ? `<button class="btn btn-ghost" type="button">Load more stories</button>` : '';
    return page;
  };

  try {
    const first = await load();
    container.innerHTML = '';
    if (!first.items.length) {
      container.innerHTML = empty || emptyState({ title: 'No stories yet', body: 'Nothing matches here right now. New stories are collected every hour.' });
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
  setTimeout(() => el.remove(), 3600);
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
      <div class="sheet-foot"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(confirmLabel)}</button></div>`,
    (d, close) => $('[data-ok]', d).addEventListener('click', () => { resolve(true); close(); }));
    dialog.addEventListener('close', () => resolve(false), { once: true });
  });
}

/** Create or edit a monitor. Resolves with the saved monitor, or null if cancelled. */
export function monitorEditor(existing = null) {
  const m = existing || { name: '', countries: [], topics: [], keywords: '' };
  const countries = store.meta.countries;
  return new Promise((resolve) => {
    const dialog = openDialog(`
      <form class="sheet-form" style="display:contents" novalidate>
        <div class="sheet-head"><h2>${existing ? 'Edit monitor' : 'New monitor'}</h2><button type="button" class="icon-btn" data-close aria-label="Close">${icon('close')}</button></div>
        <div class="sheet-body">
          <div class="field"><label for="mon-name">Name</label>
            <input id="mon-name" class="input" name="name" maxlength="80" placeholder="e.g. East African tourism" value="${esc(m.name)}" required></div>
          <div class="field"><label>Countries</label>
            <input class="input" type="search" placeholder="Filter countries…" data-country-filter aria-label="Filter countries">
            <div class="check-list" data-country-list>
              ${countries.map((c) => `<label class="check-row" data-name="${esc(c.name.toLowerCase())}"><input type="checkbox" name="countries" value="${c.code}" ${m.countries.includes(c.code) ? 'checked' : ''}>${flag(c.code)} ${esc(c.name)}</label>`).join('')}
            </div>
            <span class="hint">Leave empty to watch the whole continent.</span></div>
          <div class="field"><label>Topics</label>
            <div class="chips" style="flex-wrap:wrap">
              ${store.meta.topics.map((t) => `<button type="button" class="chip" data-topic="${t.slug}" aria-pressed="${m.topics.includes(t.slug)}"><span class="dot" style="--c:${t.color}"></span>${esc(t.name)}</button>`).join('')}
            </div></div>
          <div class="field"><label for="mon-kw">Keywords <span class="muted">(optional)</span></label>
            <input id="mon-kw" class="input" name="keywords" maxlength="300" placeholder="e.g. port, visa, hotel, fintech" value="${esc(m.keywords)}">
            <span class="hint">Separate with commas. A story matches if it mentions any of them.</span></div>
          <p class="form-error" data-error></p>
        </div>
        <div class="sheet-foot">
          <button type="button" class="btn btn-ghost" data-close>Cancel</button>
          <button type="submit" class="btn btn-primary">${existing ? 'Save changes' : 'Create monitor'}</button>
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

// ── Global delegated actions (save, share, broken images) ─────────────────────
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
          b.setAttribute('aria-label', nowSaved ? 'Remove from saved' : 'Save story');
          b.innerHTML = icon(nowSaved ? 'bookmark-fill' : 'bookmark');
        });
        if (nowSaved && !store.user && store.savedIds.size === 1) {
          toast('Saved on this device. <a href="/signup">Create an account</a> to keep it everywhere.', 'ok', { html: true });
        } else {
          toast(nowSaved ? 'Saved for later' : 'Removed from saved');
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
    const thumb = img.closest('.story-thumb');
    if (thumb) thumb.remove();
    else img.remove();
  }, true);
}
