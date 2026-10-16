import { $, $$, esc, flag, icon, nf } from '../lib.js';
import { store } from '../store.js';
import { errorState, skeletonRows } from '../ui.js';

/**
 * Swaps a native <select> for a compact, on-brand dropdown. The select stays in the DOM (hidden)
 * as the source of truth: picking an option sets its value and fires 'change', so existing
 * listeners keep working untouched.
 */
// Button shows a short form of the option ("WPS Index (Best first)" → "WPS Index"); the menu keeps the full text.
const dropParens = (text) => text.replace(/\s*\([^)]*\)/g, '').trim();

function brandSelect(select, { prefix = '', short = dropParens } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'bsel';
  const label = (opt) => `${prefix ? `<span class="bsel-prefix">${esc(prefix)}</span>` : ''}<span class="bsel-value">${esc(short(opt?.textContent.trim() || ''))}</span>`;
  wrap.innerHTML = `
    <button type="button" class="bsel-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(select.getAttribute('aria-label') || prefix)}">
      <span class="bsel-label">${label(select.selectedOptions[0])}</span>${icon('chevron-down')}
    </button>
    <div class="bsel-menu" role="listbox" hidden>
      ${[...select.options].map((o) => `
        <button type="button" class="bsel-opt" role="option" data-value="${esc(o.value)}" aria-selected="${o.selected}">
          <span>${esc(o.textContent.trim())}</span>${icon('check')}
        </button>`).join('')}
    </div>`;
  select.hidden = true;
  select.tabIndex = -1;
  select.after(wrap);

  const btn = wrap.querySelector('.bsel-btn');
  const menu = wrap.querySelector('.bsel-menu');
  const opts = [...menu.querySelectorAll('.bsel-opt')];
  const setOpen = (open) => {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', open);
    if (open) (opts.find((o) => o.getAttribute('aria-selected') === 'true') || opts[0])?.focus();
  };
  btn.addEventListener('click', () => setOpen(menu.hidden));
  menu.addEventListener('click', (e) => {
    const opt = e.target.closest('.bsel-opt');
    if (!opt) return;
    opts.forEach((o) => o.setAttribute('aria-selected', o === opt));
    btn.querySelector('.bsel-label').innerHTML = label([...select.options].find((o) => o.value === opt.dataset.value));
    setOpen(false);
    btn.focus();
    if (select.value !== opt.dataset.value) {
      select.value = opt.dataset.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  menu.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const i = opts.indexOf(document.activeElement);
    opts[(i + (e.key === 'ArrowDown' ? 1 : opts.length - 1)) % opts.length].focus();
  });
  // Close on outside click / Escape; listeners remove themselves once the view is gone.
  const onDoc = (e) => {
    if (!wrap.isConnected) { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); return; }
    if (!menu.hidden && !wrap.contains(e.target)) setOpen(false);
  };
  const onKey = (e) => { if (e.key === 'Escape' && !menu.hidden) { setOpen(false); btn.focus(); } };
  document.addEventListener('click', onDoc);
  document.addEventListener('keydown', onKey);
  return wrap;
}

// The 4 official Ria's Colony Travel & Border Tools
const TOOLS_METADATA = [
  {
    id: 'eta',
    slug: 'eta',
    title: 'African ETA & Visa Tracker',
    kicker: 'Entry & Visas',
    icon: '🛂',
    emoji: '🛂',
    desc: 'What each African country actually requires before you fly. Check pre-registration rules, airport taxes, entry fees, and official application portals.',
    image: '/assets/img/tools/eta-tracker.png',
    path: '/tools/eta',
  },
  {
    id: 'contraband',
    slug: 'contraband',
    title: 'Africa Contraband Guide',
    kicker: 'Customs & Baggage',
    icon: '🚫',
    emoji: '🚫',
    desc: 'What you cannot carry across the border in all 54 African countries: drone rules, currency export limits, single-use plastics, alcohol, and medications.',
    image: '/assets/img/tools/contraband.png',
    path: '/tools/contraband',
  },
  {
    id: 'safety',
    slug: 'safety',
    title: 'Women’s Safety in Africa',
    kicker: 'Safety & Security',
    icon: '🛡️',
    emoji: '🛡️',
    desc: 'How safe each country is for women travellers, drawn from the WPS Index, Gallup night safety survey, and verified local on-the-ground advice.',
    image: '/assets/img/tools/womens-safety.png',
    path: '/tools/safety',
  },
  {
    id: 'tourism',
    slug: 'tourism',
    title: 'Tourism at a Glance',
    kicker: 'Economics & Travel',
    icon: '📊',
    emoji: '📊',
    desc: 'Arrivals, receipts, spend per visitor, and sector growth for all 54 African countries from official UN Tourism and World Bank records.',
    image: '/assets/img/tools/tourism.jpg',
    path: '/tools/tourism',
  },
];

// Cache loaded tool data
const toolDataCache = new Map();

async function fetchToolData(file) {
  if (toolDataCache.has(file)) return toolDataCache.get(file);
  const res = await fetch(`/data/tools/${file}`);
  if (!res.ok) throw new Error(`Could not load data for ${file}`);
  const json = await res.json();
  toolDataCache.set(file, json);
  return json;
}

