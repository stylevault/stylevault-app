import { api } from './api.js';
import { esc, icon } from './lib.js';

let cachedAds = null;
let fetchPromise = null;

export async function getActiveAds() {
  if (cachedAds) return cachedAds;
  if (fetchPromise) return fetchPromise;
  fetchPromise = api.ads()
    .then((res) => {
      cachedAds = res.ads || [];
      return cachedAds;
    })
    .catch(() => {
      cachedAds = [];
      return [];
    });
  return fetchPromise;
}

export function filterAds(ads, { type, placement }) {
  if (!ads || !ads.length) return [];
  return ads.filter((ad) => {
    if (type && ad.type !== type) return false;
    if (placement && ad.placement !== 'all' && ad.placement !== placement) return false;
    return true;
  });
}

/**
 * Returns HTML string for a Banner Ad strip
 */
export function renderBannerAdHtml(ad) {
  if (!ad) return '';
  return `
    <aside class="sv-ad-banner" data-ad-id="${esc(ad.id)}" role="complementary" aria-label="Sponsored Content">
      <div class="wrap sv-ad-banner-inner">
        <div class="sv-ad-banner-left">
          <span class="sv-ad-kicker">Sponsored · ${esc(ad.sponsor)}</span>
          ${ad.imageUrl ? `<img class="sv-ad-banner-thumb" src="${esc(ad.imageUrl)}" alt="" loading="lazy">` : ''}
          <div class="sv-ad-banner-copy">
            <strong class="sv-ad-banner-title">${esc(ad.title)}</strong>
            ${ad.body ? `<span class="sv-ad-banner-desc">${esc(ad.body)}</span>` : ''}
          </div>
        </div>
        <div class="sv-ad-banner-actions">
          <a class="btn btn-plum btn-sm sv-ad-cta" href="${esc(ad.linkUrl)}" target="_blank" rel="noopener sponsored" data-ad-link="${esc(ad.id)}">
            ${esc(ad.ctaText || 'Learn More')} ${icon('arrow-right')}
          </a>
          <button type="button" class="sv-ad-dismiss-btn" data-ad-dismiss title="Dismiss ad" aria-label="Dismiss">
            ${icon('close')}
          </button>
        </div>
      </div>
    </aside>
  `;
}

/**
 * Returns HTML string for a Native In-Feed Story Card
 */
export function renderNativeAdHtml(ad) {
  if (!ad) return '';
  return `
    <article class="news-row has-thumb sv-ad-native-card" data-ad-id="${esc(ad.id)}">
      <div class="news-content">
        <div class="news-meta">
          <span class="sv-ad-badge">${icon('sparkles')} Sponsored · ${esc(ad.sponsor)}</span>
        </div>
        <h3 class="news-title">
          <a href="${esc(ad.linkUrl)}" target="_blank" rel="noopener sponsored" data-ad-link="${esc(ad.id)}">
            ${esc(ad.title)}
          </a>
        </h3>
        ${ad.body ? `<p class="news-summary">${esc(ad.body)}</p>` : ''}
        <div class="news-foot">
          <a class="sv-ad-cta-link" href="${esc(ad.linkUrl)}" target="_blank" rel="noopener sponsored" data-ad-link="${esc(ad.id)}">
            ${esc(ad.ctaText || 'Learn More')} ↗
          </a>
        </div>
      </div>
      ${ad.imageUrl ? `
        <div class="news-thumb sv-ad-thumb">
          <img src="${esc(ad.imageUrl)}" alt="${esc(ad.title)}" loading="lazy" onerror="this.parentElement.remove()">
        </div>` : ''}
    </article>
  `;
}

/**
 * Checks if an Interstitial Takeover ad is eligible and displays it once per session
 */
export async function maybeShowInterstitial(placement = 'all') {
  try {
    const ads = await getActiveAds();
    const matches = filterAds(ads, { type: 'interstitial', placement });
    if (!matches.length) return;

    // Pick first matching interstitial
    const ad = matches[0];
    const sessionKey = `sv_interstitial_seen_${ad.id}`;
    if (sessionStorage.getItem(sessionKey)) return;

    // Mark as seen in this session
    sessionStorage.setItem(sessionKey, '1');

    // Track impression
    api.trackAdImpression(ad.id).catch(() => {});

    // Render modal
    const overlay = document.createElement('div');
    overlay.className = 'sv-ad-interstitial-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `
      <div class="sv-ad-interstitial-modal">
        <button type="button" class="sv-ad-interstitial-close" data-ad-modal-close aria-label="Close sponsor announcement">
          ${icon('close')}
        </button>
        ${ad.imageUrl ? `
          <div class="sv-ad-interstitial-media">
            <img src="${esc(ad.imageUrl)}" alt="${esc(ad.title)}" onerror="this.parentElement.remove()">
          </div>` : ''}
        <div class="sv-ad-interstitial-body">
          <span class="sv-ad-interstitial-kicker">Sponsored Message · ${esc(ad.sponsor)}</span>
          <h2>${esc(ad.title)}</h2>
          ${ad.body ? `<p>${esc(ad.body)}</p>` : ''}
          <div class="sv-ad-interstitial-actions">
            <a class="btn btn-plum sv-ad-interstitial-btn" href="${esc(ad.linkUrl)}" target="_blank" rel="noopener sponsored" data-ad-link="${esc(ad.id)}">
              ${esc(ad.ctaText || 'Learn More')} ↗
            </a>
            <button type="button" class="btn btn-outline" data-ad-modal-close>Continue Reading</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
      overlay.classList.add('closing');
      setTimeout(() => overlay.remove(), 250);
    };

    overlay.querySelectorAll('[data-ad-modal-close]').forEach((btn) => {
      btn.addEventListener('click', close);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  } catch (err) {
    console.warn('Could not display interstitial ad:', err);
  }
}

/**
 * Initializes delegated click and impression tracking
 */
export function setupAdTracking() {
  if (window.__sv_ad_tracking_initialized) return;
  window.__sv_ad_tracking_initialized = true;

  document.addEventListener('click', (e) => {
    // Ad link click
    const link = e.target.closest('[data-ad-link]');
    if (link) {
      const adId = link.getAttribute('data-ad-link');
      if (adId) {
        api.trackAdClick(adId).catch(() => {});
      }
    }

    // Banner dismiss
    const dismissBtn = e.target.closest('[data-ad-dismiss]');
    if (dismissBtn) {
      const banner = dismissBtn.closest('.sv-ad-banner');
      if (banner) {
        banner.style.transition = 'opacity 0.2s, max-height 0.2s, padding 0.2s';
        banner.style.opacity = '0';
        banner.style.maxHeight = '0';
        banner.style.padding = '0';
        banner.style.overflow = 'hidden';
        setTimeout(() => banner.remove(), 250);
      }
    }
  });
}
