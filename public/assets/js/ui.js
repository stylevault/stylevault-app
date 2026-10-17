import { $, $$, esc, flag, icon, shortDate, longDate, formatIndicator, sparkline, KIND_LABELS } from './lib.js';
import { store } from './store.js';
import { filterAds, getActiveAds, renderNativeAdHtml } from './ads.js';

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
export function readCard(a, { locked = false } = {}) {
  registry.set(a.id, a);
  const kind = a.source.kind || 'news';
  const imgHtml = a.imageUrl
    ? `<div class="rc-thumb"><img src="${esc(a.imageUrl)}" alt="" loading="lazy" onerror="this.parentElement.remove()"></div>`
    : '';
  return `
  <article class="read-card kind-${kind} ${locked ? 'is-locked' : ''}">
    ${imgHtml}
    <div class="rc-meta">
      ${locked ? `<span class="lock-badge">${icon('shield')} Member Access</span>` : kindTag(kind)}
      <strong>${esc(a.source.name)}</strong>
    </div>
    <h3><a href="${locked ? '/signup?reason=research' : esc(a.url)}" ${locked ? '' : `data-open-article="${a.id}"`}>${esc(a.title)}</a></h3>
    ${a.summary ? `<p class="summary">${esc(a.summary)}</p>` : ''}
    <div class="rc-foot">
      <span style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${time(a)}${countryLinks(a.countries, 3, false)}</span>
      ${locked
        ? `<a class="lock-link" href="/signup?reason=research">Unlock full report ${icon('arrow-right')}</a>`
        : `<span class="actions">${saveButton(a)}${shareButton(a)}</span>`}
    </div>
  </article>`;
}

