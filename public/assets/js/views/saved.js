import { $, $$, esc, flag, icon, shortDate } from '../lib.js';
import { store } from '../store.js';
import { emptyState, errorState, openArticleReader, openDialog, skeletonRows, toast } from '../ui.js';

/** Modal to save an external link into the user's reading list. */
export function openSaveCustomLinkModal({ onSaved } = {}) {
  return openDialog(`
    <div class="sheet-drag-handle" aria-hidden="true"></div>
    <div class="sl-head">
      <div class="sl-head-copy">
        <h2>Save a link</h2>
        <p>Keep any article or report from the web.</p>
      </div>
      <button type="button" class="icon-btn" data-close aria-label="Close">${icon('close')}</button>
    </div>
    <form class="sl-form" data-save-link-form>
      <div class="sl-body">
        <div class="sl-field">
          <label for="link-url">Link</label>
          <input type="url" id="link-url" name="url" class="input sl-input" placeholder="https://" required autofocus>
        </div>
        <div class="sl-field">
          <label for="link-title">Title</label>
          <input type="text" id="link-title" name="title" class="input sl-input" placeholder="What is it about?" required>
        </div>
        <details class="sl-more">
          <summary>${icon('plus')} Add publisher or note</summary>
          <div class="sl-more-body">
            <div class="sl-field">
              <label for="link-source">Publisher</label>
              <input type="text" id="link-source" name="source" class="input sl-input" placeholder="e.g. Reuters">
            </div>
            <div class="sl-field">
              <label for="link-note">Note</label>
              <textarea id="link-note" name="note" class="input sl-input sl-textarea" placeholder="A reminder for yourself"></textarea>
            </div>
          </div>
        </details>
      </div>
      <div class="sl-foot">
        <button type="button" class="btn btn-outline" data-close>Cancel</button>
        <button type="submit" class="btn btn-plum">Save link</button>
      </div>
    </form>
  `, (dialog, close) => {
    const form = $('[data-save-link-form]', dialog);
    const urlInput = $('#link-url', form);
    const sourceInput = $('#link-source', form);

    // Auto-fill publisher from domain if left empty
    urlInput.addEventListener('blur', () => {
      if (!sourceInput.value.trim() && urlInput.value.trim()) {
        try {
          let u = urlInput.value.trim();
          if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
          const host = new URL(u).hostname.replace(/^www\./, '');
          sourceInput.placeholder = host;
        } catch {}
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const url = fd.get('url')?.toString();
      const title = fd.get('title')?.toString();
      const source = fd.get('source')?.toString();
      const note = fd.get('note')?.toString();

      try {
        const item = store.saveCustomLink({ url, title, source, note });
        toast('Link saved to your reading list');
        close();
        onSaved?.(item);
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  });
}

function renderSavedArticleCard(a) {
  const c = a.countries?.[0] ? store.countryByCode.get(a.countries[0]) : null;
  const t = a.topics?.[0] ? store.topicBySlug.get(a.topics[0]) : null;
  const isResearch = a.kind === 'research' || a.kind === 'analysis';

  return `
    <article class="stream-card ${isResearch ? 'is-research' : ''}" data-article-card="${esc(a.id)}">
      <div class="sc-head">
        <div class="sc-source-group">
          ${c ? `<span class="sc-country-Chip"><span class="flags">${flag(c.code)} <a href="/country/${c.slug}">${esc(c.name)}</a></span></span>` : ''}
          <span class="sc-publisher">${esc(a.source?.name || 'Publisher')}</span>
          ${a.kind && a.kind !== 'news' ? `<span class="tag kind-${esc(a.kind)}">${esc(a.kind)}</span>` : ''}
        </div>
        <time class="sc-time">${shortDate(a.publishedAt)}</time>
      </div>

      <div class="sc-body">
        <div class="sc-copy">
          <h3 class="sc-title">
            <a href="${esc(a.url)}" data-open-article="${esc(a.id)}">${esc(a.title)}</a>
          </h3>
          ${a.summary ? `<p class="sc-summary">${esc(a.summary)}</p>` : ''}
        </div>
        ${a.imageUrl ? `
          <div class="sc-thumb">
            <img src="${esc(a.imageUrl)}" alt="" loading="lazy" onerror="this.parentElement.remove()">
          </div>` : ''}
      </div>

      <div class="sc-foot">
        <div class="sc-tags">
          ${t ? `<a class="tag" href="/topic/${t.slug}">${esc(t.name)}</a>` : ''}
          <a class="sc-read-link" href="${esc(a.url)}" data-open-article="${esc(a.id)}">
            Read story ${icon('arrow-right')}
          </a>
        </div>
        <div class="sc-actions">
          <button class="act saved" type="button" data-unsave="${esc(a.id)}" title="Remove from saved" aria-label="Remove from saved">
            ${icon('bookmark-fill')}
          </button>
          <button class="act" type="button" data-share="${esc(a.id)}" title="Share story" aria-label="Share story">
            ${icon('share')}
          </button>
        </div>
      </div>
    </article>`;
}

function renderCustomLinkCard(link) {
  let displayHost = link.source;
  try {
    displayHost = new URL(link.url).hostname.replace(/^www\./, '');
  } catch {}

  return `
    <article class="stream-card is-custom-link" data-custom-link-id="${esc(link.id)}">
      <div class="sc-head">
        <div class="sc-source-group">
          <span class="crit-pill is-keyword" style="gap:4px">
            ${icon('compass')} <span>External link</span>
          </span>
          <span class="sc-publisher">${esc(link.source || displayHost)}</span>
        </div>
        <time class="sc-time">Saved ${shortDate(link.createdAt)}</time>
      </div>

      <div class="sc-body">
        <div class="sc-copy">
          <h3 class="sc-title">
            <a href="${esc(link.url)}">${esc(link.title)}</a>
          </h3>
          ${link.note ? `<p class="sc-summary" style="-webkit-line-clamp:3;color:var(--deep)"><strong>Note:</strong> ${esc(link.note)}</p>` : ''}
          <div style="font-size:0.76rem;color:var(--muted);word-break:break-all;margin-top:2px">
            <span style="opacity:0.8">${esc(link.url)}</span>
          </div>
        </div>
      </div>

      <div class="sc-foot">
        <div class="sc-tags">
          <a class="btn btn-outline btn-sm" href="${esc(link.url)}" style="height:30px;min-height:30px;font-size:0.76rem;padding:0 10px">
            Open page ${icon('arrow-right')}
          </a>
        </div>
        <div class="sc-actions">
          <button class="act" type="button" data-delete-custom="${esc(link.id)}" title="Remove link" aria-label="Remove link" style="color:var(--danger)">
            ${icon('trash')}
          </button>
        </div>
      </div>
    </article>`;
}

export default async function saved(main, { setTitle, navigate }) {
  setTitle('Saved');
  let filter = 'all'; // 'all' | 'articles' | 'custom'

  const draw = async () => {
    const customLinks = store.getCustomLinks();
    let articles = [];
    try {
      articles = await store.savedArticles();
    } catch {
      articles = [];
    }

    const totalCount = articles.length + customLinks.length;

    main.innerHTML = `
      <section class="saved-header">
        <div class="wrap saved-header-inner">
          <div class="saved-header-copy">
            <h1>Saved</h1>
            <p class="saved-lede">${store.user ? 'Saved to your account so you can read them on any device.' : 'Saved on this browser. Create an account to sync across devices.'}</p>
          </div>
          <div class="saved-header-right">
            <div class="saved-stats">
              <div class="saved-stat"><strong>${totalCount}</strong><span>Total saved</span></div>
              <div class="saved-stat"><strong>${articles.length}</strong><span>Stories</span></div>
              <div class="saved-stat"><strong>${customLinks.length}</strong><span>Links</span></div>
            </div>
            <button class="btn btn-plum saved-new-btn" type="button" data-save-external-link>
              ${icon('plus')} Save a link from elsewhere
            </button>
          </div>
        </div>
      </section>

      <section class="saved-body">
        <div class="wrap saved-container">
          ${store.user ? '' : `
            <div class="note flw-sync-note">
              ${icon('lock')}<span>Saved on this device only. <a href="/signup">Create a free account</a> to keep your reading list everywhere.</span>
            </div>
          `}

          <!-- Filter Toolbar -->
          <div class="saved-tabs" role="tablist">
            <button class="saved-tab ${filter === 'all' ? 'active' : ''}" type="button" role="tab" data-filter="all">
              All <span class="saved-tab-count">${totalCount}</span>
            </button>
            <button class="saved-tab ${filter === 'articles' ? 'active' : ''}" type="button" role="tab" data-filter="articles">
              Stories <span class="saved-tab-count">${articles.length}</span>
            </button>
            <button class="saved-tab ${filter === 'custom' ? 'active' : ''}" type="button" role="tab" data-filter="custom">
              My links <span class="saved-tab-count">${customLinks.length}</span>
            </button>
          </div>

          <!-- Feed List -->
          <div data-saved-feed>
            ${renderFeed(articles, customLinks, filter)}
          </div>
        </div>
      </section>
    `;

    bindActions(articles, customLinks);
  };

  function renderFeed(articles, customLinks, currentFilter) {
    let itemsToRender = [];
    if (currentFilter === 'all') {
      const taggedArticles = articles.map((a) => ({ ...a, _sortTime: new Date(a.publishedAt || 0).getTime(), _type: 'article' }));
      const taggedCustom = customLinks.map((l) => ({ ...l, _sortTime: l.createdAt || 0, _type: 'custom' }));
      itemsToRender = [...taggedArticles, ...taggedCustom].sort((a, b) => b._sortTime - a._sortTime);
    } else if (currentFilter === 'articles') {
      itemsToRender = articles.map((a) => ({ ...a, _type: 'article' }));
    } else {
      itemsToRender = customLinks.map((l) => ({ ...l, _type: 'custom' }));
    }

    if (!itemsToRender.length) {
      return emptyState({
        title: currentFilter === 'custom' ? 'No custom links saved yet' : 'Nothing saved yet',
        body: currentFilter === 'custom'
          ? 'Use the button above to paste any link you found on the web so you can find it here later.'
          : 'Use the bookmark icon on any research paper or news story to keep it here for later, or save your own links from other sites.',
        action: `
          <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
            <button class="btn btn-plum btn-sm" type="button" data-save-external-link>${icon('plus')} Save a link from elsewhere</button>
            <a class="btn btn-outline btn-sm" href="/research">Explore research</a>
          </div>
        `,
        iconName: 'bookmark',
      });
    }

    return `
      <div class="news-list" style="display:grid;gap:16px;grid-template-columns:repeat(auto-fill, minmax(min(360px, 100%), 1fr))">
        ${itemsToRender.map((item) => (item._type === 'article' ? renderSavedArticleCard(item) : renderCustomLinkCard(item))).join('')}
      </div>
    `;
  }

  function bindActions(articles, customLinks) {
    // Filter chips
    $$('[data-filter]', main).forEach((btn) => {
      btn.addEventListener('click', () => {
        filter = btn.dataset.filter;
        $$('[data-filter]', main).forEach((b) => b.classList.toggle('active', b === btn));
        const feed = $('[data-saved-feed]', main);
        if (feed) feed.innerHTML = renderFeed(articles, customLinks, filter);
        bindFeedActions(articles, customLinks);
      });
    });

    // Save external link button
    $$('[data-save-external-link]', main).forEach((btn) => {
      btn.addEventListener('click', () => {
        openSaveCustomLinkModal({
          onSaved: () => draw(),
        });
      });
    });

    bindFeedActions(articles, customLinks);
  }

  function bindFeedActions(articles, customLinks) {
    // Unsave article
    $$('[data-unsave]', main).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.unsave;
        const article = articles.find((a) => a.id === id);
        if (article) {
          try {
            await store.toggleSave(article);
            toast('Removed from saved');
            draw();
          } catch (err) {
            toast(err.message, 'error');
          }
        }
      });
    });

    // Delete custom link
    $$('[data-delete-custom]', main).forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.deleteCustom;
        store.removeCustomLink(id);
        toast('Link removed');
        draw();
      });
    });
  }

  await draw();
}
