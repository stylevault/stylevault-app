import { api } from '../api.js';
import { $, $$, esc, flag, icon, shortDate } from '../lib.js';
import { store } from '../store.js';
import { errorState, openSignupPromptModal, skeletonRows, toast } from '../ui.js';
import { filterAds, getActiveAds, renderNativeAdHtml } from '../ads.js';

export default async function articleView(main, { params, navigate, setTitle }) {
  const id = Number(params.id);
  if (!id) {
    navigate('/news', { replace: true });
    return;
  }

  main.innerHTML = `
    <div class="wrap" style="max-width:820px;padding:32px 16px 80px">
      <div class="sv-article-loading">
        ${skeletonRows(6)}
      </div>
    </div>
  `;

  try {
    const res = await api.article(id);
    const a = res.article;
    if (!a) throw new Error('Article not found');

    setTitle(a.title, a.summary || a.title);

    const saved = store.isSaved(a.id);
    const countries = (a.countries || []).map((code) => store.countryByCode.get(code)).filter(Boolean);
    const topics = (a.topics || []).map((slug) => store.topicBySlug.get(slug)).filter(Boolean);
    const wordCount = (a.contentHtml || a.summary || '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    const readTime = Math.max(1, Math.round(wordCount / 200));

    // Fetch active native ads
    const activeAds = await getActiveAds().catch(() => []);
    const nativeAds = filterAds(activeAds, { type: 'native', path: `/article/${a.id}` });
    const nativeAdHtml = nativeAds.length ? renderNativeAdHtml(nativeAds[0]) : '';

    main.innerHTML = `
      <article class="wrap sv-article-page" style="max-width:820px;padding:28px 16px 90px">
        <nav class="sv-article-nav" aria-label="Breadcrumb">
          <a href="/news" class="btn btn-outline btn-sm sv-article-back">${icon('arrow-right')}<span style="transform:scaleX(-1);display:inline-block">→</span> News</a>
          ${countries.length ? `<span class="sv-article-nav-sep">/</span><a href="/country/${countries[0].slug}" class="sv-article-nav-crumb">${flag(countries[0].code)} ${esc(countries[0].name)}</a>` : ''}
          ${topics.length ? `<span class="sv-article-nav-sep">/</span><a href="/topic/${topics[0].slug}" class="sv-article-nav-crumb">${esc(topics[0].name)}</a>` : ''}
        </nav>

        <header class="sv-article-header">
          <div class="sv-article-pills">
            ${countries.map((c) => `<a class="crit-pill is-country" href="/country/${c.slug}">${flag(c.code)} ${esc(c.name)}</a>`).join('')}
            ${topics.map((t) => `<a class="crit-pill is-topic" href="/topic/${t.slug}">${esc(t.name)}</a>`).join('')}
          </div>

          <h1 class="sv-article-title">${esc(a.title)}</h1>

          ${a.summary ? `<p class="sv-article-lead">${esc(a.summary)}</p>` : ''}

          <div class="sv-article-byline">
            <div class="sv-article-author">
              <span class="sv-article-author-name">${esc(a.source?.name || 'StyleVault Editorial')}</span>
              <span class="dot-sep"></span>
              <time class="sv-article-date">${shortDate(a.publishedAt)}</time>
              <span class="dot-sep"></span>
              <span class="sv-article-reading-time">${readTime} min read</span>
            </div>
            <div class="sv-article-actions">
              <button type="button" class="btn btn-outline btn-sm sv-art-save ${saved ? 'is-saved' : ''}" data-art-save title="${saved ? 'Saved' : 'Save for later'}">
                ${icon(saved ? 'bookmark-fill' : 'bookmark')} <span>${saved ? 'Saved' : 'Save'}</span>
              </button>
              <button type="button" class="btn btn-outline btn-sm sv-art-share" data-art-share title="Share story">
                ${icon('share')} <span>Share</span>
              </button>
            </div>
          </div>
        </header>

        ${a.imageUrl ? `
          <div class="sv-article-hero">
            <img src="${esc(a.imageUrl)}" alt="${esc(a.title)}" loading="eager" onerror="this.parentElement.remove()">
          </div>
        ` : ''}

        <div class="sv-article-body prose">
          ${a.contentHtml ? a.contentHtml : `
            <div class="sv-article-fallback">
              <p>${esc(a.summary || 'No further article content provided.')}</p>
              ${a.url && !a.url.startsWith('/article/') ? `
                <div style="margin-top:24px">
                  <a class="btn btn-plum" href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">
                    Read full reporting on ${esc(a.source?.name || 'original publisher')} ↗
                  </a>
                </div>
              ` : ''}
            </div>
          `}
        </div>

        ${nativeAdHtml ? `
          <div class="sv-article-ad-slot" style="margin:40px 0 24px">
            <span class="sv-ad-kicker" style="margin-bottom:8px;display:block">Sponsored Announcement</span>
            ${nativeAdHtml}
          </div>
        ` : ''}

        <footer class="sv-article-foot">
          <div class="sv-article-foot-actions">
            <a href="/news" class="btn btn-outline btn-sm">Explore More News</a>
            <a href="/explore" class="btn btn-plum btn-sm">Explore Countries & Topics</a>
          </div>
        </footer>
      </article>
    `;

    // Bind save button
    const saveBtn = $('[data-art-save]', main);
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        if (!store.user) {
          openSignupPromptModal({
            title: 'Save Stories to Your Vault',
            subtitle: 'Create a free StyleVault account to save stories and sync across your devices.',
          });
          return;
        }
        try {
          const nowSaved = await store.toggleSave(a);
          saveBtn.classList.toggle('is-saved', nowSaved);
          saveBtn.innerHTML = `${icon(nowSaved ? 'bookmark-fill' : 'bookmark')} <span>${nowSaved ? 'Saved' : 'Save'}</span>`;
          toast(nowSaved ? 'Saved for later' : 'Removed from saved');
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    }

    // Bind share button
    const shareBtn = $('[data-art-share]', main);
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        const shareData = {
          title: a.title,
          text: a.title,
          url: location.href,
        };
        if (navigator.share) {
          navigator.share(shareData).catch(() => {});
        } else {
          try {
            navigator.clipboard.writeText(location.href);
            toast('Article link copied to clipboard');
          } catch {
            window.prompt('Copy link:', location.href);
          }
        }
      });
    }

  } catch (err) {
    main.innerHTML = `
      <div class="wrap" style="max-width:820px;padding:48px 16px">
        ${errorState(err)}
      </div>
    `;
  }
}