/** Reporting from newsrooms, as a calm list row, with thumbnail if present. */
export function newsRow(a) {
  registry.set(a.id, a);
  const imgHtml = a.imageUrl
    ? `<div class="news-thumb"><img src="${esc(a.imageUrl)}" alt="" loading="lazy" onerror="this.parentElement.remove()"></div>`
    : '';
  return `
  <article class="news-row ${a.imageUrl ? 'has-thumb' : ''}">
    ${imgHtml}
    <div class="nr-content">
      <div class="nr-meta"><strong>${esc(a.source.name)}</strong><span class="dot-sep"></span>${time(a)}${a.countries.length ? `<span class="dot-sep"></span>${countryLinks(a.countries)}` : ''}</div>
      <h3><a href="${esc(a.url)}" data-open-article="${a.id}">${esc(a.title)}</a></h3>
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

const topicTags = (a, max = 1) => a.topics.slice(0, max).map((s) => {
  const t = store.topicBySlug.get(s);
  return t ? `<a class="tag" href="/topic/${s}">${esc(t.name)}</a>` : '';
}).join('');

/** Daily Edition lead: the photo carries the story, with the headline set over it. */
export function editionLead(a) {
  registry.set(a.id, a);
  return `
  <article class="ed-lead ${a.imageUrl ? '' : 'no-img'}">
    ${a.imageUrl ? `<img class="ed-lead-img" src="${esc(a.imageUrl)}" alt="" onerror="this.closest('.ed-lead').classList.add('no-img');this.remove()">` : ''}
    <div class="ed-lead-body">
      <div class="ed-lead-meta"><span class="ed-pill">Lead story</span><span class="ed-lead-src-wrap"><strong>${esc(a.source.name)}</strong><span class="dot-sep"></span>${time(a)}</span></div>
      <h3><a href="${esc(a.url)}" data-open-article="${a.id}">${esc(a.title)}</a></h3>
      ${a.summary ? `<p class="summary">${esc(a.summary)}</p>` : ''}
      <div class="ed-lead-foot">
        ${countryLinks(a.countries, 3)}
        <span class="actions">${saveButton(a)}${shareButton(a)}</span>
      </div>
    </div>
  </article>`;
}

/** Daily Edition secondary story: numbered, headline-first, no thumbnail. */
export function editionItem(a, n) {
  registry.set(a.id, a);
  return `
  <article class="ed-item">
    <span class="ed-num" aria-hidden="true">${String(n).padStart(2, '0')}</span>
    <div class="ed-item-body">
      <div class="ed-item-meta"><strong>${esc(a.source.name)}</strong><span class="dot-sep"></span>${time(a)}</div>
      <h3><a href="${esc(a.url)}" data-open-article="${a.id}">${esc(a.title)}</a></h3>
      <div class="ed-item-foot">${countryLinks(a.countries, 3)}${topicTags(a)}<span class="actions">${saveButton(a)}</span></div>
    </div>
  </article>`;
}

/** Market Wire: a compact, text-first card for a filtered feed. */
export function wireCard(a) {
  registry.set(a.id, a);
  return `
  <article class="wire-card">
    <div class="wire-card-meta">${countryLinks(a.countries, 2, false)}<strong>${esc(a.source.name)}</strong></div>
    <h3><a href="${esc(a.url)}" data-open-article="${a.id}">${esc(a.title)}</a></h3>
    <div class="wire-card-foot">${time(a)}${topicTags(a)}<span class="actions">${saveButton(a)}${shareButton(a)}</span></div>
  </article>`;
}

/** Elevated card for Following feeds. */
export function streamCard(a) {
  registry.set(a.id, a);
  const kind = a.source.kind || 'news';
  const isResearch = kind !== 'news';
  const imgHtml = a.imageUrl
    ? `<div class="sc-thumb"><img src="${esc(a.imageUrl)}" alt="" loading="lazy" onerror="this.parentElement.remove()"></div>`
    : '';
  return `
  <article class="stream-card ${isResearch ? 'is-research' : ''}">
    <div class="sc-head">
      <div class="sc-source-group">
        ${a.countries.length ? `<span class="sc-country-Chip">${countryLinks(a.countries, 2, true)}</span>` : ''}
        <strong class="sc-publisher">${esc(a.source.name)}</strong>
        ${kindTag(kind)}
      </div>
      <span class="sc-time">${time(a)}</span>
    </div>
    ${imgHtml}
    <div class="sc-body">
      <div class="sc-copy">
        <h3 class="sc-title"><a href="${esc(a.url)}" data-open-article="${a.id}">${esc(a.title)}</a></h3>
        ${a.summary ? `<p class="sc-summary">${esc(a.summary)}</p>` : ''}
      </div>
    </div>
    <div class="sc-foot">
      <div class="sc-tags">
        ${topicTags(a, 2)}
        <a class="sc-read-link" href="${esc(a.url)}" data-open-article="${a.id}">Read story ${icon('arrow-right')}</a>
      </div>
      <div class="sc-actions">${saveButton(a)}${shareButton(a)}</div>
    </div>
  </article>`;
}

/** Elevated mini-card for the Home page secondary columns (Across Africa today & Research for you). */
export function homeReadCard(a) {
  registry.set(a.id, a);
  const kind = a.source.kind && a.source.kind !== 'news' ? KIND_LABELS[a.source.kind] : '';
  const isResearch = Boolean(kind);
  const tags = topicTags(a, 2);
  return `
    <article class="uh-read ${isResearch ? 'is-research' : ''}">
      <div class="uh-read-top">
        <div class="uh-read-badges">
          ${a.countries?.length ? countryLinks(a.countries, 2, true) : ''}
          <span class="uh-read-source">${esc(a.source.name)}</span>
          ${kind ? `<span class="uh-read-kind">${esc(kind)}</span>` : ''}
        </div>
        <span class="uh-read-date">${shortDate(a.publishedAt)}</span>
      </div>
      ${a.imageUrl ? `<div class="uh-read-thumb"><img src="${esc(a.imageUrl)}" alt="" loading="lazy" onerror="this.parentElement.remove()"></div>` : ''}
      <div class="uh-read-main">
        <h3><a href="${esc(a.url)}" data-open-article="${a.id}">${esc(a.title)}</a></h3>
      </div>
      ${tags ? `<div class="uh-read-tags">${tags}</div>` : ''}
      <div class="uh-read-foot">
        <a class="uh-read-cta" href="${esc(a.url)}" data-open-article="${a.id}">Read story ${icon('arrow-right')}</a>
        <div class="uh-read-actions">${saveButton(a)}${shareButton(a)}</div>
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
    <a class="src-link" href="${src}">World Bank ${icon('arrow-right')}</a>
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

  let nativeAdIndex = 0;
  const load = async () => {
    const btn = more.querySelector('button');
    if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }
    const [page, activeAds] = await Promise.all([
      fetchPage(cursor),
      getActiveAds().catch(() => []),
    ]);
    const nativeAds = filterAds(activeAds, { type: 'native' });

    let html = '';
    (page.items || []).forEach((item, idx) => {
      html += draw(item);
      if (layout === 'rows' && (idx + 1) === 4 && nativeAds.length) {
        const ad = nativeAds[nativeAdIndex % nativeAds.length];
        nativeAdIndex++;
        html += renderNativeAdHtml(ad);
      }
    });

    list.insertAdjacentHTML('beforeend', html);
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
          const cNames = data.countries.map((c) => store.countryByCode.get(c)?.name).filter(Boolean);
          const tNames = data.topics.map((t) => store.topicBySlug.get(t)?.name).filter(Boolean);
          const parts = [...cNames, ...tNames];
          if (!parts.length) {
            data.name = data.keywords ? `“${data.keywords.split(',')[0].trim()}”` : 'My feed';
          } else if (parts.length === 1) {
            data.name = parts[0];
          } else if (parts.length === 2) {
            data.name = `${parts[0]} & ${parts[1]}`;
          } else if (parts.length === 3) {
            data.name = `${parts[0]}, ${parts[1]} & ${parts[2]}`;
          } else {
            const extra = parts.length - 2;
            data.name = `${parts.slice(0, 2).join(', ')} +${extra} more`;
          }
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

    const articleLink = e.target.closest('[data-open-article]');
    if (articleLink && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      if (!store.user) {
        e.preventDefault();
        openSignupPromptModal({
          title: 'Join StyleVault to Read Full Stories',
          subtitle: 'Create a free account to read verified news and research reports from 90+ African newsrooms.',
          destination: articleLink.getAttribute('href') || '/',
        });
        return;
      }
      const a = registry.get(Number(articleLink.dataset.openArticle));
      if (a) {
        e.preventDefault();
        openArticleReader(a);
        return;
      }
    }

    const saveBtn = e.target.closest('[data-save]');
    if (saveBtn) {
      if (!store.user) {
        e.preventDefault();
        openSignupPromptModal({
          title: 'Save Stories to Your Vault',
          subtitle: 'Create a free StyleVault account to bookmark stories and sync your personal vault across devices.',
        });
        return;
      }
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
        toast(nowSaved ? 'Saved for later' : 'Removed from saved');
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

/** In-site Story Reader modal so clicking a story keeps users inside StyleVault (cute, compact, no clutter). */
export function openArticleReader(a) {
  if (a) store.recordRead(a);
  const kind = a.source?.kind && a.source.kind !== 'news' ? KIND_LABELS[a.source.kind] : 'News story';
  const saved = store.isSaved(a.id);
  const countries = (a.countries || []).map((code) => store.countryByCode.get(code)).filter(Boolean);
  const topics = (a.topics || []).map((slug) => store.topicBySlug.get(slug)).filter(Boolean);

  const isInternal = Boolean(a.contentHtml) || (a.url && a.url.startsWith('/article/'));

  return openDialog(`
    <div class="sheet-drag-handle" aria-hidden="true"></div>
    <div class="sheet-head ar-head">
      <div class="ar-source-meta">
        <span class="ar-kind-badge">${esc(kind)}</span>
        <strong class="ar-source-name">${esc(a.source?.name || 'African Publisher')}</strong>
        <span class="dot-sep"></span>
        <span class="ar-date">${shortDate(a.publishedAt)}</span>
      </div>
      <button type="button" class="icon-btn ar-close-btn" data-close aria-label="Close">${icon('close')}</button>
    </div>
    <div class="sheet-body ar-body">
      ${a.imageUrl ? `<div class="ar-hero-img"><img src="${esc(a.imageUrl)}" alt="" onerror="this.parentElement.remove()"></div>` : ''}
      <h2 class="ar-title">${esc(a.title)}</h2>
      ${a.summary ? `<p class="ar-summary">${esc(a.summary)}</p>` : `<p class="ar-summary">This story was published by <strong>${esc(a.source?.name || 'an African newsroom')}</strong>. You can read the full reporting from the publisher below.</p>`}
      <div class="ar-prose prose" data-ar-body style="${a.contentHtml ? 'margin-top:16px;border-top:1px solid var(--line);padding-top:16px;' : 'display:none;'}">
        ${a.contentHtml || ''}
      </div>
      ${countries.length || topics.length ? `
        <div class="ar-related" style="margin-top:20px">
          <div class="ar-chips">
            ${countries.map((c) => `<a class="crit-pill is-country" href="/country/${c.slug}" data-ar-nav>${flag(c.code)} ${esc(c.name)}</a>`).join('')}
            ${topics.map((t) => `<a class="crit-pill is-topic" href="/topic/${t.slug}" data-ar-nav>${esc(t.name)}</a>`).join('')}
          </div>
        </div>
      ` : ''}
    </div>
    <div class="sheet-foot ar-foot">
      <div class="ar-foot-left">
        <button type="button" class="btn btn-outline btn-sm ar-btn ${saved ? 'is-saved' : ''}" data-ar-save title="${saved ? 'Saved' : 'Save for later'}">
          ${icon(saved ? 'bookmark-fill' : 'bookmark')} <span>${saved ? 'Saved' : 'Save'}</span>
        </button>
        <button type="button" class="btn btn-outline btn-sm ar-btn" data-share="${a.id}" title="Share">
          ${icon('share')} <span>Share</span>
        </button>
      </div>
      ${isInternal ? `
        <a class="btn btn-plum btn-sm ar-read-btn" href="/article/${a.id}" data-ar-nav>
          <span>Open Full Page</span> ${icon('arrow-right')}
        </a>
      ` : `
        <a class="btn btn-plum btn-sm ar-read-btn" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">
          <span>Read on ${esc(a.source?.name || 'source')}</span> ${icon('arrow-right')}
        </a>
      `}
    </div>
  `, (dialog, close) => {
    $$('[data-ar-nav]', dialog).forEach((link) => {
      link.addEventListener('click', () => close());
    });

    // If internal and contentHtml isn't yet loaded, fetch it
    if (isInternal && !a.contentHtml) {
      api.article(a.id).then((res) => {
        if (res.article?.contentHtml) {
          a.contentHtml = res.article.contentHtml;
          const bodyEl = $('[data-ar-body]', dialog);
          if (bodyEl) {
            bodyEl.innerHTML = a.contentHtml;
            bodyEl.style.display = 'block';
            bodyEl.style.marginTop = '16px';
            bodyEl.style.borderTop = '1px solid var(--line)';
            bodyEl.style.paddingTop = '16px';
          }
        }
      }).catch(() => {});
    }

    const saveBtn = $('[data-ar-save]', dialog);
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        try {
          const nowSaved = await store.toggleSave(a);
          saveBtn.classList.toggle('is-saved', nowSaved);
          saveBtn.innerHTML = `${icon(nowSaved ? 'bookmark-fill' : 'bookmark')} <span>${nowSaved ? 'Saved' : 'Save'}</span>`;
          $$(`[data-save="${a.id}"]`).forEach((b) => {
            b.classList.toggle('saved', nowSaved);
            b.setAttribute('aria-pressed', nowSaved);
            b.innerHTML = icon(nowSaved ? 'bookmark-fill' : 'bookmark');
          });
          toast(nowSaved ? 'Saved for later' : 'Removed from saved');
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    }
  });
}

/** Customized compact modal for switching sections on a country page. */
export function openCountrySectionModal({ country: c, activeTab = 'overview', onSelectTab } = {}) {
  const sections = [
    { id: 'overview', icon: '🏠', title: 'Overview', desc: 'Country profile, capital, population, currency & trade blocs' },
    { id: 'indicators', icon: '📊', title: 'Economic Numbers', desc: 'World Bank indicators & 15-year historical trends' },
    { id: 'news', icon: '📰', title: 'Latest News', desc: 'Reporting from verified local newsrooms & regional bureaus' },
    { id: 'research', icon: '📑', title: 'Research & Reports', desc: 'Policy papers, university studies & think tank analyses' },
    { id: 'sources', icon: '🎙️', title: 'Local Newsrooms', desc: `Publishers and journalists covering ${c.name}` },
    { id: 'reading', icon: '🔗', title: 'Official & Useful Links', desc: 'World Bank, IMF, UN Data & Colony guides' },
  ];

  return openDialog(`
    <div class="sheet-drag-handle" aria-hidden="true"></div>
    <div class="sheet-head sec-modal-head">
      <div style="display:flex;align-items:center;gap:10px;min-width:0">
        ${flag(c.code, 'cf-flag-modal')}
        <div style="min-width:0">
          <h2 style="margin:0;font-size:1.12rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Explore ${esc(c.name)}</h2>
          <p class="sec-modal-sub">Jump to any section</p>
        </div>
      </div>
      <button type="button" class="icon-btn" data-close aria-label="Close">${icon('close')}</button>
    </div>
    <div class="sheet-body sec-modal-body" style="padding:14px 18px;max-height:75vh;overflow-y:auto">
      <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);margin-bottom:8px">
        Country Sections
      </div>
      <div class="sec-modal-list">
        ${sections.map((s) => `
          <button type="button" class="sec-modal-row ${activeTab === s.id ? 'is-active' : ''}" data-sec-tab="${s.id}">
            <span class="smr-icon">${s.icon}</span>
            <div class="smr-info">
              <strong class="smr-title">${s.title}</strong>
              <span class="smr-desc">${s.desc}</span>
            </div>
            <div class="smr-check" aria-hidden="true">
              ${activeTab === s.id ? `<span class="fmi-active-pill">${icon('check')} Viewing</span>` : icon('arrow-right')}
            </div>
          </button>
        `).join('')}
      </div>
    </div>
  `, (dialog, close) => {
    $$('[data-sec-tab]', dialog).forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.secTab;
        close();
        onSelectTab?.(id);
      });
    });
  });
}

