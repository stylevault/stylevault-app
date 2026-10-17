/**
 * App state. Anonymous readers keep saved stories and monitors in this browser;
 * signed-in readers keep them in their account. Signing in merges the two.
 */
import { api } from './api.js';
import { storage } from './lib.js';

const LOCAL_SAVED = 'sv.saved';       // [{ ...article }]
const LOCAL_MONITORS = 'sv.monitors'; // [{ id, name, countries, topics, keywords }]

const events = new EventTarget();
const emit = () => events.dispatchEvent(new Event('change'));

export const store = {
  meta: { countries: [], topics: [], stats: {} },
  countryByCode: new Map(),
  countryBySlug: new Map(),
  topicBySlug: new Map(),
  user: null,
  savedIds: new Set(),
  localSaved: [],
  monitors: [],
  ready: null,

  on(fn) {
    events.addEventListener('change', fn);
    return () => events.removeEventListener('change', fn);
  },

  init() {
    this.ready = Promise.all([this.loadMeta(), this.loadAccount()]);
    return this.ready;
  },

  async loadMeta() {
    try {
      this.meta = await api.meta();
    } catch {
      this.meta = { countries: [], topics: [], stats: {} };
    }
    this.countryByCode = new Map(this.meta.countries.map((c) => [c.code, c]));
    this.countryBySlug = new Map(this.meta.countries.map((c) => [c.slug, c]));
    this.topicBySlug = new Map(this.meta.topics.map((t) => [t.slug, t]));
  },

  async loadAccount() {
    let me = { user: null };
    try {
      me = await api.me();
    } catch { /* offline: fall back to this browser's data */ }
    this.applyMe(me);
  },

  applyMe(me) {
    this.user = me.user;
    if (me.user) {
      this.savedIds = new Set(me.savedIds);
      this.monitors = me.monitors;
      this.localSaved = [];
    } else {
      this.localSaved = storage.get(LOCAL_SAVED, []);
      this.savedIds = new Set(this.localSaved.map((a) => a.id));
      this.monitors = storage.get(LOCAL_MONITORS, []);
    }
    emit();
  },

  // ── Auth ────────────────────────────────────────────────────────────────
  async afterSignIn() {
    const localSaved = storage.get(LOCAL_SAVED, []);
    const localMonitors = storage.get(LOCAL_MONITORS, []);
    let me;
    if (localSaved.length || localMonitors.length) {
      me = await api.importLocal({ savedIds: localSaved.map((a) => a.id), monitors: localMonitors });
      storage.remove(LOCAL_SAVED);
      storage.remove(LOCAL_MONITORS);
    } else {
      me = await api.me();
    }
    this.applyMe(me);
    return { imported: localSaved.length + localMonitors.length };
  },

  async signOut() {
    await api.logout().catch(() => {});
    this.applyMe({ user: null });
  },

  // ── Saved stories ───────────────────────────────────────────────────────
  isSaved: (id) => store.savedIds.has(id),

  async toggleSave(article) {
    const wasSaved = this.savedIds.has(article.id);
    // optimistic update
    if (wasSaved) this.savedIds.delete(article.id);
    else this.savedIds.add(article.id);
    emit();

    try {
      if (this.user) {
        await (wasSaved ? api.unsave(article.id) : api.save(article.id));
      } else {
        this.localSaved = wasSaved
          ? this.localSaved.filter((a) => a.id !== article.id)
          : [{ ...article, savedAt: Date.now() }, ...this.localSaved].slice(0, 300);
        storage.set(LOCAL_SAVED, this.localSaved);
      }
      return !wasSaved;
    } catch (err) {
      if (wasSaved) this.savedIds.add(article.id);
      else this.savedIds.delete(article.id);
      emit();
      throw err;
    }
  },

  async savedArticles() {
    if (this.user) return (await api.saved()).items;
    return this.localSaved;
  },

  // ── Custom saved links from other places ─────────────────────────────────
  getCustomLinks() {
    return storage.get('sv.custom_links', []);
  },

  saveCustomLink({ url, title, source = '', note = '', country = '', topic = '' }) {
    if (!url?.trim()) throw new Error('Please enter a link URL');
    let validUrl = url.trim();
    if (!/^https?:\/\//i.test(validUrl)) validUrl = 'https://' + validUrl;
    let autoSource = source.trim();
    if (!autoSource) {
      try { autoSource = new URL(validUrl).hostname.replace(/^www\./, ''); } catch { autoSource = 'Web Link'; }
    }
    const cleanTitle = (title || '').trim() || autoSource;
    const item = {
      id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      url: validUrl,
      title: cleanTitle,
      source: autoSource,
      note: (note || '').trim(),
      country: (country || '').trim(),
      topic: (topic || '').trim(),
      isCustom: true,
      createdAt: Date.now(),
    };
    const list = [item, ...this.getCustomLinks()].slice(0, 300);
    storage.set('sv.custom_links', list);
    emit();
    return item;
  },

  removeCustomLink(id) {
    const list = this.getCustomLinks().filter((x) => x.id !== id);
    storage.set('sv.custom_links', list);
    emit();
  },

  // ── Monitors ────────────────────────────────────────────────────────────
  _opQueue: Promise.resolve(),
  _enqueue(fn) {
    const run = () => fn();
    const p = this._opQueue.then(run, run);
    this._opQueue = p.catch(() => {});
    return p;
  },

  get followedCountries() {
    const set = new Set();
    for (const m of this.monitors) {
      if (Array.isArray(m.countries)) {
        for (const c of m.countries) if (c) set.add(c);
      }
    }
    return [...set];
  },

  get followedTopics() {
    const set = new Set();
    for (const m of this.monitors) {
      if (Array.isArray(m.topics)) {
        for (const t of m.topics) if (t) set.add(t);
      }
    }
    return [...set];
  },

  async saveMonitor(monitor, id = null) {
    if (this.user) {
      const { monitor: saved } = id ? await api.updateMonitor(id, monitor) : await api.createMonitor(monitor);
      this.monitors = id ? this.monitors.map((m) => (m.id === id ? saved : m)) : [...this.monitors, saved];
      emit();
      return saved;
    }
    if (!monitor.name?.trim()) throw new Error('Give your monitor a name');
    if (!monitor.countries.length && !monitor.topics.length && !monitor.keywords?.trim()) {
      throw new Error('Choose at least one country, topic or keyword');
    }
    const saved = { ...monitor, id: id || `local-${Date.now().toString(36)}`, createdAt: Math.floor(Date.now() / 1000) };
    this.monitors = id ? this.monitors.map((m) => (m.id === id ? saved : m)) : [...this.monitors, saved];
    storage.set(LOCAL_MONITORS, this.monitors);
    emit();
    return saved;
  },

  async removeMonitor(id) {
    if (this.user) await api.deleteMonitor(id);
    this.monitors = this.monitors.filter((m) => m.id !== id);
    if (!this.user) storage.set(LOCAL_MONITORS, this.monitors);
    emit();
  },

  /** Check if a country code or topic slug is followed in any monitor. */
  isFollowed(kind, value) {
    if (!value) return false;
    return this.monitors.some((m) =>
      kind === 'country'
        ? Array.isArray(m.countries) && m.countries.includes(value)
        : Array.isArray(m.topics) && m.topics.includes(value),
    );
  },

  /** A "follow" is a monitor for exactly one country or one topic, or the monitor containing it. */
  followFor(kind, value) {
    if (!value) return null;
    const exact = this.monitors.find((m) =>
      kind === 'country'
        ? m.countries?.length === 1 && m.countries[0] === value && !m.topics?.length && !m.keywords
        : m.topics?.length === 1 && m.topics[0] === value && !m.countries?.length && !m.keywords,
    );
    if (exact) return exact;
    return this.monitors.find((m) =>
      kind === 'country'
        ? Array.isArray(m.countries) && m.countries.includes(value)
        : Array.isArray(m.topics) && m.topics.includes(value),
    );
  },

  get countryTopicPairs() {
    return this.monitors
      .filter((m) => m.countries?.length === 1 && m.topics?.length === 1 && !m.keywords)
      .map((m) => ({
        id: m.id,
        country: m.countries[0],
        topic: m.topics[0],
        name: m.name,
      }));
  },

  /** Synchronizes the exact set of followed country codes in one batch operation. */
  async syncFollowedCountries(codes) {
    return this.syncFollowing({ countries: codes, topics: this.followedTopics, pairs: this.countryTopicPairs });
  },

  /** Comprehensive following synchronizer: countries, topics, and specific topic-in-country pairs. */
  async syncFollowing({ countries = [], topics = [], pairs = [] } = {}) {
    return this._enqueue(async () => {
      const targetCountries = [...new Set((countries || []).filter((c) => /^[A-Z]{2}$/.test(c)))];
      const targetTopics = [...new Set((topics || []).filter((t) => typeof t === 'string' && t.length > 0))];
      const targetPairs = (pairs || []).filter((p) => p && /^[A-Z]{2}$/.test(p.country) && p.topic);

      // Existing single country monitors
      const currentCountryMonitors = this.monitors.filter((m) => m.countries?.length === 1 && !m.topics?.length && !m.keywords);
      // Existing single topic monitors
      const currentTopicMonitors = this.monitors.filter((m) => m.topics?.length === 1 && !m.countries?.length && !m.keywords);
      // Existing country + topic pair monitors
      const currentPairMonitors = this.monitors.filter((m) => m.countries?.length === 1 && m.topics?.length === 1 && !m.keywords);

      // 1. Sync Countries
      for (const m of currentCountryMonitors) {
        if (!targetCountries.includes(m.countries[0])) {
          await this.removeMonitor(m.id);
        }
      }
      const existingCountryCodes = this.monitors.filter((m) => m.countries?.length === 1 && !m.topics?.length && !m.keywords).map((m) => m.countries[0]);
      for (const code of targetCountries) {
        if (!existingCountryCodes.includes(code)) {
          const name = this.countryByCode.get(code)?.name || code;
          await this.saveMonitor({ name, countries: [code], topics: [], keywords: '' });
        }
      }

      // 2. Sync Topics
      for (const m of currentTopicMonitors) {
        if (!targetTopics.includes(m.topics[0])) {
          await this.removeMonitor(m.id);
        }
      }
      const existingTopicSlugs = this.monitors.filter((m) => m.topics?.length === 1 && !m.countries?.length && !m.keywords).map((m) => m.topics[0]);
      for (const slug of targetTopics) {
        if (!existingTopicSlugs.includes(slug)) {
          const name = this.topicBySlug.get(slug)?.name || slug;
          await this.saveMonitor({ name, countries: [], topics: [slug], keywords: '' });
        }
      }

      // 3. Sync Topic-in-Country Pairs
      for (const m of currentPairMonitors) {
        const stillPresent = targetPairs.some((p) => p.country === m.countries[0] && p.topic === m.topics[0]);
        if (!stillPresent) {
          await this.removeMonitor(m.id);
        }
      }
      const existingPairs = this.monitors.filter((m) => m.countries?.length === 1 && m.topics?.length === 1 && !m.keywords);
      for (const p of targetPairs) {
        const exists = existingPairs.some((m) => m.countries[0] === p.country && m.topics[0] === p.topic);
        if (!exists) {
          const cName = this.countryByCode.get(p.country)?.name || p.country;
          const tName = this.topicBySlug.get(p.topic)?.name || p.topic;
          await this.saveMonitor({
            name: `${tName} in ${cName}`,
            countries: [p.country],
            topics: [p.topic],
            keywords: '',
          });
        }
      }
    });
  },

  async toggleFollow(kind, value) {
    return this._enqueue(async () => {
      const existing = this.followFor(kind, value);
      if (existing) {
        const isSingleCountry = kind === 'country' && existing.countries?.length === 1 && !existing.topics?.length && !existing.keywords;
        const isSingleTopic = kind === 'topic' && existing.topics?.length === 1 && !existing.countries?.length && !existing.keywords;
        if (isSingleCountry || isSingleTopic) {
          await this.removeMonitor(existing.id);
          return false;
        }
        // In a multi-item monitor, remove this item
        const nextCountries = kind === 'country' ? existing.countries.filter((c) => c !== value) : existing.countries;
        const nextTopics = kind === 'topic' ? existing.topics.filter((t) => t !== value) : existing.topics;
        if (!nextCountries.length && !nextTopics.length && !existing.keywords) {
          await this.removeMonitor(existing.id);
        } else {
          await this.saveMonitor({
            ...existing,
            countries: nextCountries,
            topics: nextTopics,
          }, existing.id);
        }
        return false;
      }
      const name = kind === 'country' ? this.countryByCode.get(value)?.name : this.topicBySlug.get(value)?.name;
      await this.saveMonitor({
        name: name || value,
        countries: kind === 'country' ? [value] : [],
        topics: kind === 'topic' ? [value] : [],
        keywords: '',
      });
      return true;
    });
  },

  // ── Reading activity tracking ──────────────────────────────────────────────
  recordRead(article) {
    if (!article || !article.id) return;
    try {
      const history = JSON.parse(localStorage.getItem('sv_reading_activity') || '[]');
      const filtered = history.filter((x) => x.id !== article.id);
      filtered.unshift({
        id: article.id,
        title: article.title,
        countries: article.countries || [],
        topics: article.topics || [],
        source: article.source?.name,
        at: Date.now(),
      });
      localStorage.setItem('sv_reading_activity', JSON.stringify(filtered.slice(0, 30)));
    } catch {}
  },

  recordVisit(kind, key) {
    if (!kind || !key) return;
    try {
      const history = JSON.parse(localStorage.getItem('sv_reading_activity') || '[]');
      history.unshift({
        visitKind: kind,
        key,
        countries: kind === 'country' ? [key] : [],
        topics: kind === 'topic' ? [key] : [],
        at: Date.now(),
      });
      localStorage.setItem('sv_reading_activity', JSON.stringify(history.slice(0, 30)));
    } catch {}
  },

  getReadingActivity() {
    try {
      const raw = JSON.parse(localStorage.getItem('sv_reading_activity') || '[]');
      const countryCounts = {};
      const topicCounts = {};
      const readIds = new Set();
      for (const item of raw) {
        if (item.id) readIds.add(item.id);
        (item.countries || []).forEach((c) => { countryCounts[c] = (countryCounts[c] || 0) + 1; });
        (item.topics || []).forEach((t) => { topicCounts[t] = (topicCounts[t] || 0) + 1; });
      }
      const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).map(([c]) => c);
      const topTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).map(([t]) => t);
      return { topCountries, topTopics, readIds: [...readIds], totalEvents: raw.length };
    } catch {
      return { topCountries: [], topTopics: [], readIds: [], totalEvents: 0 };
    }
  },
};
