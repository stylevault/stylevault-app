/**
 * STYLEVAULT.APP ENGINE & STATE CONTROLLER
 * Full Pan-African News Discovery & Custom Intelligence System
 * Desktop Multi-Column + Mobile Native Touch Ergonomics
 */

class StyleVaultEngine {
  constructor() {
    this.countries = ALL_54_AFRICAN_COUNTRIES;
    this.articles = SEED_NEWS_FEED;
    this.currentTab = 'feed';
    this.activeCategory = 'All';
    this.activeRegion = 'All';
    this.selectedCountryCode = null;
    this.selectedCountryName = null;
    this.searchQuery = '';
    
    // User Preferences (Stored in LocalStorage)
    this.savedArticles = this.loadSavedArticles();
    this.userMonitors = this.loadUserMonitors();
    this.activeMonitorId = this.userMonitors.length > 0 ? this.userMonitors[0].id : null;

    this.init();
  }

  loadSavedArticles() {
    const raw = localStorage.getItem('stylevault_saved_articles_v2');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { console.error(e); }
    }
    return [];
  }

  saveSavedArticles() {
    localStorage.setItem('stylevault_saved_articles_v2', JSON.stringify(this.savedArticles));
    this.updateSavedBadge();
    this.renderSavedScreen();
  }

  loadUserMonitors() {
    const raw = localStorage.getItem('stylevault_user_monitors_v2');
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { console.error(e); }
    }
    return [...INITIAL_DEFAULT_MONITORS];
  }

  saveUserMonitors() {
    localStorage.setItem('stylevault_user_monitors_v2', JSON.stringify(this.userMonitors));
    this.renderMonitorScreen();
    this.renderSidebarMonitors();
  }

  init() {
    this.bindTabNavigation();
    this.bindCategoryPills();
    this.bindRegionPills();
    this.bindSearch();
    this.bindActiveFilterStrip();
    this.setupNewMonitorModal();
    this.populateCountrySelect();
    this.updateSavedBadge();
    this.renderCurrentTab();
    this.renderSidebarMonitors();
  }

  // ==========================================================================
  // TAB NAVIGATION (Desktop & Mobile Synchronized)
  // ==========================================================================
  bindTabNavigation() {
    const desktopBtns = document.querySelectorAll('.desktop-tab-btn');
    const mobileBtns = document.querySelectorAll('.mobile-tab-item');

    desktopBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    mobileBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });
  }

  switchTab(tabName) {
    this.currentTab = tabName;

    // Update desktop nav pills
    document.querySelectorAll('.desktop-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update mobile nav items
    document.querySelectorAll('.mobile-tab-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Toggle screen views
    document.querySelectorAll('.screen-view').forEach(screen => {
      screen.classList.toggle('active', screen.id === `screen-${tabName}`);
    });

    this.renderCurrentTab();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  updateSavedBadge() {
    const badge = document.getElementById('savedCountBadge');
    if (badge) {
      badge.textContent = this.savedArticles.length;
    }
  }

  renderCurrentTab() {
    if (this.currentTab === 'feed') {
      this.renderFeedScreen();
    } else if (this.currentTab === 'countries') {
      this.renderCountriesScreen();
    } else if (this.currentTab === 'monitor') {
      this.renderMonitorScreen();
    } else if (this.currentTab === 'saved') {
      this.renderSavedScreen();
    }
  }

  // ==========================================================================
  // TAB 1: FEED SCREEN
  // ==========================================================================
  bindCategoryPills() {
    const pills = document.querySelectorAll('.category-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeCategory = pill.dataset.category;
        this.renderFeedScreen();
      });
    });
  }

  bindSearch() {
    const searchInput = document.getElementById('appSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderFeedScreen();
      });
    }
  }

  bindActiveFilterStrip() {
    const clearBtn = document.getElementById('clearCountryFilterBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearCountryFilter();
      });
    }
  }

  clearCountryFilter() {
    this.selectedCountryCode = null;
    this.selectedCountryName = null;
    const strip = document.getElementById('activeFilterStrip');
    if (strip) strip.classList.remove('visible');
    this.renderFeedScreen();
  }

  filterByCountry(code, name, flag = '') {
    this.selectedCountryCode = code;
    this.selectedCountryName = name;
    
    // Show active filter banner
    const strip = document.getElementById('activeFilterStrip');
    const label = document.getElementById('activeFilterText');
    if (strip && label) {
      label.innerHTML = `Showing dispatches for <strong>${flag} ${name}</strong>`;
      strip.classList.add('visible');
    }

    this.switchTab('feed');
  }

  getFilteredArticles() {
    return this.articles.filter(item => {
      // Category filter
      const matchesCategory = (this.activeCategory === 'All') || 
        (item.topic.toLowerCase() === this.activeCategory.toLowerCase());

      // Country filter
      const matchesCountry = !this.selectedCountryCode || (item.countryCode === this.selectedCountryCode);

      // Search query
      const matchesSearch = !this.searchQuery || 
        item.title.toLowerCase().includes(this.searchQuery) ||
        item.excerpt.toLowerCase().includes(this.searchQuery) ||
        item.countryName.toLowerCase().includes(this.searchQuery) ||
        item.publisher.toLowerCase().includes(this.searchQuery) ||
        item.topic.toLowerCase().includes(this.searchQuery);

      return matchesCategory && matchesCountry && matchesSearch;
    });
  }

  renderFeedScreen() {
    const topContainer = document.getElementById('topStoriesContainer');
    const latestContainer = document.getElementById('latestFeedContainer');
    const topSection = document.getElementById('topStoriesSection');
    if (!topContainer || !latestContainer) return;

    const filtered = this.getFilteredArticles();

    // Top Stories (Clustered Coverage)
    const topStories = filtered.filter(a => a.isTopStory);
    const regularStories = filtered.filter(a => !a.isTopStory);

    if (topStories.length > 0 && !this.searchQuery && this.activeCategory === 'All' && !this.selectedCountryCode) {
      if (topSection) topSection.style.display = 'block';
      topContainer.innerHTML = topStories.map(story => this.buildArticleCard(story, true)).join('');
    } else {
      if (topSection) topSection.style.display = 'none';
    }

    const feedList = (topStories.length > 0 && !this.searchQuery && this.activeCategory === 'All' && !this.selectedCountryCode) 
      ? regularStories 
      : filtered;

    if (feedList.length === 0) {
      latestContainer.innerHTML = `
        <div style="text-align: center; padding: 48px 16px; background: #fff; border: 1px solid var(--border-light); border-radius: var(--radius-md);">
          <div style="font-size: 2rem; margin-bottom: 8px;">🔍</div>
          <h4 style="font-weight: 600; color: var(--text-main); margin-bottom: 4px;">No matching reports found</h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Try clearing your search term or switching to "All Africa".</p>
        </div>
      `;
      return;
    }

    latestContainer.innerHTML = feedList.map(story => this.buildArticleCard(story, false)).join('');
  }

  buildArticleCard(story, isTop) {
    const isSaved = this.savedArticles.some(s => s.id === story.id);
    return `
      <article class="${isTop ? 'top-story-card' : 'feed-item-card'}" onclick="window.appEngine.openArticleSheet('${story.id}')">
        <div class="story-meta-row">
          <span class="source-badge">${story.publisher}</span>
          <span class="country-flag-tag">${story.flag} ${story.countryName}</span>
          <span class="country-flag-tag">${story.topic}</span>
          ${story.clusterSources > 1 ? `<span class="cluster-pill">⭐ ${story.clusterSources} Sources Covering</span>` : ''}
        </div>
        <h3 class="story-headline">${story.title}</h3>
        <p class="story-excerpt">${story.excerpt}</p>
        <div class="story-footer-row">
          <span class="time-ago">⏱️ ${story.publishedTime}</span>
          <button class="bookmark-icon-btn ${isSaved ? 'saved' : ''}" onclick="event.stopPropagation(); window.appEngine.toggleSaveArticle('${story.id}')" title="Save for offline reading">
            ${isSaved ? '🔖' : '🏷️'}
          </button>
        </div>
      </article>
    `;
  }

  // ==========================================================================
  // TAB 2: 54 COUNTRIES DIRECTORY
  // ==========================================================================
  bindRegionPills() {
    const pills = document.querySelectorAll('.region-pill-btn');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.activeRegion = pill.dataset.region;
        this.renderCountriesScreen();
      });
    });
  }

  renderCountriesScreen() {
    const container = document.getElementById('countriesListContainer');
    if (!container) return;

    const filtered = this.countries.filter(c => {
      if (this.activeRegion === 'All') return true;
      return c.region.toLowerCase() === this.activeRegion.toLowerCase();
    });

    container.innerHTML = filtered.map(c => `
      <div class="country-row-item" onclick="window.appEngine.filterByCountry('${c.code}', '${c.name}', '${c.flag}')">
        <div class="country-name-group">
          <span class="country-flag">${c.flag}</span>
          <div>
            <div class="country-name-text">${c.name}</div>
            <div class="country-region-sub">${c.region} Africa</div>
          </div>
        </div>
        <div class="country-source-count">${c.sources} Sources</div>
      </div>
    `).join('');
  }

  // ==========================================================================
  // TAB 3: MY MONITOR (Personalized Intelligence Streams)
  // ==========================================================================
  renderMonitorScreen() {
    const chipsContainer = document.getElementById('activeMonitorChips');
    const feedContainer = document.getElementById('monitorFeedContainer');
    if (!chipsContainer || !feedContainer) return;

    if (this.userMonitors.length === 0) {
      chipsContainer.innerHTML = `<span style="font-size: 0.85rem; color: var(--text-muted);">No active monitoring streams. Click "+ New Stream" above to create one.</span>`;
      feedContainer.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">Create a stream to monitor African markets automatically.</div>`;
      return;
    }

    chipsContainer.innerHTML = this.userMonitors.map(m => `
      <div class="monitor-chip ${m.id === this.activeMonitorId ? 'active' : ''}" onclick="window.appEngine.selectMonitor('${m.id}')">
        <span>${m.title}</span>
        <span class="monitor-chip-close" onclick="event.stopPropagation(); window.appEngine.deleteMonitor('${m.id}')" title="Delete stream">✕</span>
      </div>
    `).join('');

    const currentMon = this.userMonitors.find(m => m.id === this.activeMonitorId) || this.userMonitors[0];
    if (!currentMon) return;

    const matching = this.articles.filter(item => {
      const matchCountry = (currentMon.countryCode === 'ALL') || (item.countryCode === currentMon.countryCode);
      const matchTopic = !currentMon.topic || (item.topic.toLowerCase() === currentMon.topic.toLowerCase());
      
      let matchKeyword = true;
      if (currentMon.keywords) {
        const kws = currentMon.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
        if (kws.length > 0) {
          const combined = `${item.title} ${item.excerpt}`.toLowerCase();
          matchKeyword = kws.some(kw => combined.includes(kw));
        }
      }

      return matchCountry && matchTopic && matchKeyword;
    });

    if (matching.length === 0) {
      feedContainer.innerHTML = `
        <div style="text-align: center; padding: 36px 16px; background: #fff; border: 1px solid var(--border-light); border-radius: var(--radius-md);">
          <div style="font-size: 1.8rem; margin-bottom: 6px;">📡</div>
          <h4 style="color: var(--text-main); margin-bottom: 4px;">Awaiting New Dispatches</h4>
          <p style="font-size: 0.82rem; color: var(--text-secondary);">No current reports match this exact filter combination yet. New stories will automatically appear here as they are indexed.</p>
        </div>
      `;
    } else {
      feedContainer.innerHTML = matching.map(a => this.buildArticleCard(a, false)).join('');
    }
  }

  selectMonitor(id) {
    this.activeMonitorId = id;
    this.renderMonitorScreen();
  }

  deleteMonitor(id) {
    this.userMonitors = this.userMonitors.filter(m => m.id !== id);
    if (this.activeMonitorId === id) {
      this.activeMonitorId = this.userMonitors.length > 0 ? this.userMonitors[0].id : null;
    }
    this.saveUserMonitors();
  }

  setupNewMonitorModal() {
    const openBtn = document.getElementById('openCreateMonitorBtn');
    const modal = document.getElementById('createMonitorModal');
    const cancelBtn = document.getElementById('cancelMonitorBtn');
    const form = document.getElementById('newMonitorForm');

    if (openBtn && modal) {
      openBtn.addEventListener('click', () => modal.classList.add('visible'));
    }
    if (cancelBtn && modal) {
      cancelBtn.addEventListener('click', () => modal.classList.remove('visible'));
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('visible');
      });
    }

    if (form && modal) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const countryCode = document.getElementById('monCountrySelect').value;
        const topic = document.getElementById('monTopicSelect').value;
        const keywords = document.getElementById('monKeywordInput').value.trim();

        const countryObj = this.countries.find(c => c.code === countryCode);
        const countryName = countryObj ? countryObj.name : 'Pan-Africa';

        const newMon = {
          id: `mon_${Date.now()}`,
          title: `${countryName} • ${topic || 'All Sectors'}`,
          countryCode: countryCode,
          countryName: countryName,
          topic: topic,
          keywords: keywords
        };

        this.userMonitors.unshift(newMon);
        this.activeMonitorId = newMon.id;
        this.saveUserMonitors();
        modal.classList.remove('visible');
        form.reset();
      });
    }
  }

  populateCountrySelect() {
    const sel = document.getElementById('monCountrySelect');
    if (!sel) return;
    
    sel.innerHTML = `
      <option value="ALL">Pan-Africa (All Countries)</option>
      ${this.countries.map(c => `<option value="${c.code}">${c.name} ${c.flag}</option>`).join('')}
    `;
  }

  // ==========================================================================
  // SIDEBAR WIDGETS
  // ==========================================================================
  renderSidebarMonitors() {
    const container = document.getElementById('sidebarStreamsList');
    if (!container) return;

    container.innerHTML = this.userMonitors.map(m => `
      <div class="sidebar-stream-item" onclick="window.appEngine.openMonitorTabWith('${m.id}')">
        <span>${m.title}</span>
        <span style="font-size: 0.72rem; color: var(--text-muted);">View ↗</span>
      </div>
    `).join('');
  }

  openMonitorTabWith(monitorId) {
    this.activeMonitorId = monitorId;
    this.switchTab('monitor');
  }

  // ==========================================================================
  // TAB 4: SAVED VAULT (Offline Bookmarks)
  // ==========================================================================
  toggleSaveArticle(id) {
    const article = this.articles.find(a => a.id === id);
    if (!article) return;

    const exists = this.savedArticles.some(s => s.id === id);
    if (exists) {
      this.savedArticles = this.savedArticles.filter(s => s.id !== id);
    } else {
      this.savedArticles.unshift(article);
    }
    this.saveSavedArticles();
    this.renderCurrentTab();
  }

  renderSavedScreen() {
    const container = document.getElementById('savedArticlesContainer');
    if (!container) return;

    if (this.savedArticles.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; background: #fff; border: 1px solid var(--border-light); border-radius: var(--radius-md);">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">🔖</div>
          <h4 style="color: var(--text-main); margin-bottom: 4px;">Your Reading Vault is Empty</h4>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Click the bookmark icon on any headline across Africa to save it here for offline reference.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.savedArticles.map(a => this.buildArticleCard(a, false)).join('');
  }

  // ==========================================================================
  // NATIVE SLIDE-UP ARTICLE DETAIL SHEET
  // ==========================================================================
  openArticleSheet(id) {
    const article = this.articles.find(a => a.id === id);
    if (!article) return;

    const sheetBackdrop = document.getElementById('articleSheetBackdrop');
    if (!sheetBackdrop) return;

    document.getElementById('sheetPublisher').textContent = article.publisher;
    document.getElementById('sheetFlagTag').textContent = `${article.flag} ${article.countryName} • ${article.topic}`;
    document.getElementById('sheetTime').textContent = article.publishedTime;
    document.getElementById('sheetTitle').textContent = article.title;
    document.getElementById('sheetExcerpt').textContent = article.excerpt;
    
    const readBtn = document.getElementById('sheetReadOriginalBtn');
    readBtn.href = article.url;
    readBtn.innerHTML = `<span>Read Full Report at ${article.publisher}</span> <span>↗</span>`;

    sheetBackdrop.classList.add('visible');
  }

  closeArticleSheet() {
    const sheetBackdrop = document.getElementById('articleSheetBackdrop');
    if (sheetBackdrop) {
      sheetBackdrop.classList.remove('visible');
    }
  }

  shareArticle() {
    const title = document.getElementById('sheetTitle').textContent;
    const url = document.getElementById('sheetReadOriginalBtn').href;

    if (navigator.share) {
      navigator.share({ title, url }).catch(err => console.log('Share dismissed', err));
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert('Article link copied to clipboard!');
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.appEngine = new StyleVaultEngine();
});