/** Customized modal for switching between followed items on the Following page. */
export function openFollowingSwitcherModal({ list = [], activeId = '', onSelect, onNew } = {}) {
  const describeItem = (m) => {
    const parts = [];
    if (!m.countries?.length) parts.push('🌍 All 54 countries');
    else {
      m.countries.slice(0, 2).forEach((code) => {
        const c = store.countryByCode.get(code);
        if (c) parts.push(`${c.name}`);
      });
      if (m.countries.length > 2) parts.push(`+${m.countries.length - 2} more`);
    }
    m.topics?.slice(0, 2).forEach((slug) => {
      const t = store.topicBySlug.get(slug);
      if (t) parts.push(t.name);
    });
    if (m.keywords) parts.push(`“${m.keywords}”`);
    return parts.join(' · ');
  };

  return openDialog(`
    <div class="sheet-drag-handle" aria-hidden="true"></div>
    <div class="sheet-head sec-modal-head">
      <div>
        <h2 style="margin:0;font-size:1.12rem">What you follow</h2>
        <p class="sec-modal-sub">Pick any item below to see its latest stories</p>
      </div>
      <button type="button" class="icon-btn" data-close aria-label="Close">${icon('close')}</button>
    </div>
    ${list.length > 4 ? `
      <div class="cpm-toolbar">
        <div class="cpm-search-bar">
          <span class="cpm-search-icon" aria-hidden="true">${icon('search')}</span>
          <input type="search" class="input cpm-input" placeholder="Search what you follow…" data-flw-modal-search aria-label="Search what you follow">
        </div>
      </div>
    ` : ''}
    <div class="sheet-body sec-modal-body">
      <div class="flw-modal-list" data-flw-modal-list>
        ${list.map((m) => {
          const isSelected = m.id === activeId;
          const firstCountry = m.countries?.length === 1 ? store.countryByCode.get(m.countries[0]) : null;
          return `
            <button type="button" class="flw-modal-item ${isSelected ? 'is-selected' : ''}" data-item-id="${esc(m.id)}" data-search-text="${esc((m.name + ' ' + describeItem(m)).toLowerCase())}">
              <div class="fmi-badge" aria-hidden="true">
                ${firstCountry ? flag(firstCountry.code, 'flag', '') : '<span class="fmi-dot"></span>'}
              </div>
              <div class="fmi-info">
                <strong class="fmi-title">${esc(m.name)}</strong>
                <span class="fmi-sub">${esc(describeItem(m))}</span>
              </div>
              <div class="fmi-check" aria-hidden="true">
                ${isSelected ? `<span class="fmi-active-pill">${icon('check')} Viewing</span>` : icon('arrow-right')}
              </div>
            </button>
          `;
        }).join('')}
      </div>
    </div>
    <div class="sheet-foot" style="justify-content:space-between">
      <button type="button" class="btn btn-outline btn-sm" data-close>Close</button>
      <button type="button" class="btn btn-plum btn-sm" data-flw-modal-new>${icon('plus')} Follow something new</button>
    </div>
  `, (dialog, close) => {
    const searchInput = $('[data-flw-modal-search]', dialog);
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim().toLowerCase();
        $$('.flw-modal-item', dialog).forEach((btn) => {
          btn.hidden = Boolean(q && !btn.dataset.searchText.includes(q));
        });
      });
    }
    $$('.flw-modal-item', dialog).forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.itemId;
        close();
        onSelect?.(id);
      });
    });
    const newBtn = $('[data-flw-modal-new]', dialog);
    if (newBtn) {
      newBtn.addEventListener('click', () => {
        close();
        onNew?.();
      });
    }
  });
}

