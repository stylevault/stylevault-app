import { api } from '../api.js';
import { $, $$, esc, flag, formatIndicator, icon, nf, shortDate } from '../lib.js';
import { store } from '../store.js';
import { REGION_NAMES, emptyState, errorState, indicatorCard, mountFeed, toast } from '../ui.js';

const INDICATORS = [
  { code: 'SP.POP.TOTL', label: 'Population', format: 'people' },
  { code: 'NY.GDP.MKTP.CD', label: 'GDP', unit: 'current US$', format: 'usd-big' },
  { code: 'NY.GDP.PCAP.CD', label: 'GDP per person', unit: 'current US$', format: 'usd' },
  { code: 'NY.GDP.MKTP.KD.ZG', label: 'Economic growth', unit: 'annual GDP growth', format: 'pct' },
  { code: 'FP.CPI.TOTL.ZG', label: 'Inflation', unit: 'consumer prices, annual', format: 'pct' },
  { code: 'SP.DYN.LE00.IN', label: 'Life expectancy', unit: 'years at birth', format: 'years' },
  { code: 'SP.URB.TOTL.IN.ZS', label: 'Urban population', unit: 'share of total', format: 'pct' },
  { code: 'IT.NET.USER.ZS', label: 'Internet use', unit: 'share of population', format: 'pct' },
  { code: 'EG.ELC.ACCS.ZS', label: 'Access to electricity', unit: 'share of population', format: 'pct' },
];
const HEADLINE = ['SP.POP.TOTL', 'NY.GDP.MKTP.CD', 'NY.GDP.PCAP.CD', 'NY.GDP.MKTP.KD.ZG'];

const BLOCS = {
  AMU: 'Arab Maghreb Union', 'CEN-SAD': 'Community of Sahel-Saharan States', COMESA: 'Common Market for Eastern and Southern Africa',
  EAC: 'East African Community', ECCAS: 'Economic Community of Central African States', ECOWAS: 'Economic Community of West African States',
  IGAD: 'Intergovernmental Authority on Development', SADC: 'Southern African Development Community', AES: 'Alliance of Sahel States',
};
const LANG = { en: 'English', fr: 'French', pt: 'Portuguese', es: 'Spanish', ar: 'Arabic' };

