/**
 * Minimal RSS 2.0 / RSS 1.0 (RDF) / Atom parser.
 *
 * Workers has no DOMParser and the free plan allows ~10ms CPU per invocation, so
 * this deliberately extracts only the handful of fields we store, using bounded
 * regular expressions rather than building a full XML tree.
 */

const MAX_ITEMS = 40;

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', eacute: 'é', egrave: 'è',
  ecirc: 'ê', agrave: 'à', acirc: 'â', ccedil: 'ç', ocirc: 'ô', icirc: 'î', ucirc: 'û', ugrave: 'ù',
  euml: 'ë', iuml: 'ï', Eacute: 'É', copy: '©', reg: '®', trade: '™', middot: '·', bull: '•',
};

export function decodeEntities(str) {
  return str.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : '';
    }
    return NAMED_ENTITIES[e] ?? m;
  });
}

const unwrapCdata = (s) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

/** Turns an XML text node (possibly CDATA-wrapped HTML) into clean plain text. */
export function toPlainText(raw) {
  if (!raw) return '';
  let s = unwrapCdata(raw);
  // Text inside non-CDATA elements is entity-escaped HTML; decode once to expose tags.
  if (/&lt;/.test(s)) s = decodeEntities(s);
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
  // NFKC folds stylised Unicode (e.g. mathematical bold letters some outlets put in headlines);
  // invisible direction/zero-width marks are dropped.
  return decodeEntities(s).normalize('NFKC').replace(/[​-‏‪-‮⁠﻿]/g, '').replace(/\s+/g, ' ').trim();
}

function tag(block, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i');
  const m = block.match(re);
  return m ? m[1] : null;
}

function allTags(block, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'gi');
  return [...block.matchAll(re)].map((m) => m[1]);
}

function attr(block, tagName, attrName, filter) {
  const re = new RegExp(`<${tagName}\\b([^>]*)/?>`, 'gi');
  for (const m of block.matchAll(re)) {
    if (filter && !filter(m[1])) continue;
    const a = m[1].match(new RegExp(`\\b${attrName}\\s*=\\s*["']([^"']+)["']`, 'i'));
    if (a) return decodeEntities(a[1]);
  }
  return null;
}

function parseDate(raw) {
  if (!raw) return null;
  const s = toPlainText(raw);
  let t = Date.parse(s);
  // Some feeds use non-English day/month names or odd zones; retry without the weekday.
  if (Number.isNaN(t)) t = Date.parse(s.replace(/^[^,]+,\s*/, ''));
  return Number.isNaN(t) ? null : Math.floor(t / 1000);
}

function findImage(block, rawDescription) {
  const isImage = (attrs) => !/\btype\s*=/.test(attrs) || /type\s*=\s*["']image\//i.test(attrs);
  const url =
    attr(block, 'media:content', 'url', isImage) ||
    attr(block, 'media:thumbnail', 'url') ||
    attr(block, 'enclosure', 'url', isImage) ||
    (() => {
      if (!rawDescription) return null;
      const html = decodeEntities(unwrapCdata(rawDescription));
      const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      return m ? m[1] : null;
    })();
  return url && /^https?:\/\//i.test(url) ? url.replace(/^http:\/\//i, 'https://') : null;
}

/**
 * @returns {{ title: string, link: string, summary: string, publishedAt: number|null, image: string|null, categories: string[] }[]}
 */
export function parseFeed(xml) {
  const isAtom = /<feed[\s>]/i.test(xml.slice(0, 2000)) && !/<rss[\s>]/i.test(xml.slice(0, 2000));
  const blockRe = isAtom ? /<entry[\s>][\s\S]*?<\/entry>/gi : /<item[\s>][\s\S]*?<\/item>/gi;
  const items = [];

  for (const match of xml.matchAll(blockRe)) {
    if (items.length >= MAX_ITEMS) break;
    const block = match[0];

    const title = toPlainText(tag(block, 'title'));
    let link;
    if (isAtom) {
      link = attr(block, 'link', 'href', (a) => !/rel\s*=/.test(a) || /rel\s*=\s*["']alternate["']/i.test(a));
    } else {
      link = toPlainText(tag(block, 'link'));
      if (!link) {
        const guid = toPlainText(tag(block, 'guid'));
        if (/^https?:\/\//i.test(guid)) link = guid;
      }
      if (!link) link = attr(block, 'item', 'rdf:about');
    }
    if (!title || !link || !/^https?:\/\//i.test(link)) continue;

    const rawDescription = tag(block, isAtom ? 'summary' : 'description') || tag(block, 'content');
    const summary = toPlainText(rawDescription);

    items.push({
      title,
      link: link.trim(),
      summary,
      publishedAt: parseDate(
        tag(block, 'pubDate') || tag(block, 'dc:date') || tag(block, 'published') || tag(block, 'updated'),
      ),
      image: findImage(block, rawDescription),
      categories: [
        ...allTags(block, 'category').map(toPlainText),
        ...(isAtom ? [...block.matchAll(/<category[^>]*term=["']([^"']+)["']/gi)].map((m) => decodeEntities(m[1])) : []),
      ].filter(Boolean).slice(0, 10),
    });
  }
  return items;
}