/** Dropdown menu modal for filtering Stories for you on the signed-in Home page. */
export function openHomeFeedSwitcherModal({ list = [], activeTab = 'all', onSelect } = {}) {
  const describeItem = (m) => {
    const parts = [];
    if (!m.countries?.length) parts.push('🌍 All 54 countries');
    else {
      m.countries.slice(0, 2).forEach((code) => {
        const c = store.countryByCode.get(code);
        if (c) parts.push(c.name);
      });
      if (m.countries.length > 2) parts.push(`+${m.countries.length - 2} more`);
    }
    m.topics?.slice(0, 2).forEach((slug) => {
      const t = store.topicBySlug.get(slug);
      if (t) parts.push(t.name);
    });
    return parts.join(' · ');
  };

  return openDialog(`
    <div class="sheet-drag-handle" aria-hidden="true"></div>
    <div class="sheet-head sec-modal-head">
      <div>
        <h2 style="margin:0;font-size:1.12rem">Filter stories for you</h2>
        <p class="sec-modal-sub">Choose a followed place or topic</p>
      </div>
      <button type="button" class="icon-btn" data-close aria-label="Close">${icon('close')}</button>
    </div>
    <div class="sheet-body sec-modal-body">
      <div class="flw-modal-list">
        <button type="button" class="flw-modal-item ${activeTab === 'all' ? 'is-selected' : ''}" data-tab-value="all" data-tab-name="Everything">
          <div class="fmi-badge" aria-hidden="true" style="font-size:1.2rem">🌍</div>
          <div class="fmi-info">
            <strong class="fmi-title">Everything</strong>
            <span class="fmi-sub">All stories across the ${list.length} places and topics you follow</span>
          </div>
          <div class="fmi-check" aria-hidden="true">
            ${activeTab === 'all' ? `<span class="fmi-active-pill">${icon('check')} Viewing</span>` : icon('arrow-right')}
          </div>
        </button>

        ${list.map((m, i) => {
          const tabKey = String(i);
          const isSelected = activeTab === tabKey;
          const firstCountry = m.countries?.length === 1 ? store.countryByCode.get(m.countries[0]) : null;
          return `
            <button type="button" class="flw-modal-item ${isSelected ? 'is-selected' : ''}" data-tab-value="${tabKey}" data-tab-name="${esc(m.name)}">
              <div class="fmi-badge" aria-hidden="true">
                ${firstCountry ? flag(firstCountry.code, 'flag', '') : '<span class="fmi-dot"></span>'}
              </div>
              <div class="fmi-info">
                <strong class="fmi-title">${esc(m.name)}</strong>
                <span class="fmi-sub">${esc(describeItem(m))}</span>
              </div>
              <div class="fmi-check" aria-hidden="true">
                ${isSelected ? `<span class="fmi-active-pill">${icon('check')} Viewing</span>` : icon('arrow-right')}
              </div>
            </button>
          `;
        }).join('')}
      </div>
    </div>
    <div class="sheet-foot">
      <button type="button" class="btn btn-outline btn-sm" data-close>Close</button>
    </div>
  `, (dialog, close) => {
    $$('[data-tab-value]', dialog).forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.tabValue;
        const name = btn.dataset.tabName;
        close();
        onSelect?.(val, name);
      });
    });
  });
}