function hostOf(url) {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Bottom row linking to the other 3 tools ("when one is tapped on it leads to another"). */
function renderRelatedToolsBar(currentId) {
  const others = TOOLS_METADATA.filter((t) => t.id !== currentId);
  return `
    <section class="section warm tight" style="margin-top:40px;border-top:1px solid var(--line);overflow-x:hidden">
      <div class="wrap" style="min-width:0">
        <div class="section-head" style="margin-bottom:18px">
          <div>
            <h3 style="font-size:1.15rem;margin:0">Explore more African travel tools</h3>
          </div>
          <a class="text-link" href="/tools">All 4 tools ${icon('arrow-right')}</a>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 250px), 1fr));gap:14px;min-width:0">
          ${others.map((t) => `
            <a href="${t.path}" class="tool-card" style="padding:16px 18px;text-decoration:none;gap:10px">
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:1.4rem;line-height:1;flex:none">${t.emoji}</span>
                <div style="min-width:0">
                  <span class="eyebrow" style="font-size:0.68rem">${t.kicker}</span>
                  <h4 style="font-size:0.95rem;margin:2px 0 0;color:var(--deep);word-break:break-word">${esc(t.title)}</h4>
                </div>
              </div>
              <p style="font-size:0.80rem;color:var(--ink-2);line-height:1.45;margin:0">${esc(t.desc)}</p>
              <div style="margin-top:auto;font-size:0.78rem;font-weight:600;color:var(--plum);display:flex;align-items:center;gap:4px">
                Open tool ${icon('arrow-right')}
              </div>
            </a>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. TOOLS FEED / HUB VIEW
// ─────────────────────────────────────────────────────────────────────────────
function renderToolsFeed(main, { setTitle }) {
  setTitle('African Travel & Border Tools');

  main.innerHTML = `
    <header class="tools-header">
      <div class="wrap tools-header-inner">
        <div class="tools-header-copy">
          <h1>Travel &amp; Border Tools for Africa</h1>
          <p class="tools-lede">
            Official visa authorisations, customs and contraband rules, women’s safety rankings, and tourism economics across all 54 African countries.
          </p>
        </div>
        <div class="tools-header-right">
          <div class="tools-stats">
            <div class="tools-stat"><strong>4</strong><span>Interactive tools</span></div>
            <span class="tools-stat-sep"></span>
            <div class="tools-stat"><strong>54</strong><span>Countries</span></div>
            <span class="tools-stat-sep"></span>
            <div class="tools-stat"><strong>100%</strong><span>Official sources</span></div>
          </div>
        </div>
      </div>
    </header>

    <section class="tools-body">
      <div class="wrap tools-container">
        <div class="tools-hub-grid">
          ${TOOLS_METADATA.map((tool) => `
            <article class="tool-hub-card">
              <div class="thc-img-box">
                <img src="${tool.image}" alt="${esc(tool.title)}" loading="lazy" onerror="this.style.display='none'">
                <div class="thc-badge-float">
                  <span class="tool-pill is-topic" style="background:#ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
                    ${tool.emoji} ${esc(tool.kicker)}
                  </span>
                </div>
              </div>
              <div class="thc-body">
                <h2>
                  <a href="${tool.path}">${esc(tool.title)}</a>
                </h2>
                <p>${esc(tool.desc)}</p>
                <div class="thc-foot">
                  <span class="hint" style="font-size:0.75rem">All 54 African countries</span>
                  <a href="${tool.path}" class="btn btn-plum btn-sm" style="white-space:nowrap">
                    Open ${tool.title.split(' ')[0]} ${icon('arrow-right')}
                  </a>
                </div>
              </div>
            </article>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ETA TRACKER TOOL VIEW (Interactive Passport & Destination Resolver for ALL 54 countries)
// ─────────────────────────────────────────────────────────────────────────────
const ENTRY_TYPES = {
  free: {
    label: 'No visa needed',
    short: 'No visa',
    meaning: 'You just show your passport when you arrive.',
    color: '#166534',
    bg: '#f0fdf4',
  },
  free_step: {
    label: 'No visa, but apply online first',
    short: 'No visa, online form first',
    meaning: "You do not need a visa, but you must fill in a short online form before you fly. It is usually quick, and airlines check it before you board.",
    color: '#5c0060',
    bg: '#faf4fc',
  },
  on_arrival: {
    label: 'Visa on arrival',
    short: 'Visa on arrival',
    meaning: "You do not apply in advance. You get the visa at the airport or border when you arrive, and pay any fee there.",
    color: '#b45309',
    bg: '#fffbeb',
  },
  evisa: {
    label: 'Apply online before you fly',
    short: 'Apply online first',
    meaning: "You need a visa, and you apply for it on a government website before you travel. Once it is approved, you show it at the airport, printed or on your phone.",
    color: '#5c0060',
    bg: '#faf4fc',
  },
  embassy: {
    label: 'Visa from an embassy before you fly',
    short: 'Embassy visa first',
    meaning: "You need a visa before you travel, and you get it from that country's embassy or consulate. This usually means filling in forms and going in person.",
    color: '#9f1239',
    bg: '#fff1f2',
  },
  approval: {
    label: 'Special approval before you fly',
    short: 'Special approval first',
    meaning: "You need a visa that also has to be approved by senior government officials in that country. It takes longer than a normal visa, so apply early.",
    color: '#9f1239',
    bg: '#fff1f2',
  },
  unclear: {
    label: 'Sources disagree, check before you book',
    short: 'Sources disagree',
    meaning: 'Official information and news reports give different answers for this passport, so check the official site before you book.',
    color: '#6b7280',
    bg: '#f3f4f6',
  },
};

function resolveEntry(entry, passportId, destinationId) {
  if (!entry || !passportId) return null;
  if (passportId === destinationId) return { type: 'home' };

  const group = (entry.groups || []).find((g) => g.countries.includes(passportId));
  const rule = group || entry.others || {};
  return {
    type: rule.type || 'unclear',
    days: rule.days ?? null,
    note: rule.note ?? null,
    cost: rule.cost ?? null,
    url: rule.url ?? entry.others?.url ?? null,
    stepName: rule.stepName ?? null,
    fromOthers: !group,
  };
}

function listGroups(entry, destinationId, allCountryIds) {
  if (!entry) return [];
  const named = new Set((entry.groups || []).flatMap((g) => g.countries));
  const rest = allCountryIds.filter((id) => id !== destinationId && !named.has(id));

  const sources = (entry.groups || []).map((g) => ({ ...g, isOthers: false }));
  if (rest.length > 0 && entry.others) sources.push({ ...entry.others, countries: rest, isOthers: true });

  const rows = [];
  sources.forEach((src, i) => {
    const key = `${src.type}|${src.days ?? ''}|${src.cost ?? ''}`;
    const note = src.note ? { text: src.note, about: src.isOthers ? null : src.countries } : null;
    const existing = rows.find((r) => r.key === key);
    if (!existing) {
      rows.push({
        key,
        order: i,
        type: src.type,
        days: src.days ?? null,
        cost: src.cost ?? null,
        countries: [...src.countries],
        isOthers: src.isOthers,
        merged: false,
        notes: note ? [note] : [],
      });
      return;
    }
    existing.countries.push(...src.countries);
    existing.isOthers = existing.isOthers || src.isOthers;
    existing.merged = true;
    if (note) existing.notes.push(note);
  });

  const order = ['free', 'free_step', 'on_arrival', 'evisa', 'embassy', 'approval', 'unclear'];
  return rows.sort((a, b) => {
    return (order.indexOf(a.type) - order.indexOf(b.type)) || ((b.days ?? 0) - (a.days ?? 0)) || (a.order - b.order);
  });
}

function formatStay(days) {
  if (!days) return null;
  if (days === 365) return 'Up to 1 year';
  if (days === 180) return 'Up to 6 months';
  return `Up to ${days} days`;
}

async function renderEtaTool(main, { setTitle }) {
  setTitle('African ETA & Visa Tracker');

  main.innerHTML = `
    <header class="tools-header">
      <div class="wrap tools-header-inner">
        <div class="tools-header-copy">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding-top:8px">
            <a href="/tools" class="text-link" style="font-size:0.82rem;font-weight:500;color:var(--plum)">← All Travel Tools</a>
          </div>
          <h1 style="font-size:clamp(1.25rem, 3.5vw, 1.6rem);margin:0">African ETA &amp; Visa Tracker</h1>
          <p class="tools-lede" style="font-size:0.84rem;margin-top:4px">
            What African countries actually require before your flight: pre-registration forms, electronic visas, and airport security taxes for all 54 African passports.
          </p>
        </div>
      </div>
    </header>

    <section class="tools-body">
      <div class="wrap tools-container" style="max-width:760px">
        <!-- Compact Passport & Destination Selectors -->
        <div class="tool-card" style="padding:14px 16px;gap:10px;background:#ffffff">
          <span style="font-size:0.82rem;font-weight:600;color:var(--deep)">Check entry rules between any two African countries:</span>
          <div class="eta-pickers-row" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 220px), 1fr));gap:10px;width:100%">
            <div class="eta-select-box">
              <label class="eta-select-label" for="eta-passport-select" style="font-size:0.75rem;color:var(--muted);margin-bottom:3px;display:block">Your passport:</label>
              <select id="eta-passport-select" class="eta-select" style="height:36px;font-size:0.84rem;font-weight:500;width:100%" data-eta-passport>
                <option value="">Loading passports…</option>
              </select>
            </div>
            <div class="eta-select-box">
              <label class="eta-select-label" for="eta-dest-select" style="font-size:0.75rem;color:var(--muted);margin-bottom:3px;display:block">Going to:</label>
              <select id="eta-dest-select" class="eta-select" style="height:36px;font-size:0.84rem;font-weight:500;width:100%" data-eta-destination>
                <option value="">Loading destinations…</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Answer Card Area -->
        <div data-eta-answer-area style="width:100%;min-width:0;margin-top:12px">
          ${skeletonRows(2)}
        </div>

        <!-- Collapsible 54-Country Directory Drawer -->
        <details class="eta-directory-drawer">
          <summary class="eta-dir-summary">
            <span style="font-weight:600;font-size:0.86rem;color:var(--deep);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Browse all 54 African countries</span>
            <span style="font-size:0.76rem;color:var(--plum);font-weight:500;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;flex:none;margin-left:auto">
              <span>View list</span>
              <span class="eta-dir-icon">${icon('chevron-down')}</span>
            </span>
          </summary>
          <div class="eta-dir-content">
            <div class="tool-toolbar" style="margin-bottom:12px">
              <input type="search" class="input tool-search-input" placeholder="Search country (e.g. Kenya, Ghana)…" data-eta-dir-search style="max-width:240px;height:34px;font-size:0.80rem">
              <span class="hint" data-eta-dir-count style="font-size:0.74rem">54 countries</span>
            </div>
            <div data-eta-directory style="display:grid;grid-template-columns:repeat(auto-fill, minmax(min(100%, 190px), 1fr));gap:8px;width:100%">
              ${skeletonRows(4)}
            </div>
          </div>
        </details>
      </div>
    </section>
    ${renderRelatedToolsBar('eta')}
  `;

  try {
    const data = await fetchToolData('eta_tracker.json');
    const schemes = (data.schemes || []).sort((a, b) => a.country.localeCompare(b.country));
    const allIds = schemes.map((s) => s.id);
    const byId = Object.fromEntries(schemes.map((s) => [s.id, s]));

    const passportSelect = $('[data-eta-passport]', main);
    const destSelect = $('[data-eta-destination]', main);
    const answerArea = $('[data-eta-answer-area]', main);
    const dirList = $('[data-eta-directory]', main);
    const dirSearch = $('[data-eta-dir-search]', main);
    const dirCount = $('[data-eta-dir-count]', main);

    // Initial passport selection: Nigeria by default or saved in localStorage
    const savedPassport = localStorage.getItem('sv_eta_passport') || 'NG';
    const initialPassport = byId[savedPassport] ? savedPassport : (schemes[0]?.id || 'CV');
    const initialDest = 'CV'; // Cabo Verde default

    // Populate dropdowns
    passportSelect.innerHTML = schemes.map((s) => `<option value="${s.id}" ${s.id === initialPassport ? 'selected' : ''}>${esc(s.country)}</option>`).join('');
    destSelect.innerHTML = schemes.map((s) => `<option value="${s.id}" ${s.id === initialDest ? 'selected' : ''}>${esc(s.country)}</option>`).join('');

    // Update Answer View
    const renderAnswer = (passId, destId) => {
      const pass = byId[passId];
      const dest = byId[destId];
      if (!pass || !dest) return;

      const entry = dest.entry;
      const answer = resolveEntry(entry, pass.id, dest.id);

      if (answer?.type === 'home') {
        answerArea.innerHTML = `
          <div class="eta-explorer-card">
            <div class="eta-ans-top">
              <span>${esc(pass.country)} passport</span>
              <span>➔</span>
              <span>${esc(dest.country)}</span>
            </div>
            <div class="eta-ans-body" style="padding:18px 20px">
              <div class="eta-ans-head" style="font-size:1.15rem">
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#166534"></span>
                <span>Your own country</span>
              </div>
              <p class="eta-ans-meaning" style="font-size:0.86rem">
                You hold a passport for ${esc(dest.country)}. You do not need a visa, e-visa, or pre-departure authorisation to enter your own home country.
              </p>
            </div>
          </div>
        `;
        return;
      }

      const info = ENTRY_TYPES[answer?.type] || ENTRY_TYPES.unclear;
      const stay = formatStay(answer?.days);
      const cost = answer?.cost;
      const applyUrl = answer?.url || dest.entry?.others?.url;
      const showLink = applyUrl && answer?.type !== 'free';
      const hasFacts = !!(stay || cost || showLink);
      const everyone = dest.entry?.everyone;
      const groups = listGroups(entry, dest.id, allIds);

      answerArea.innerHTML = `
        <div class="eta-explorer-card">
          <div class="eta-ans-top">
            <span>${esc(pass.country)} passport</span>
            <span>➔</span>
            <span>${esc(dest.country)}</span>
          </div>

          <div class="eta-ans-body" style="padding:18px 20px">
            <div>
              <div class="eta-ans-head" style="font-size:1.15rem">
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${info.color};flex:none"></span>
                <span>${esc(info.label)}</span>
              </div>
              <p class="eta-ans-meaning" style="font-size:0.86rem;margin-top:4px">
                ${esc(everyone && answer?.type === 'free' ? 'You don’t need a visa, but there is one step every visitor must do, explained below.' : info.meaning)}
              </p>
            </div>

            <!-- Essential Facts: Stay, Cost, Portal -->
            ${hasFacts ? `
              <div class="eta-facts-grid" style="padding:12px 16px;gap:12px 18px">
                ${stay ? `
                  <div>
                    <span class="eta-fact-dt">Stay</span>
                    <div class="eta-fact-dd">${esc(stay)}</div>
                  </div>
                ` : ''}
                ${cost ? `
                  <div>
                    <span class="eta-fact-dt">Cost</span>
                    <div class="eta-fact-dd">${esc(cost)}</div>
                  </div>
                ` : ''}
                ${showLink ? `
                  <div>
                    <span class="eta-fact-dt">${answer?.type === 'unclear' ? 'Check at' : 'Apply at'}</span>
                    <div class="eta-fact-dd">
                      <a href="${esc(applyUrl)}" target="_blank" rel="noopener noreferrer" class="eta-link">
                        ${esc(hostOf(applyUrl))}
                      </a>
                    </div>
                  </div>
                ` : ''}
              </div>
            ` : ''}

            <!-- Answer Note if present -->
            ${answer?.note ? `
              <p style="font-size:0.85rem;color:var(--ink-2);line-height:1.55;margin:0">
                ${esc(answer.note)}
              </p>
            ` : ''}

            <!-- Mandatory Everyone Step (e.g. Cabo Verde TSA / EASE, Nigeria Landing Card, Seychelles, Kenya eTA) -->
            ${everyone ? `
              <div class="eta-must-do">
                <p style="font-weight:600;font-size:0.88rem;color:var(--deep);margin:0 0 4px">Every visitor also has to do this</p>
                <p style="margin:0 0 4px;font-size:0.84rem;color:var(--ink-2);line-height:1.55">${esc(everyone.note || dest.scopeNote || '')}</p>
                <p style="margin:0;font-size:0.84rem;color:var(--ink-2);line-height:1.55">
                  ${everyone.url ? `Do it at <a href="${esc(everyone.url)}" target="_blank" rel="noopener noreferrer" class="eta-link">${esc(hostOf(everyone.url))}</a>` : ''}${everyone.when ? `, ${esc(everyone.when)}` : ''}.${everyone.name ? ` It’s called ${esc(everyone.name)}.` : ''}${everyone.cost ? ` Cost: ${esc(everyone.cost)}.` : ''}
                </p>
              </div>
            ` : ''}

            <!-- Good to know advisory note -->
            ${dest.notes ? `
              <div style="padding:10px 14px;background:#faf8fc;border:1px solid #ebe2f0;border-radius:8px;font-size:0.80rem;color:var(--ink-2);line-height:1.55">
                <strong style="color:var(--deep);display:block;margin-bottom:2px">Good to know about ${esc(dest.country)}:</strong>
                ${esc(dest.notes)}
              </div>
            ` : ''}

            <!-- How each African passport enters this country (Collapsible Groups) -->
            <div class="eta-groups-box">
              <div style="margin-bottom:10px">
                <h4 style="font-size:0.90rem;font-weight:600;color:var(--deep);margin:0">Entering ${esc(dest.country)}</h4>
                <p style="font-size:0.74rem;color:var(--muted);margin:2px 0 0">How all 54 African passports enter</p>
              </div>

              <div>
                ${groups.map((group, idx) => {
                  const gInfo = ENTRY_TYPES[group.type] || ENTRY_TYPES.unclear;
                  const gStay = formatStay(group.days);
                  const countryNames = group.countries.map((id) => byId[id]?.country).filter(Boolean);
                  const isUserPass = group.countries.includes(pass.id);

                  return `
                    <details class="eta-group-details" ${idx === 0 || isUserPass ? 'open' : ''}>
                      <summary class="eta-group-summary">
                        <div style="display:flex;align-items:center;gap:6px;min-width:0;flex-wrap:wrap">
                          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${gInfo.color};flex:none"></span>
                          <span style="font-weight:600;font-size:0.82rem;color:var(--deep)">${esc(gInfo.short)}</span>
                          <span style="font-size:0.74rem;color:var(--muted)">(${countryNames.length}${gStay ? ` · ${esc(gStay)}` : ''})</span>
                          ${isUserPass ? `<span class="tool-pill is-topic" style="font-size:0.66rem;padding:1px 6px">Your passport</span>` : ''}
                        </div>
                        <span class="eta-expand-hint">${icon('chevron-down')}</span>
                      </summary>
                      <div class="eta-group-content">
                        ${countryNames.map((name) => {
                          const isMe = name === pass.country;
                          return isMe ? `<strong class="eta-my-pass">${esc(name)}</strong>` : `<span class="eta-country-chip">${esc(name)}</span>`;
                        }).join('')}
                      </div>
                    </details>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    };

    passportSelect.addEventListener('change', () => {
      const pid = passportSelect.value;
      localStorage.setItem('sv_eta_passport', pid);
      renderAnswer(pid, destSelect.value);
    });

    destSelect.addEventListener('change', () => {
      renderAnswer(passportSelect.value, destSelect.value);
    });

    // Render 54-Country Directory inside Drawer
    const renderDirectory = (items) => {
      dirCount.textContent = `Showing ${items.length} of ${schemes.length} countries`;
      if (!items.length) {
        dirList.innerHTML = `<div class="uh-empty" style="grid-column:1/-1;padding:16px"><p style="font-size:0.82rem">No country matches that search.</p></div>`;
        return;
      }

      dirList.innerHTML = items.map((s) => {
        const isOperating = s.status === 'operating';
        const isWaived = s.status === 'waived_for_africans';
        const badge = isOperating
          ? `<span class="tool-pill is-live" style="font-size:0.66rem">Mandatory ETA</span>`
          : isWaived
          ? `<span class="tool-pill is-waived" style="font-size:0.66rem">Free for Africans</span>`
          : `<span class="tool-pill" style="font-size:0.66rem;background:#f3f4f6;color:#4b5563">Standard</span>`;

        return `
          <div class="tool-card" style="padding:10px 12px;gap:6px;cursor:pointer;border:1px solid #ebe2f0;border-radius:8px" data-select-dest="${s.id}">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
              <strong style="font-size:0.84rem;color:var(--deep)">${esc(s.country)}</strong>
              ${badge}
            </div>
            <div style="margin-top:auto;font-size:0.70rem;color:var(--plum);font-weight:500;display:flex;align-items:center;gap:3px">
              Check rules ${icon('arrow-right')}
            </div>
          </div>
        `;
      }).join('');

      $$('[data-select-dest]', dirList).forEach((card) => {
        card.addEventListener('click', () => {
          const id = card.dataset.selectDest;
          destSelect.value = id;
          renderAnswer(passportSelect.value, id);
          window.scrollTo({ top: answerArea.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
        });
      });
    };

    renderAnswer(initialPassport, initialDest);
    renderDirectory(schemes);

    dirSearch.addEventListener('input', () => {
      const q = dirSearch.value.trim().toLowerCase();
      const filtered = schemes.filter((s) => s.country.toLowerCase().includes(q) || (s.name || '').toLowerCase().includes(q));
      renderDirectory(filtered);
    });
  } catch (err) {
    answerArea.innerHTML = errorState(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CONTRABAND GUIDE TOOL VIEW (Breathable typography & "What counts?" explainers)
// ─────────────────────────────────────────────────────────────────────────────
async function renderContrabandTool(main, { setTitle }) {
  setTitle('Africa Contraband & Customs Guide');

  main.innerHTML = `
    <header class="tools-header">
      <div class="wrap tools-header-inner">
        <div class="tools-header-copy">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;padding-top:24px">
            <a href="/tools" class="text-link" style="font-size:0.82rem;font-weight:500;color:var(--plum)">← All Travel Tools</a>
          </div>
          <h1>Africa Contraband &amp; Customs Guide</h1>
          <p class="tools-lede">
            Banned items, permit requirements, and customs fines for all 54 African countries: drone rules, currency export limits, single-use plastics, and medications.
          </p>
        </div>
      </div>
    </header>

    <section class="tools-body">
      <div class="wrap tools-container">
        <!-- Collapsible Item Filter Drawer -->
        <details class="cb-filter-drawer">
          <summary class="cb-filter-drawer-summary">
            <div class="cb-filter-sum-left">
              <span class="cb-filter-icon">🧳</span>
              <div class="cb-filter-sum-text">
                <div class="cb-filter-heading">
                  <span class="cb-filter-title">Filter by item</span>
                  <span class="cb-filter-badge" data-cb-active-filter-badge>All items</span>
                </div>
                <div class="cb-filter-sub">
                  Drones, plastics, cash, meds, alcohol &amp; more
                </div>
              </div>
            </div>
            <span class="cb-filter-sum-right">
              <span class="cb-filter-toggle-label">Filter items</span>
              <span class="cb-filter-chevron">${icon('chevron-down')}</span>
            </span>
          </summary>
          <div class="cb-filter-drawer-body">
            <div class="cb-filter-chips">
              <button type="button" class="tool-filter-chip active" data-topic-filter="" data-topic-name="All items">All items</button>
              <button type="button" class="tool-filter-chip" data-topic-filter="drone" data-topic-name="Drones">🛸 Drones</button>
              <button type="button" class="tool-filter-chip" data-topic-filter="plastic" data-topic-name="Plastic bags">🛍️ Plastic bags</button>
              <button type="button" class="tool-filter-chip" data-topic-filter="currency" data-topic-name="Cash limits">💵 Cash limits</button>
              <button type="button" class="tool-filter-chip" data-topic-filter="medication" data-topic-name="Prescription meds">💊 Prescription meds</button>
              <button type="button" class="tool-filter-chip" data-topic-filter="alcohol" data-topic-name="Alcohol">🍷 Alcohol</button>
              <button type="button" class="tool-filter-chip" data-topic-filter="pork" data-topic-name="Pork & Meat">🥓 Pork &amp; Meat</button>
              <button type="button" class="tool-filter-chip" data-topic-filter="photograph" data-topic-name="Photography">📷 Photography</button>
              <button type="button" class="tool-filter-chip" data-topic-filter="ivory" data-topic-name="Wildlife & Ivory">🐘 Wildlife &amp; Ivory</button>
              <button type="button" class="tool-filter-chip" data-topic-filter="counterfeit" data-topic-name="Fake brands">🏷️ Fake brands</button>
            </div>
          </div>
        </details>

        <!-- Cohesive Controls Bar: Search + Region Dropdown + Status Bar -->
        <div class="cb-controls-bar">
          <div class="cb-search-row">
            <div class="cb-search-wrap">
              <span class="cb-search-icon">${icon('search')}</span>
              <input type="search" class="input cb-search-input" placeholder="Search country, item, or rule (e.g. Kenya, drones, tyres)…" data-cb-search>
            </div>
            <div class="cb-region-wrap">
              <select class="eta-select cb-region-select" data-cb-region aria-label="Filter by region">
                <option value="">All African regions (54)</option>
                <option value="West">West Africa (16)</option>
                <option value="East">East Africa &amp; Islands (18)</option>
                <option value="North">North Africa (6)</option>
                <option value="Central">Central Africa (9)</option>
                <option value="Southern">Southern Africa (5)</option>
              </select>
            </div>
          </div>

          <div class="cb-status-bar">
            <div class="cb-status-count">
              <span class="cb-count-dot"></span>
              <span data-cb-count>54 African countries</span>
            </div>
            <div class="cb-status-actions">
              <button type="button" class="cb-toggle-all-btn" data-cb-toggle-all>
                <span class="cb-toggle-icon">↕</span>
                <span data-cb-toggle-text>Expand all</span>
              </button>
            </div>
          </div>
        </div>

        <div data-cb-list style="display:grid;gap:12px;width:100%;min-width:0;margin-top:14px">
          ${skeletonRows(4)}
        </div>
      </div>
    </section>
    ${renderRelatedToolsBar('contraband')}
  `;

  try {
    const [cbData, termsData, officialData] = await Promise.all([
      fetchToolData('contraband.json'),
      fetchToolData('contraband-terms.json').catch(() => ({ terms: [] })),
      fetchToolData('contraband-official.json').catch(() => ({ lists: {}, countries: {} })),
    ]);

    const countries = cbData.countries || [];
    const terms = termsData.terms || [];
    const termsById = Object.fromEntries(terms.map((t) => [t.id, t]));
    const listEl = $('[data-cb-list]', main);
    const countEl = $('[data-cb-count]', main);
    const searchInput = $('[data-cb-search]', main);
    const regionSelect = $('[data-cb-region]', main);
    const toggleAllBtn = $('[data-cb-toggle-all]', main);
    let selectedTopic = '';
    let selectedRegion = '';

    // Matcher for legal terms to provide "What counts?" explanations
    const findMatchedTerms = (text) => {
      if (!text) return [];
      const lower = text.toLowerCase();
      return terms.filter((t) => {
        try {
          const re = new RegExp(t.match, 'i');
          return re.test(lower);
        } catch {
          return false;
        }
      });
    };

    const renderList = (filtered, autoOpen = false) => {
      if (filtered.length === countries.length) {
        countEl.textContent = '54 African countries';
      } else {
        const parts = [];
        if (selectedRegion) parts.push(`${selectedRegion} Africa`);
        if (selectedTopic) parts.push(selectedTopic);
        const filterNote = parts.length ? ` · ${parts.join(', ')}` : '';
        countEl.textContent = `${filtered.length} of ${countries.length}${filterNote}`;
      }
      if (!filtered.length) {
        listEl.innerHTML = `<div class="uh-empty"><p>No customs entries match that filter.</p></div>`;
        return;
      }

      listEl.innerHTML = filtered.map((c, idx) => {
        const bannedBlock = c.blocks?.find((b) => b.type === 'ban');
        const restrictedBlock = c.blocks?.find((b) => b.type === 'restrict');
        const penaltyBlock = c.blocks?.find((b) => b.type === 'penalty');
        const noteBlock = c.blocks?.find((b) => b.type === 'note');

        const bannedItems = bannedBlock?.segments?.flatMap((s) => s.items || (s.p ? [s.p] : [])) || [];
        const restrictedItems = restrictedBlock?.segments?.flatMap((s) => s.items || (s.p ? [s.p] : [])) || [];
        const penaltyText = penaltyBlock?.segments?.map((s) => s.p).filter(Boolean).join(' ') || '';
        const noteText = noteBlock?.segments?.map((s) => s.p).filter(Boolean).join(' ') || '';

        // Build brief preview snippet for collapsed state
        let previewSnippet = '';
        if (bannedItems.length) {
          previewSnippet = `Banned: ${bannedItems.slice(0, 3).join(', ')}`;
          if (restrictedItems.length) previewSnippet += ` · Restricted: ${restrictedItems.slice(0, 2).join(', ')}`;
        } else if (restrictedItems.length) {
          previewSnippet = `Restricted: ${restrictedItems.slice(0, 3).join(', ')}`;
        } else {
          previewSnippet = 'Official customs rules and entry declarations';
        }

        // Official lists mapped for this country
        const officialIds = officialData.countries?.[c.country] || [];
        const officialLists = officialIds.map((id) => officialData.lists?.[id]).filter(Boolean);

        // Find all unique terms mentioned anywhere in this country entry
        const allText = [
          ...bannedItems,
          ...restrictedItems,
          penaltyText,
          noteText,
          ...officialLists.map((l) => l.title),
        ].join(' ');
        const matchedTerms = findMatchedTerms(allText);
        const uniqueTerms = [...new Map(matchedTerms.map((t) => [t.id, t])).values()];

        return `
          <details class="cb-country-drawer" data-country="${esc(c.country)}" ${autoOpen ? 'open' : ''}>
            <summary class="cb-country-summary">
              <div class="cb-country-sum-left">
                <span class="cb-country-num">${String(c.n || idx + 1).padStart(2, '0')}</span>
                <div class="cb-country-meta">
                  <div class="cb-country-title-row">
                    <span class="cb-country-name">${esc(c.country)}</span>
                    <span class="cb-country-region">· ${esc(c.region || 'Africa')}</span>
                    ${officialLists.length ? `<span class="cb-official-badge">Official list</span>` : ''}
                  </div>
                  <div class="cb-country-preview">${esc(previewSnippet)}</div>
                </div>
              </div>
              <span class="cb-country-chevron">${icon('chevron-down')}</span>
            </summary>

            <div class="cb-country-content">
              <!-- Banned items -->
              ${bannedItems.length ? `
                <div class="cb-section-box ban">
                  <span class="cb-section-title">⛔ Banned Items</span>
                  <ul class="cb-items-list">
                    ${bannedItems.map((item) => `<li>${esc(item)}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}

              <!-- Restricted items -->
              ${restrictedItems.length ? `
                <div class="cb-section-box restrict">
                  <span class="cb-section-title">⚠️ Restricted (Requires Permit or Declaration)</span>
                  <ul class="cb-items-list">
                    ${restrictedItems.map((item) => `<li>${esc(item)}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}

              <!-- Penalties -->
              ${penaltyText ? `
                <div style="padding:12px 16px;background:#fdf4ff;border:1px solid #fae8ff;border-radius:10px;font-size:0.84rem;color:var(--deep);line-height:1.55">
                  <span class="cb-badge penalty" style="margin-bottom:6px">Penalties &amp; Fines</span>
                  <p style="margin:4px 0 0">${esc(penaltyText)}</p>
                </div>
              ` : ''}

              <!-- Good to know official note -->
              ${noteText ? `
                <div style="padding:10px 14px;background:#faf7fb;border:1px solid #efe8f4;border-radius:8px;font-size:0.80rem;color:var(--muted);line-height:1.5">
                  <strong style="color:var(--deep)">Official Note:</strong> ${esc(noteText)}
                </div>
              ` : ''}

              <!-- Terms In Entry: Neat tap-to-explain chips -->
              ${uniqueTerms.length ? `
                <div class="cb-terms-box" data-terms-box>
                  <span class="cb-terms-label">Legal terms in this entry (tap to explain):</span>
                  <div class="cb-terms-chips">
                    ${uniqueTerms.map((t) => `
                      <button type="button" class="cb-term-chip" data-term-id="${esc(t.id)}">
                        ${esc(t.term)}
                      </button>
                    `).join('')}
                  </div>
                  <div class="cb-term-drawer" style="display:none"></div>
                </div>
              ` : ''}

              <!-- Official customs source citations -->
              ${officialLists.length ? `
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:0.78rem;color:var(--muted);padding-top:12px;border-top:1px solid #efe8f4">
                  <span>Official customs source:</span>
                  ${officialLists.map((list) => `
                    <a href="${esc(list.source?.url || '#')}" target="_blank" rel="noopener noreferrer" class="eta-link">
                      ${esc(list.title)}
                    </a>
                  `).join(', ')}
                </div>
              ` : ''}
            </div>
          </details>
        `;
      }).join('');

      // Wire term chips
      $$('[data-terms-box]', listEl).forEach((box) => {
        const drawer = $('.cb-term-drawer', box);
        const chips = $$('.cb-term-chip', box);
        let activeTermId = null;

        chips.forEach((chip) => {
          chip.addEventListener('click', (e) => {
            e.preventDefault();
            const termId = chip.dataset.termId;
            const term = termsById[termId];
            if (!term) return;

            if (activeTermId === termId) {
              activeTermId = null;
              chips.forEach((c) => c.classList.remove('active'));
              drawer.style.display = 'none';
              return;
            }

            activeTermId = termId;
            chips.forEach((c) => c.classList.toggle('active', c.dataset.termId === termId));
            drawer.innerHTML = `
              <div style="font-size:0.84rem;color:var(--deep);line-height:1.55">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
                  <strong style="color:var(--plum);font-size:0.88rem">${esc(term.term)}</strong>
                  <button type="button" class="cb-term-close" style="background:none;border:none;font-size:0.76rem;color:var(--muted);cursor:pointer;padding:2px 6px">Close ×</button>
                </div>
                <p style="margin:2px 0 6px;color:var(--ink-2)">${esc(term.means)}</p>
                <div style="font-weight:600;font-size:0.76rem;color:var(--plum);margin-top:6px">Common items travellers get stopped with:</div>
                <ul style="margin:4px 0 0;padding-left:16px;font-size:0.80rem;color:var(--ink-2)">
                  ${term.examples.slice(0, 3).map((ex) => `<li>${esc(ex)}</li>`).join('')}
                </ul>
                ${term.tip ? `<p style="margin:6px 0 0;font-style:italic;font-size:0.78rem;color:var(--muted)">Tip: ${esc(term.tip)}</p>` : ''}
              </div>
            `;
            drawer.style.display = 'block';

            $('.cb-term-close', drawer)?.addEventListener('click', () => {
              activeTermId = null;
              chips.forEach((c) => c.classList.remove('active'));
              drawer.style.display = 'none';
            });
          });
        });
      });
    };

    const updateFilter = () => {
      const q = searchInput.value.trim().toLowerCase();
      selectedRegion = regionSelect.value.trim();

      const filtered = countries.filter((c) => {
        const matchesQuery = !q || c.country.toLowerCase().includes(q) || (c.region || '').toLowerCase().includes(q);
        if (!matchesQuery) return false;

        if (selectedRegion && !(c.region || '').toLowerCase().includes(selectedRegion.toLowerCase())) {
          return false;
        }

        if (!selectedTopic) return true;
        const allText = JSON.stringify(c.blocks || {}).toLowerCase();
        return allText.includes(selectedTopic);
      });

      const autoOpen = Boolean(q || selectedTopic);
      renderList(filtered, autoOpen);
      if (toggleAllBtn) {
        const toggleText = $('[data-cb-toggle-text]', toggleAllBtn);
        if (toggleText) toggleText.textContent = autoOpen ? 'Collapse all' : 'Expand all';
      }
    };

    renderList(countries, false);

    searchInput.addEventListener('input', updateFilter);
    regionSelect.addEventListener('change', updateFilter);

    $$('[data-topic-filter]', main).forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('[data-topic-filter]', main).forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        selectedTopic = btn.dataset.topicFilter;
        const badge = $('[data-cb-active-filter-badge]', main);
        if (badge) badge.textContent = btn.dataset.topicName || 'All items';
        updateFilter();
      });
    });

    if (toggleAllBtn) {
      toggleAllBtn.addEventListener('click', () => {
        const drawers = $$('.cb-country-drawer', listEl);
        const anyClosed = Array.from(drawers).some((d) => !d.open);
        drawers.forEach((d) => (d.open = anyClosed));
        const toggleText = $('[data-cb-toggle-text]', toggleAllBtn);
        if (toggleText) toggleText.textContent = anyClosed ? 'Collapse all' : 'Expand all';
      });
    }
  } catch (err) {
    $('[data-cb-list]', main).innerHTML = errorState(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. WOMEN'S SAFETY TOOL VIEW (Breathable typography, no wrap glitches, explainers)
// ─────────────────────────────────────────────────────────────────────────────
async function renderSafetyTool(main, { setTitle }) {
  setTitle('Women’s Safety in Africa');

  main.innerHTML = `
    <header class="tools-header">
      <div class="wrap tools-header-inner">
        <div class="tools-header-copy">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding-top:8px">
            <a href="/tools" class="text-link" style="font-size:0.82rem;font-weight:500;color:var(--plum)">← All Travel Tools</a>
          </div>
          <h1>Women’s Safety in Africa</h1>
          <p class="tools-lede">
            How safe each country is for women travellers: Georgetown WPS Index ranks, night safety perception, and verified local advice.
          </p>
        </div>
      </div>
    </header>

    <section class="tools-body">
      <div class="wrap tools-container">
        <!-- Cohesive Controls Bar: Search + Region + Sort + Status Bar -->
        <div class="cb-controls-bar">
          <div class="cb-search-row ws-search-row">
            <div class="cb-search-wrap">
              <span class="cb-search-icon">${icon('search')}</span>
              <input type="search" class="input cb-search-input" placeholder="Search a country or region" aria-label="Search a country or region" data-safety-search>
            </div>
            <div class="cb-region-wrap">
              <select class="eta-select cb-region-select" data-safety-region aria-label="Filter by region">
                <option value="">All African regions (54)</option>
                <option value="West">West Africa (16)</option>
                <option value="East">East Africa &amp; Islands (18)</option>
                <option value="North">North Africa (6)</option>
                <option value="Central">Central Africa (9)</option>
                <option value="Southern">Southern Africa (5)</option>
              </select>
            </div>
            <div class="tool-sort-group" style="flex:none">
              <span class="tool-sort-label" style="font-size:0.80rem;color:var(--muted)">Sort:</span>
              <select class="eta-select" data-safety-sort style="height:38px;border-radius:9px;font-size:0.82rem;padding:0 28px 0 10px">
                <option value="wps">WPS Index (Best first)</option>
                <option value="night">Night safety (% safe)</option>
                <option value="name">Country name (A–Z)</option>
              </select>
            </div>
          </div>

          <div class="ws-status-bar">
            <div class="ws-status-row">
              <div class="cb-status-count">
                <span class="cb-count-dot"></span>
                <span data-safety-count>54 African countries</span>
              </div>
              <button type="button" class="cb-toggle-btn ws-toggle-btn" data-safety-toggle-all title="Expand or collapse all 54 country files">
                <span data-safety-toggle-text>Expand all</span>
                ${icon('chevron-down')}
              </button>
            </div>
            <div class="ws-tier-chips" role="toolbar" aria-label="Filter by safety tier">
              <button type="button" class="tool-filter-chip active" data-safety-tier="">All tiers</button>
              <button type="button" class="tool-filter-chip" data-safety-tier="safer">Safer choices</button>
              <button type="button" class="tool-filter-chip" data-safety-tier="care">Exercise care</button>
              <button type="button" class="tool-filter-chip" data-safety-tier="risk">High risk / Avoid</button>
            </div>
          </div>
        </div>

        <div data-safety-list style="display:grid;gap:24px;width:100%;min-width:0;margin-top:20px">
          ${skeletonRows(4)}
        </div>
      </div>
    </section>
    ${renderRelatedToolsBar('safety')}
  `;
  brandSelect($('[data-safety-region]', main), { short: (text) => dropParens(text).replace('All African regions', 'All regions') });
  const SORT_SHORT = { wps: 'WPS rank', night: 'Night safety', name: 'A–Z' };
  brandSelect($('[data-safety-sort]', main), {
    prefix: 'Sort',
    short: (text) => SORT_SHORT[[...$('[data-safety-sort]', main).options].find((o) => o.textContent.trim() === text)?.value] || text,
  });

  try {
    const [safetyData, adviceData] = await Promise.all([
      fetchToolData('womens_safety.json'),
      fetchToolData('womens_safety_advice.json').catch(() => ({})),
    ]);

    const countries = Array.isArray(safetyData) ? safetyData : safetyData.countries || [];
    const adviceCountries = adviceData.countries || {};
    const listEl = $('[data-safety-list]', main);
    const searchInput = $('[data-safety-search]', main);
    const regionSelect = $('[data-safety-region]', main);
    const sortSelect = $('[data-safety-sort]', main);
    const countEl = $('[data-safety-count]', main);

    let selectedTier = '';
    let selectedRegion = '';

    const renderList = (items) => {
      if (!items.length) {
        listEl.innerHTML = `<div class="uh-empty"><p>No countries match that search.</p></div>`;
        return;
      }

      listEl.innerHTML = items.map((c) => {
        const countryAdviceObj = adviceCountries[c.country] || {};
        const feelSafe = c.womenFeelSafe?.value != null ? c.womenFeelSafe.value : c.nightSafety;
        const wpsRank = c.wps?.rank != null ? c.wps.rank : (c.rank || 'N/A');
        const wpsScore = c.wps?.score != null ? c.wps.score : null;

        const isRisk = c.us?.level === 4 || c.uk?.worst === 'whole';
        const isStrong = c.wps && c.wps.rank <= 109 && (c.us?.level || 1) <= 2;
        const statusClass = isRisk ? 'is-risk' : isStrong ? 'is-safer' : 'is-care';
        const statusLabel = isRisk ? 'High risk / Avoid' : isStrong ? 'Safer choice' : 'Exercise care';

        // Official advisories
        const usLvl = c.us?.level || 1;
        const usLvlLabel = c.us?.label || 'Exercise normal precautions';
        const ukStatus = c.uk?.status || 'No nationwide warnings';

        // Emergency lines
        const emergencyLines = countryAdviceObj.uk?.emergency?.lines || [];

        // Specific tips for women travellers
        const womenTips = countryAdviceObj.uk?.women || [];
        const ukAreas = countryAdviceObj.uk?.areas || [];

        return `
          <details class="ws-card ws-country-drawer" data-country-card="${esc(c.country)}">
            <!-- Collapsible Country Summary Header -->
            <summary class="ws-country-summary">
              <div class="ws-country-sum-left">
                <h3 class="ws-country-title">${esc(c.country)}</h3>
                <span class="ws-country-region">${esc(c.region || '')}</span>
              </div>
              <div class="ws-country-sum-right">
                <span class="ws-status-badge ${statusClass}">
                  <span class="ws-status-dot"></span>
                  ${statusLabel}
                </span>
                <span class="ws-summary-rank" title="Georgetown WPS Global Index Rank">#${wpsRank}</span>
                <span class="ws-drawer-chevron" aria-hidden="true">${icon('chevron-down')}</span>
              </div>
            </summary>

            <div class="ws-drawer-body">
              <!-- 2+1 Spacious Metrics Grid: No cramped columns or clipped text -->
              <div class="ws-metrics-grid">
                <!-- Box 1: WPS Index -->
                <div class="ws-metric-item ws-metric-wps">
                  <span class="ws-metric-label">WPS Global Index</span>
                  <div class="ws-metric-val">#${wpsRank} <small>/ 181</small></div>
                  <span class="ws-metric-sub">${wpsScore != null ? `Georgetown Score ${wpsScore}` : 'Global rank'}</span>
                </div>

                <!-- Box 2: US Travel Advisory -->
                <div class="ws-metric-item ws-metric-adv">
                  <span class="ws-metric-label">US Travel Advisory</span>
                  <div class="ws-metric-val is-lvl${usLvl}">Level ${usLvl}</div>
                  <span class="ws-metric-sub">${esc(usLvlLabel)}</span>
                </div>

                <!-- Box 3: Night Perception Meter (Spans full width below on mobile, sits nicely on desktop) -->
                <div class="ws-metric-item ws-metric-night">
                  <div class="ws-metric-night-head">
                    <span class="ws-metric-label">Night Safety Perception</span>
                    <strong class="ws-metric-val">${feelSafe != null ? `${feelSafe}%` : 'N/A'}</strong>
                  </div>
                  ${feelSafe != null ? `
                    <div class="ws-meter-track" title="${feelSafe}% of women report feeling safe walking alone at night">
                      <div class="ws-meter-fill ${feelSafe >= 60 ? 'is-good' : feelSafe >= 40 ? 'is-mid' : 'is-low'}" style="width:${Math.min(100, Math.max(0, feelSafe))}%;"></div>
                    </div>
                  ` : ''}
                  <span class="ws-metric-sub">Feel safe walking alone at night (Gallup World Poll)</span>
                </div>
              </div>

            <!-- Editor's Context & Verified Notes -->
            ${c.notes && c.notes.length ? `
              <div class="ws-insight-box">
                <div class="ws-insight-header">
                  <span class="ws-insight-icon">✦</span>
                  <span>Context &amp; verified notes</span>
                </div>
                <div class="ws-insight-body">
                  ${c.notes.map((n) => `<p class="ws-insight-item">${esc(n)}</p>`).join('')}
                </div>
              </div>
            ` : ''}

            <!-- Collapsible Travel Advisories, Emergency Services & Tips Drawer -->
            <details class="ws-advice-drawer">
              <summary class="ws-advice-summary">
                <span>Official advisories, emergency numbers &amp; local tips</span>
                <span class="ws-advice-chevron">${icon('chevron-down')}</span>
              </summary>
              <div class="ws-advice-body">
                <div class="ws-advice-section">
                  <div class="ws-advice-section-title">Official Government Advisories</div>
                  <div class="ws-advisory-cards">
                    <div class="ws-advisory-card">
                      <strong>US State Dept</strong>
                      <p>Level ${usLvl}: ${esc(usLvlLabel)}${c.us?.updated ? ` · Updated ${c.us.updated}` : ''}</p>
                      ${c.us?.url ? `<a href="${esc(c.us.url)}" target="_blank" rel="noopener noreferrer" class="ws-link">View official US advisory ↗</a>` : ''}
                    </div>
                    <div class="ws-advisory-card">
                      <strong>UK Foreign Office</strong>
                      <p>${esc(ukStatus)}${c.uk?.updated ? ` · Updated ${c.uk.updated}` : ''}</p>
                      ${c.uk?.url ? `<a href="${esc(c.uk.url)}" target="_blank" rel="noopener noreferrer" class="ws-link">View official UK advisory ↗</a>` : ''}
                    </div>
                  </div>
                </div>

                ${emergencyLines.length ? `
                  <div class="ws-advice-section">
                    <div class="ws-advice-section-title">Local Emergency Services</div>
                    <div class="ws-emergency-chips">
                      ${emergencyLines.map((line) => `<span class="ws-emergency-chip">📞 ${esc(line)}</span>`).join('')}
                    </div>
                  </div>
                ` : ''}

                ${womenTips.length ? `
                  <div class="ws-advice-section">
                    <div class="ws-advice-section-title">Advice for Women Travellers</div>
                    ${womenTips.map((w) => `
                      <div class="ws-tip-block">
                        <strong>${esc(w.heading)}:</strong>
                        ${(w.blocks || []).map((b) => `<p>${esc(b.p || '')}</p>`).join('')}
                      </div>
                    `).join('')}
                  </div>
                ` : (c.advice ? `
                  <div class="ws-advice-section">
                    <div class="ws-advice-section-title">Practical Travel Advice</div>
                    <p>${esc(c.advice)}</p>
                  </div>
                ` : '')}

                ${ukAreas.length ? `
                  <div class="ws-advice-section">
                    <div class="ws-advice-section-title">Monitored Regional Areas (${ukAreas.length})</div>
                    ${ukAreas.map((area) => `
                      <div class="ws-tip-block">
                        <strong>${esc(area.heading || 'Area Notice')}:</strong>
                        ${(area.rules || []).flatMap((r) => r.items || []).map((item) => `
                          <p>• ${esc(item)}</p>
                        `).join('')}
                      </div>
                    `).join('')}
                  </div>
                ` : ''}

                ${countryAdviceObj.uk?.lgbt ? `
                  <div class="ws-advice-section">
                    <div class="ws-advice-section-title">LGBT+ Legal Context</div>
                    <p class="ws-muted-note">${esc(countryAdviceObj.uk.lgbt)}</p>
                  </div>
                ` : ''}
              </div>
            </details>

            <!-- Explainer Details & Footer -->
            <details class="ws-explain-drawer">
              <summary class="ws-explain-summary">
                <span>ℹ️ What does the Georgetown WPS Index measure?</span>
                <span class="ws-explain-chevron">${icon('chevron-down')}</span>
              </summary>
              <div class="ws-explain-content">
                The Georgetown Institute Women, Peace and Security (WPS) Index measures women's wellbeing across 181 countries through 13 indicators covering inclusion (education, employment, mobile phone access), justice (legal equality, maternal health), and security (partner violence, community safety, conflict proximity). Night safety figures come from the Gallup World Poll.
              </div>
            </details>

            <div class="ws-footer-bar">
              <span>Sources: Georgetown WPS Index · Gallup World Poll · UK FCDO · US State Dept</span>
              ${c.us?.url ? `<a href="${esc(c.us.url)}" target="_blank" rel="noopener noreferrer" class="text-link" style="font-size:0.73rem">Official source ↗</a>` : ''}
            </div>
          </div>
        </details>
      `;
    }).join('');
    };

    const update = () => {
      const q = searchInput.value.trim().toLowerCase();
      selectedRegion = regionSelect ? regionSelect.value.trim() : '';
      const sort = sortSelect.value;

      let filtered = countries.filter((c) => {
        const matchesQuery = !q || c.country.toLowerCase().includes(q) || (c.region || '').toLowerCase().includes(q);
        if (!matchesQuery) return false;

        if (selectedRegion && !(c.region || '').toLowerCase().includes(selectedRegion.toLowerCase())) {
          return false;
        }

        if (selectedTier) {
          const isRisk = c.us?.level === 4 || c.uk?.worst === 'whole';
          const isStrong = c.wps && c.wps.rank <= 109 && (c.us?.level || 1) <= 2;
          const tier = isRisk ? 'risk' : isStrong ? 'safer' : 'care';
          if (tier !== selectedTier) return false;
        }

        return true;
      });

      if (sort === 'wps') {
        filtered.sort((a, b) => (a.wps?.rank || 999) - (b.wps?.rank || 999));
      } else if (sort === 'night') {
        filtered.sort((a, b) => (b.womenFeelSafe?.value || b.nightSafety || 0) - (a.womenFeelSafe?.value || a.nightSafety || 0));
      } else if (sort === 'name') {
        filtered.sort((a, b) => a.country.localeCompare(b.country));
      }

      if (countEl) {
        if (!q && !selectedRegion && !selectedTier) {
          countEl.textContent = `${countries.length} African countries`;
        } else {
          const parts = [`${filtered.length} of ${countries.length}`];
          if (selectedRegion) parts.push(selectedRegion);
          if (selectedTier) parts.push(selectedTier === 'safer' ? 'Safer' : selectedTier === 'care' ? 'Caution' : 'High risk');
          countEl.textContent = parts.join(' · ');
        }
      }

      renderList(filtered);
      if (q && filtered.length <= 4) {
        $$('.ws-country-drawer', listEl).forEach((d) => (d.open = true));
      }
    };

    update();
    searchInput.addEventListener('input', update);
    if (regionSelect) regionSelect.addEventListener('change', update);
    sortSelect.addEventListener('change', update);

    $$('[data-safety-tier]', main).forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('[data-safety-tier]', main).forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        selectedTier = btn.dataset.safetyTier;
        update();
      });
    });

    const toggleAllBtn = $('[data-safety-toggle-all]', main);
    if (toggleAllBtn) {
      toggleAllBtn.addEventListener('click', () => {
        const drawers = $$('.ws-country-drawer', listEl);
        const anyClosed = Array.from(drawers).some((d) => !d.open);
        drawers.forEach((d) => (d.open = anyClosed));
        const toggleText = $('[data-safety-toggle-text]', toggleAllBtn);
        if (toggleText) toggleText.textContent = anyClosed ? 'Collapse all' : 'Expand all';
        const chev = toggleAllBtn.querySelector('.icon');
        if (chev) chev.style.transform = anyClosed ? 'rotate(180deg)' : '';
      });
    }
  } catch (err) {
    $('[data-safety-list]', main).innerHTML = errorState(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. TOURISM AT A GLANCE TOOL VIEW (Clean, airy cards and explainers)
// ─────────────────────────────────────────────────────────────────────────────
async function renderTourismTool(main, { setTitle }) {
  setTitle('Tourism at a Glance · Africa');

  main.innerHTML = `
    <header class="tools-header">
      <div class="wrap tools-header-inner">
        <div class="tools-header-copy">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;padding-top:8px">
            <a href="/tools" class="text-link" style="font-size:0.82rem;font-weight:500;color:var(--plum)">← All Travel Tools</a>
          </div>
          <h1>Tourism at a Glance</h1>
          <p class="tools-lede">
            Arrivals, receipts, spend per visitor, and growth for all 54 African countries from official UN Tourism records.
          </p>
        </div>
      </div>
    </header>

    <section class="tools-body">
      <div class="wrap tools-container">
        <!-- Filter and Sort Bar -->
        <div class="tool-toolbar">
          <input type="search" class="input tool-search-input" placeholder="Search country (e.g. Morocco, Egypt, South Africa)…" data-tour-search>
          <div class="tool-sort-group">
            <span class="tool-sort-label">Sort by:</span>
            <select class="select tool-sort-select" data-tour-sort>
              <option value="arrivals">Annual Arrivals (Highest first)</option>
              <option value="receipts">Tourism Receipts ($ USD)</option>
              <option value="spend">Spend per Visitor ($ USD)</option>
              <option value="growth">Arrivals Growth Rate (%)</option>
              <option value="name">Country name</option>
            </select>
          </div>
        </div>

        <div data-tour-list style="display:grid;gap:16px;width:100%;min-width:0">
          ${skeletonRows(4)}
        </div>
      </div>
    </section>
    ${renderRelatedToolsBar('tourism')}
  `;

  try {
    const rawData = await fetchToolData('tourism_stats.json');
    const countries = Array.isArray(rawData) ? rawData : rawData.countries || [];
    const listEl = $('[data-tour-list]', main);
    const searchInput = $('[data-tour-search]', main);
    const sortSelect = $('[data-tour-sort]', main);

    const renderList = (items) => {
      if (!items.length) {
        listEl.innerHTML = `<div class="uh-empty"><p>No countries match that search.</p></div>`;
        return;
      }

      listEl.innerHTML = items.map((c, i) => {
        const arr = c.arrivals?.value != null ? c.arrivals.value : null;
        const arrYear = c.arrivals?.year || '';
        const rec = c.receipts_usd?.value != null ? c.receipts_usd.value : (c.receiptsUsd?.value != null ? c.receiptsUsd.value : null);
        const recYear = c.receipts_usd?.year || '';
        const spend = c.spend_per_arrival_usd != null ? c.spend_per_arrival_usd : (c.spendPerArrivalUsd != null ? c.spendPerArrivalUsd : null);
        const trend = c.arrivals_trend?.pct_change != null ? c.arrivals_trend.pct_change : (c.arrivalsTrend?.pctChange != null ? c.arrivalsTrend.pctChange : null);
        const pctGdp = c.receipts_pct_gdp != null ? c.receipts_pct_gdp : null;

        return `
          <article class="tool-card">
            <div class="tool-card-head">
              <div class="tool-card-country-row">
                <span class="tool-pill is-topic" style="min-width:24px;text-align:center">#${i + 1}</span>
                <span class="tool-card-country-name">${esc(c.country)}</span>
                ${c.region ? `<span class="tool-pill is-live">${esc(c.region)}</span>` : ''}
              </div>
              ${arr ? `<strong style="font-size:0.92rem;color:var(--plum);font-weight:600">${nf(arr)} visitors ${arrYear ? `(${arrYear})` : ''}</strong>` : ''}
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 140px), 1fr));gap:10px;width:100%;margin-top:4px">
              <div style="padding:10px 12px;background:#faf7fb;border:1px solid #efe8f4;border-radius:8px">
                <span style="font-size:0.72rem;color:var(--muted);display:block">Annual arrivals</span>
                <strong style="font-size:0.90rem;color:var(--deep);font-weight:600">${arr ? nf(arr) : 'N/A'}</strong>
              </div>
              <div style="padding:10px 12px;background:#faf7fb;border:1px solid #efe8f4;border-radius:8px">
                <span style="font-size:0.72rem;color:var(--muted);display:block">Receipts (USD)${recYear ? ` · ${recYear}` : ''}</span>
                <strong style="font-size:0.90rem;color:var(--deep);font-weight:600">${rec ? `$${nf(rec)}` : 'N/A'}</strong>
              </div>
              <div style="padding:10px 12px;background:#faf7fb;border:1px solid #efe8f4;border-radius:8px">
                <span style="font-size:0.72rem;color:var(--muted);display:block">Spend per visitor</span>
                <strong style="font-size:0.90rem;color:var(--deep);font-weight:600">${spend ? `$${nf(spend)}` : 'N/A'}</strong>
              </div>
              <div style="padding:10px 12px;background:#faf7fb;border:1px solid #efe8f4;border-radius:8px">
                <span style="font-size:0.72rem;color:var(--muted);display:block">5-year growth trend</span>
                <strong style="font-size:0.90rem;font-weight:600;color:${trend >= 0 ? '#0d7470' : '#b42318'}">${trend != null ? `${trend > 0 ? '+' : ''}${trend}%` : 'N/A'}</strong>
              </div>
            </div>

            ${pctGdp != null ? `
              <div style="display:grid;gap:3px;padding-top:10px;border-top:1px solid var(--line);line-height:1.4">
                <span style="font-size:0.8rem;color:var(--ink-2)">Tourism contributes <strong style="color:var(--deep)">${pctGdp}%</strong> of national GDP</span>
                <span style="font-size:0.7rem;color:var(--muted)">Source: UN Tourism &amp; World Bank</span>
              </div>
            ` : ''}
          </article>
        `;
      }).join('');
    };

    const update = () => {
      const q = searchInput.value.trim().toLowerCase();
      const sort = sortSelect.value;
      let filtered = countries.filter((c) => c.country.toLowerCase().includes(q));

      if (sort === 'arrivals') {
        filtered.sort((a, b) => (b.arrivals?.value || 0) - (a.arrivals?.value || 0));
      } else if (sort === 'receipts') {
        filtered.sort((a, b) => (b.receipts_usd?.value || b.receiptsUsd?.value || 0) - (a.receipts_usd?.value || a.receiptsUsd?.value || 0));
      } else if (sort === 'spend') {
        filtered.sort((a, b) => (b.spend_per_arrival_usd || b.spendPerArrivalUsd || 0) - (a.spend_per_arrival_usd || a.spendPerArrivalUsd || 0));
      } else if (sort === 'growth') {
        filtered.sort((a, b) => (b.arrivals_trend?.pct_change || b.arrivalsTrend?.pctChange || -999) - (a.arrivals_trend?.pct_change || a.arrivalsTrend?.pctChange || -999));
      } else if (sort === 'name') {
        filtered.sort((a, b) => a.country.localeCompare(b.country));
      }

      renderList(filtered);
    };

    update();
    searchInput.addEventListener('input', update);
    sortSelect.addEventListener('change', update);
  } catch (err) {
    $('[data-tour-list]', main).innerHTML = errorState(err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER FOR /tools, /tools/:tool, /eta-tracker, /contraband-guide, etc.
// ─────────────────────────────────────────────────────────────────────────────
export default async function toolsRouter(main, context) {
  const { pathname, params = {} } = context;
  const toolKey = params.tool || pathname.replace(/^\/(?:tools\/)?/, '').replace(/-tracker|-guide|-africa|-at-a-glance/g, '');

  if (toolKey === 'eta') return renderEtaTool(main, context);
  if (toolKey === 'contraband') return renderContrabandTool(main, context);
  if (toolKey === 'safety' || toolKey === 'womens-safety') return renderSafetyTool(main, context);
  if (toolKey === 'tourism') return renderTourismTool(main, context);

  return renderToolsFeed(main, context);
}