export default async function country(main, { params, setTitle }) {
  const base = store.countryBySlug.get(params.slug);
  if (!base) {
    main.innerHTML = `<div class="wrap" style="padding-top:48px">${emptyState({ title: 'Country not found', body: 'We couldn’t find that country.', action: '<a class="btn btn-plum" href="/countries">See all 54 countries</a>', iconName: 'map' })}</div>`;
    return;
  }
  setTitle(`${base.name}: country file`);

  const followBtn = () => {
    const on = !!store.followFor('country', base.code);
    return `<button class="btn ${on ? 'is-on' : 'btn-plum'}" type="button" data-follow-country aria-pressed="${on}">${icon(on ? 'star-fill' : 'star')} ${on ? 'Following' : `Follow ${esc(base.name)}`}</button>`;
  };

  main.innerHTML = `
    <section class="cf-hero"><div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/countries">Countries</a><span>/</span><a href="/countries?region=${base.region}">${REGION_NAMES[base.region]}</a><span>/</span><span aria-current="page">${esc(base.name)}</span></nav>
      <div class="cf-title">${flag(base.code, 'flag-xl', `Flag of ${base.name}`)}
        <div><span class="eyebrow">Country file</span><h1>${esc(base.name)}</h1>
          <div class="cf-line" data-line><span>Capital: ${esc(base.capital || '—')}</span><span>${REGION_NAMES[base.region]}</span></div></div>
      </div>
      <div class="cf-actions"><span data-follow-slot>${followBtn()}</span>
        <button class="btn btn-outline" type="button" data-share-page>${icon('share')} Share</button></div>
    </div></section>

    <nav class="subnav" aria-label="On this page"><div class="wrap">
      <a href="#overview" class="on">Overview</a><a href="#indicators">Indicators</a><a href="#research">Research</a><a href="#news">News</a><a href="#reading">Further reading</a><a href="#sources">Sources</a>
    </div></nav>

    <section class="cf-section" id="overview"><div class="wrap">
      <h2>At a glance</h2>
      <div class="glance" data-glance><div class="skeleton" style="height:300px"></div><div class="skeleton" style="height:300px"></div></div>
    </div></section>

    <section class="cf-section" id="indicators" style="background:var(--warm)"><div class="wrap">
      <h2>Indicators</h2>
      <p class="sec-intro">Long-run figures from the World Bank. Each shows the most recent year available and its trend over up to 15 years.</p>
      <div class="indicator-grid" data-indicators>${'<div class="skeleton" style="height:200px"></div>'.repeat(6)}</div>
      <p class="citation" data-citation></p>
    </div></section>

    <section class="cf-section" id="research"><div class="wrap">
      <div class="sec-head"><div><h2>Research &amp; analysis</h2><p class="sec-intro">From think tanks, universities, survey organisations and public institutions.</p></div>
        <a class="text-link" href="/research?country=${base.code}">All research on ${esc(base.name)} ${icon('arrow-right')}</a></div>
      <div data-research></div>
    </div></section>

    <section class="cf-section" id="news" style="background:var(--warm)"><div class="wrap">
      <div class="sec-head"><div><h2>Reporting</h2><p class="sec-intro">From local and regional newsrooms, newest first.</p></div></div>
      <div class="chips" role="toolbar" aria-label="Filter by topic" data-topic-chips style="margin-bottom:12px">
        <button class="chip" type="button" aria-pressed="true" data-topic="">All topics</button>
        ${store.meta.topics.map((t) => `<button class="chip" type="button" aria-pressed="false" data-topic="${t.slug}">${esc(t.name)}</button>`).join('')}
      </div>
      <div data-news></div>
    </div></section>

    <section class="cf-section" id="reading"><div class="wrap">
      <h2>Further reading</h2>
      <p class="sec-intro">Trusted reference sources for ${esc(base.name)}.</p>
      <div class="further" data-further></div>
    </div></section>

    <section class="cf-section" id="sources" style="background:var(--warm)"><div class="wrap">
      <h2>Newsrooms we read in ${esc(base.name)}</h2>
      <div style="margin-top:20px" data-sources></div>
    </div></section>`;

  // Follow & share
  main.addEventListener('click', async (e) => {
    if (e.target.closest('[data-follow-country]')) {
      try {
        const on = await store.toggleFollow('country', base.code);
        $('[data-follow-slot]', main).innerHTML = followBtn();
        toast(on ? `Following ${base.name}` : `Unfollowed ${base.name}`);
      } catch (err) {
        toast(err.message, 'error');
      }
    }
    if (e.target.closest('[data-share-page]')) {
      const data = { title: `${base.name}: country file · Style Vault`, url: location.href };
      if (navigator.share) navigator.share(data).catch(() => {});
      else navigator.clipboard.writeText(location.href).then(() => toast('Link copied'), () => {});
    }
  });

  // Sub-navigation highlights the section in view.
  const links = $$('.subnav a', main);
  const observer = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (en.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === `#${en.target.id}`));
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('.cf-section', main).forEach((s) => observer.observe(s));

  // Research & news
  const isGuest = !store.user;
  mountFeed($('[data-research]', main), (before) => api.articles({ country: base.code, kind: ['research', 'analysis', 'official'], before, limit: 6 }), {
    layout: 'cards',
    render: (a, idx) => {
      const locked = isGuest && idx >= 2;
      return readCard(a, { locked });
    },
    empty: emptyState({ title: 'No research collected yet', body: `We haven’t yet collected research or analysis about ${esc(base.name)}. The further reading below links to trusted reference sources.` }),
  });
  let topic = '';
  const loadNews = () => mountFeed($('[data-news]', main), (before) => api.articles({ country: base.code, kind: 'news', topic, before, limit: 10 }), {
    empty: emptyState({ title: 'No reporting yet', body: `Nothing ${topic ? 'on this topic ' : ''}from ${esc(base.name)} in our sources yet.`, iconName: 'news' }),
  });
  loadNews();
  $('[data-topic-chips]', main).addEventListener('click', (e) => {
    const chip = e.target.closest('[data-topic]');
    if (!chip) return;
    $$('[data-topic]', main).forEach((x) => x.setAttribute('aria-pressed', x === chip));
    topic = chip.dataset.topic;
    loadNews();
  });

  // Facts, indicators, sources
  let file;
  try {
    file = await api.country(base.code);
  } catch (err) {
    $('[data-glance]', main).innerHTML = errorState(err);
    return () => observer.disconnect();
  }
  const { country: c, indicators, sources } = file;
  const latest = (code) => indicators[code]?.at(-1);

  $('[data-line]', main).innerHTML = `<span>Capital: ${esc(c.capital || '—')}</span><span>${esc(c.languages || '')}</span><span>${esc(c.currency || '')}</span>`;

  const pop = latest('SP.POP.TOTL');
  $('[data-glance]', main).innerHTML = `
    <dl class="facts">
      <div><dt>Capital</dt><dd>${esc(c.capital || '—')}</dd></div>
      <div><dt>Region</dt><dd>${REGION_NAMES[c.region]}</dd></div>
      <div><dt>Population</dt><dd>${pop ? `${formatIndicator(pop[1], 'people')} <span class="muted">(${pop[0]}, World Bank)</span>` : '—'}</dd></div>
      <div><dt>Main languages</dt><dd>${esc(c.languages || '—')}</dd></div>
      <div><dt>Currency</dt><dd>${esc(c.currency || '—')}</dd></div>
      <div><dt>Regional blocs</dt><dd>${c.blocs.length ? c.blocs.map((b) => `<span class="tag bloc" title="${esc(BLOCS[b] || b)}">${esc(b)}</span>`).join('') : '—'}
        ${c.blocs.length ? `<div class="hint" style="margin-top:4px">${c.blocs.map((b) => esc(BLOCS[b] || b)).join(' · ')}</div>` : ''}</dd></div>
      <div><dt>ISO codes</dt><dd>${esc(c.code)} · ${esc(c.iso3 || '')}</dd></div>
    </dl>
    <div class="headline-stats">
      ${HEADLINE.map((code) => {
        const ind = INDICATORS.find((i) => i.code === code);
        const v = latest(code);
        return `<div class="hstat"><strong>${v ? formatIndicator(v[1], ind.format) : '—'}</strong><div class="lbl">${esc(ind.label)}</div><div class="src">${v ? `${v[0]} · World Bank` : 'No recent data'}</div></div>`;
      }).join('')}
    </div>`;

  $('[data-indicators]', main).innerHTML = INDICATORS.map((ind) => indicatorCard(ind, indicators[ind.code], c)).join('');
  $('[data-citation]', main).innerHTML = `${icon('shield')}<span>Source: World Bank, <a href="https://data.worldbank.org/country/${c.code}" target="_blank" rel="noopener">World Development Indicators</a>, licensed CC BY 4.0.
    ${file.indicatorsSourceUpdated ? `Database last updated ${esc(file.indicatorsSourceUpdated)}.` : ''}
    ${file.indicatorsRefreshedAt ? `Checked by Style Vault ${shortDate(file.indicatorsRefreshedAt)}.` : ''}</span>`;

  $('[data-further]', main).innerHTML = [
    ['chart', `World Bank: ${c.name}`, 'Data, projects and reports', `https://data.worldbank.org/country/${c.code}`],
    ['building', `IMF: ${c.name}`, 'Economic reviews and outlooks', `https://www.imf.org/en/Countries/${c.iso3}`],
    ['globe', `UN data: ${c.name}`, 'UN statistics country profile', `https://data.un.org/en/iso/${c.code.toLowerCase()}.html`],
  ].map(([ic, title, sub, url]) => `<a href="${url}" target="_blank" rel="noopener"><span class="ic">${icon(ic)}</span><span><strong>${esc(title)}</strong><span>${esc(sub)}</span></span></a>`).join('')
    + `<a class="rc" href="https://riascolony.org/resources" target="_blank" rel="noopener"><span class="ic">${icon('book')}</span><span><strong>Ria’s Colony guides</strong><span>Travel, culture and business guides</span></span></a>`;

  $('[data-sources]', main).innerHTML = sources.length
    ? `<div class="source-list">${sources.map((s) => `
        <div class="source-row"><span class="health ${s.failures ? (s.failures > 3 ? 'bad' : 'warn') : s.lastSuccessAt ? '' : 'idle'}"></span>
          <div><a class="name" href="${esc(s.homepage)}" target="_blank" rel="noopener">${esc(s.name)}</a>
            <div class="sub">${LANG[s.language] || s.language} · ${nf(s.articles)} stories collected${s.lastSuccessAt ? ` · checked ${shortDate(s.lastSuccessAt)}` : ''}</div></div>
          <a class="act" href="${esc(s.homepage)}" target="_blank" rel="noopener" aria-label="Visit ${esc(s.name)}">${icon('arrow-up-right')}</a></div>`).join('')}</div>`
    : `<div class="note">${icon('news')}<span>We don’t yet collect from a newsroom based in ${esc(c.name)}. Reporting here comes from regional and pan-African publishers, and we’re adding local sources. <a href="/sources">See all sources</a></span></div>`;

  return () => observer.disconnect();
}