/**
 * Compact branded single-choice picker (replaces native selects on mobile).
 * options: [{ value, label, flag?, hint? }]
 */
export function openOptionPicker({ title, kicker = '', iconName = 'sliders', options = [], selected = '', searchable = false, onSelect } = {}) {
  const row = (o) => `
    <button type="button" class="op-item ${o.value === selected ? 'is-selected' : ''}" data-op-value="${esc(o.value)}" data-op-label="${esc(o.label.toLowerCase())}" role="option" aria-selected="${o.value === selected}">
      <span class="op-badge" aria-hidden="true">${o.flag ? flag(o.flag, 'flag', '') : icon(o.icon || 'globe')}</span>
      <span class="op-label">${esc(o.label)}${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</span>
      <span class="op-check" aria-hidden="true">${icon('check')}</span>
    </button>`;

  return openDialog(`
    <div class="op-head">
      <span class="op-head-icon" aria-hidden="true">${icon(iconName)}</span>
      <div class="op-head-copy">
        ${kicker ? `<span class="op-kicker">${esc(kicker)}</span>` : ''}
        <h2>${esc(title)}</h2>
      </div>
      <button type="button" class="op-close" data-close aria-label="Close">${icon('close')}</button>
    </div>
    ${searchable ? `
      <div class="op-search">
        ${icon('search')}
        <input type="search" placeholder="Search" data-op-search aria-label="Search options" autocomplete="off">
      </div>` : ''}
    <div class="op-list" role="listbox">
      ${options.map(row).join('')}
      <p class="op-empty" data-op-empty hidden>No matches</p>
    </div>
  `, (dialog, close) => {
    dialog.classList.add('op-sheet');
    dialog.addEventListener('close', () => dialog.classList.remove('op-sheet'), { once: true });
    $$('[data-op-value]', dialog).forEach((btn) => btn.addEventListener('click', () => {
      close();
      onSelect?.(btn.dataset.opValue);
    }));
    const search = $('[data-op-search]', dialog);
    if (search) {
      search.addEventListener('input', () => {
        const q = search.value.trim().toLowerCase();
        let shown = 0;
        $$('[data-op-value]', dialog).forEach((b) => {
          const hit = !q || b.dataset.opLabel.includes(q);
          b.hidden = !hit;
          if (hit) shown++;
        });
        $('[data-op-empty]', dialog).hidden = shown > 0;
      });
    }
    $('.op-item.is-selected', dialog)?.scrollIntoView({ block: 'center' });
  });
}

