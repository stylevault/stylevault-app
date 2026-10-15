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

  // ── Monitors ────────────────────────────────────────────────────────────
  async saveMonitor(monitor, id = null) {
    if (this.user) {
      const { monitor: saved } = id ? await api.updateMonitor(id, monitor) : await api.createMonitor(monitor);
      this.monitors = id ? this.monitors.map((m) => (m.id === id ? saved : m)) : [...this.monitors, saved];
      emit();
      return saved;
    }
    if (!monitor.name?.trim()) throw new Error('Give your monitor a name');
    if (!monitor.countries.length && !monitor.topics.length && !monitor.keywords.trim()) {
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

  /** A "follow" is a monitor for exactly one country or one topic. */
  followFor(kind, value) {
    return this.monitors.find((m) =>
      kind === 'country'
        ? m.countries.length === 1 && m.countries[0] === value && !m.topics.length && !m.keywords
        : m.topics.length === 1 && m.topics[0] === value && !m.countries.length && !m.keywords,
    );
  },

  async toggleFollow(kind, value) {
    const existing = this.followFor(kind, value);
    if (existing) {
      await this.removeMonitor(existing.id);
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
  },
};
