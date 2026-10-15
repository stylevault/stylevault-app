const TRACKING_PARAMS = /^(utm_[a-z]+|fbclid|gclid|mc_cid|mc_eid|ref|ref_src|cmpid|ocid|amp|output|rss|from)$/i;

/** Canonical form used for de-duplication: https, lowercase host, no tracking params, hash or trailing slash. */
export function normalizeUrl(raw) {
  try {
    const u = new URL(raw.trim());
    u.protocol = 'https:';
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    u.hash = '';
    for (const key of [...u.searchParams.keys()]) if (TRACKING_PARAMS.test(key)) u.searchParams.delete(key);
    u.searchParams.sort();
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) u.pathname = u.pathname.slice(0, -1);
    return u.toString();
  } catch {
    return null;
  }
}

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const STOPWORDS = new Set((
  'the a an and or of to in on for at by with from as is are was were be been has have had it its this that these those ' +
  'after over into about amid says said new will not but than more could would can may how why what who when where ' +
  'le la les un une des de du et en au aux pour par sur dans avec est sont qui que ce cette ses son sa plus ' +
  // Dates make recurring columns ("Weather for Wednesday 14 October") look like one story.
  'monday tuesday wednesday thursday friday saturday sunday today yesterday tomorrow ' +
  'lundi mardi mercredi jeudi vendredi samedi dimanche aujourd hui ' +
  'january february march april june july august september october november december ' +
  'janvier fevrier mars avril mai juin juillet aout septembre octobre novembre decembre'
).split(' '));
const YEAR = /^(19|20)\d\d$/;

/** Significant, accent-folded words of a headline, used to spot the same story across publishers. */
export function titleTokens(title) {
  return new Set(
    title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !YEAR.test(w)),
  );
}

export function similarity(a, b) {
  if (!a.size || !b.size) return { shared: 0, jaccard: 0 };
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return { shared, jaccard: shared / (a.size + b.size - shared) };
}

export function clampSummary(text, max = 300) {
  if (!text) return null;
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 40)).replace(/[\s,;:.–—-]+$/, '') + '…';
}