// ── Cute Branded Modals ─────────────────────────────────────────────────────

/** Cute Branded Modal prompting guests to sign up when attempting to access restricted features. */
export function openSignupPromptModal({
  title = 'Join StyleVault for free',
  subtitle = 'Create a free account to explore all 54 African countries, 15 years of World Bank numbers, and daily news from across the continent.',
  destination = '/',
  navigate,
} = {}) {
  const nextQs = destination && destination !== '/' ? `?next=${encodeURIComponent(destination)}` : '';
  return openDialog(`
    <div class="sheet-drag-handle" aria-hidden="true"></div>
    <div class="sheet-head spm-head">
      <div class="spm-badge-wrap">
        <div class="spm-badge" aria-hidden="true">${icon('shield')}</div>
        <div>
          <h2 style="margin:0;font-size:1.15rem">${esc(title)}</h2>
        </div>
      </div>
      <button type="button" class="icon-btn" data-close aria-label="Close">${icon('close')}</button>
    </div>
    <div class="sheet-body spm-body">
      <p class="spm-desc">${esc(subtitle)}</p>
      <div class="spm-perks">
        <div class="spm-perk">${icon('check')}<span><strong>All 54 Countries:</strong> Key facts, currency info, and local news in one place</span></div>
        <div class="spm-perk">${icon('check')}<span><strong>Daily News &amp; Research:</strong> Fresh stories and reports from 90+ African sources</span></div>
        <div class="spm-perk">${icon('check')}<span><strong>Always Free:</strong> Takes 30 seconds to join, no credit card needed</span></div>
      </div>
      <div class="spm-actions">
        <a class="btn btn-plum btn-block spm-btn" href="/signup${nextQs}">Create free account in 30s ${icon('arrow-right')}</a>
        <a class="btn btn-outline btn-block spm-sub-btn" href="/login${nextQs}">Already a member? Sign in</a>
      </div>
    </div>
  `, (dialog, close) => {
    $$('a[href]', dialog).forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const href = a.getAttribute('href');
        close();
        if (navigate) navigate(href);
        else location.href = href;
      });
    });
  });
}

/** Cute Branded Modal for selecting from all 54 African countries with instant search and regional tabs. */
export function openCountryPickerModal({ onSelect, isGuest, navigate } = {}) {
  const allCountries = store.meta.countries || [];
  const REGION_ORDER = [
    { key: 'North', name: 'North Africa', icon: '🏛️' },
    { key: 'West', name: 'West Africa', icon: '🌴' },
    { key: 'Central', name: 'Central Africa', icon: '🌿' },
    { key: 'East', name: 'East Africa', icon: '⛰️' },
    { key: 'Southern', name: 'Southern Africa', icon: '🌊' },
  ];

  // Group countries by region
  const grouped = REGION_ORDER.map((reg) => ({
    ...reg,
    countries: allCountries.filter((c) => c.region === reg.key),
  }));

  const outlets = (c) => {
    const n = Number(c.sources) || 0;
    return n ? `${n} ${n === 1 ? 'source' : 'sources'}` : '';
  };

  return openDialog(`
    <div class="sheet-drag-handle" aria-hidden="true"></div>
    <div class="cpm-head">
      <div>
        <h2>Choose a country</h2>
        <p class="cpm-sub">${allCountries.length || 54} countries across five regions</p>
      </div>
      <button type="button" class="icon-btn" data-close aria-label="Close">${icon('close')}</button>
    </div>
    <div class="cpm-toolbar">
      <div class="cpm-search-bar">
        <span class="cpm-search-icon" aria-hidden="true">${icon('search')}</span>
        <input type="search" class="cpm-input" placeholder="Search a country or capital" data-cpm-search aria-label="Search countries" autocomplete="off">
        <button type="button" class="cpm-clear-btn" data-cpm-clear hidden aria-label="Clear search">${icon('close')}</button>
      </div>
      <div class="cpm-tabs" role="tablist" aria-label="Filter by region">
        <button type="button" class="cpm-tab" role="tab" aria-selected="true" data-cpm-region="all">All</button>
        ${grouped.map((g) => `<button type="button" class="cpm-tab" role="tab" aria-selected="false" data-cpm-region="${g.key}">${esc(g.name.replace(' Africa', ''))}</button>`).join('')}
      </div>
    </div>
    <div class="cpm-body">
      ${grouped.map((group) => `
        <section class="cpm-region-section" data-cpm-section="${group.key}">
          <h3 class="cpm-region-label">${esc(group.name)} <span>${group.countries.length}</span></h3>
          ${group.countries.map((c) => `
            <button type="button" class="cpm-card" data-code="${c.code}" data-slug="${c.slug}" data-name="${esc(c.name.toLowerCase())}" data-capital="${esc((c.capital || '').toLowerCase())}">
              <span class="cpm-flag">${flag(c.code, 'flag', '')}</span>
              <span class="cpm-card-info">
                <span class="cpm-card-name">${esc(c.name)}</span>
                <span class="cpm-card-sub">${esc(c.capital || '')}${c.capital && outlets(c) ? ' · ' : ''}${outlets(c)}</span>
              </span>
              <span class="cpm-card-go" aria-hidden="true">${icon('arrow-right')}</span>
            </button>
          `).join('')}
        </section>
      `).join('')}
      <div class="cpm-empty" data-cpm-empty hidden>
        <strong>No match</strong>
        <span>Try another country or capital city.</span>
      </div>
    </div>
  `, (dialog, close) => {
    const input = $('[data-cpm-search]', dialog);
    const clearBtn = $('[data-cpm-clear]', dialog);
    const tabs = $$('[data-cpm-region]', dialog);
    const sections = $$('[data-cpm-section]', dialog);
    const empty = $('[data-cpm-empty]', dialog);
    let activeRegion = 'all';

    function filter() {
      const q = input.value.trim().toLowerCase();
      clearBtn.hidden = !q;
      let totalVisible = 0;

      sections.forEach((sec) => {
        const secRegion = sec.dataset.cpmSection;
        const matchesRegion = activeRegion === 'all' || secRegion === activeRegion;
        if (!matchesRegion) {
          sec.hidden = true;
          return;
        }

        let secVisible = 0;
        const cards = $$('.cpm-card', sec);
        cards.forEach((card) => {
          const matchesText = !q || card.dataset.name.includes(q) || card.dataset.capital.includes(q);
          card.hidden = !matchesText;
          if (matchesText) secVisible++;
        });

        sec.hidden = secVisible === 0;
        totalVisible += secVisible;
      });

      empty.hidden = totalVisible > 0;
    }

    input.addEventListener('input', filter);
    clearBtn.addEventListener('click', () => { input.value = ''; input.focus(); filter(); });
    if (window.innerWidth > 640) setTimeout(() => input.focus(), 60);

    tabs.forEach((tab) => tab.addEventListener('click', () => {
      activeRegion = tab.dataset.cpmRegion;
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      $('.cpm-body', dialog).scrollTop = 0;
      filter();
    }));

    $$('.cpm-card', dialog).forEach((card) => {
      card.addEventListener('click', () => {
        const code = card.dataset.code;
        const slug = card.dataset.slug;
        const country = store.countryByCode.get(code);
        close();
        if (onSelect) {
          onSelect(country);
        } else if (isGuest) {
          openSignupPromptModal({
            title: `Explore ${country?.name || 'this country'}`,
            subtitle: `Create a free StyleVault account to view the full ${country?.name || ''} page, 15 years of World Bank numbers, and local news.`,
            destination: `/country/${slug}`,
            navigate,
          });
        } else {
          if (navigate) navigate(`/country/${slug}`);
          else location.href = `/country/${slug}`;
        }
      });
    });
  });
}

/** Cute Branded Modal for selecting strategic sectors/topics. */
export function openSectorPickerModal({ onSelect, currentTopic = '' } = {}) {
  const topics = [
    { slug: '', name: 'All Topics', icon: '🌍', desc: 'See news and reports across every topic' },
    { slug: 'finance', name: 'Finance & Fintech', icon: '💳', desc: 'Banking, startups, central banks, and mobile money' },
    { slug: 'energy', name: 'Energy, Power & Climate', icon: '⚡', desc: 'Solar, power grids, oil and gas, and clean energy' },
    { slug: 'trade', name: 'Trade & Supply Chains', icon: '🚢', desc: 'AfCFTA, ports, borders, and moving goods across Africa' },
    { slug: 'mining', name: 'Mining & Minerals', icon: '⛏️', desc: 'Lithium, copper, cobalt, gold, and local processing' },
    { slug: 'tech', name: 'Tech, Telecom & AI', icon: '📱', desc: 'Internet access, software startups, and digital tools' },
    { slug: 'agriculture', name: 'Agriculture & Food', icon: '🌱', desc: 'Farming, food prices, crops, and food supply' },
    { slug: 'infrastructure', name: 'Infrastructure & Ports', icon: '🏗️', desc: 'Railways, ports, roads, and transport' },
    { slug: 'policy', name: 'Policy & Government', icon: '🏛️', desc: 'Laws, elections, public budgets, and regional agreements' },
  ];

  return openDialog(`
    <div class="sheet-drag-handle" aria-hidden="true"></div>
    <div class="sheet-head sec-modal-head">
      <div>
        <h2 style="margin:0;font-size:1.15rem">Choose a Topic</h2>
        <p class="sec-modal-sub">Filter news and reports by the subject you care about</p>
      </div>
      <button type="button" class="icon-btn" data-close aria-label="Close">${icon('close')}</button>
    </div>
    <div class="sheet-body sec-modal-body">
      <div class="sec-modal-grid">
        ${topics.map((t) => {
          const isSelected = currentTopic === t.slug;
          return `
            <button type="button" class="sec-modal-card ${isSelected ? 'is-selected' : ''}" data-slug="${t.slug}">
              <div class="smc-icon" aria-hidden="true">${t.icon}</div>
              <div class="smc-info">
                <strong class="smc-title">${esc(t.name)}</strong>
                <span class="smc-desc">${esc(t.desc)}</span>
              </div>
              <div class="smc-check" aria-hidden="true">${isSelected ? icon('check') : icon('arrow-right')}</div>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `, (dialog, close) => {
    $$('.sec-modal-card', dialog).forEach((card) => {
      card.addEventListener('click', () => {
        const slug = card.dataset.slug;
        close();
        onSelect?.(slug);
      });
    });
  });
}
