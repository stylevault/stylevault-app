/**
 * Rule-based classification (no AI APIs).
 *
 * Countries: "Option B — countries the story is genuinely about". Each country gets a
 * relevance score from where it is mentioned, and only countries that clear the bar
 * are tagged, so a passing mention in a teaser does not push a story into that
 * country's feed, while a story that is genuinely about several countries still
 * reaches all of them.
 *
 *   headline mention         +3 each (max 2 counted)
 *   teaser mention           +1 each (max 3 counted)
 *   publisher category tag   +2
 *   publisher's home country +2 (tie-breaker for domestic stories; skipped when the
 *                               headline is about a place outside Africa)
 *
 *   tagged if score ≥ 3, or if it is the single best-scoring country with score ≥ 2
 *   at most MAX_COUNTRIES per article, highest score first
 *
 * Topics work the same way with keyword lists (headline +2, teaser +1, category +2),
 * tagged at score ≥ 2, at most MAX_TOPICS per article.
 */
import { COUNTRIES } from '../data/countries.js';
import { TOPICS } from '../data/topics.js';

const MAX_COUNTRIES = 4;
const MAX_TOPICS = 3;

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const L = '[\\p{L}\\p{N}]';
// Whole-word match that works for accented words (\b is ASCII-only in JS).
const wordRe = (alts, flags) => new RegExp(`(?<!${L})(?:${alts.join('|')})(?!${L})`, `gu${flags}`);
// Apostrophes vary between ' and ’ across publishers; match either.
const termPattern = (t) => escape(t).replace(/['’]/g, "['’]");

const COUNTRY_RULES = COUNTRIES.map((c) => {
  const terms = [...c.terms].sort((a, b) => b.length - a.length).map(termPattern);
  const exclude = c.exclude?.map(termPattern).join('|');
  return {
    code: c.code,
    match: wordRe(terms, ''),
    exclude: exclude ? new RegExp(exclude, 'gu') : null,
    // ALL-CAPS headlines ("PRESIDENT CONGOLAIS : …") can't be matched case-sensitively.
    matchCaps: wordRe(terms, 'i'),
    excludeCaps: exclude ? new RegExp(exclude, 'giu') : null,
  };
});

const isShouting = (s) => {
  const letters = (s || '').replace(/[^\p{L}]/gu, '');
  return letters.length > 12 && (letters.match(/\p{Lu}/gu) || []).length / letters.length > 0.7;
};

const keywordPattern = (k) => (k.endsWith('*') ? `${termPattern(k.slice(0, -1))}[\\p{L}\\p{N}-]*` : termPattern(k));

const TOPIC_RULES = TOPICS.map((t) => {
  const sensitive = t.keywords.filter((k) => /[A-Z]/.test(k));
  const insensitive = t.keywords.filter((k) => !/[A-Z]/.test(k));
  return {
    slug: t.slug,
    matchers: [
      insensitive.length ? wordRe(insensitive.map(keywordPattern), 'i') : null,
      sensitive.length ? wordRe(sensitive.map(keywordPattern), '') : null,
    ].filter(Boolean),
  };
});

const countMatches = (re, text) => (text ? (text.match(re) || []).length : 0);

// National outlets also run world news. When a headline is about somewhere outside
// Africa and names no African country, the publisher's home country is not assumed.
const INTERNATIONAL = wordRe([
  'US', 'U\\.S\\.', 'USA', 'United States', 'America', 'American', 'Americans', 'Washington', 'Trump', 'Biden', 'Pentagon',
  'UK', 'Britain', 'British', 'London', 'France', 'French', 'Paris', 'Macron', 'Europe', 'European', 'EU', 'Germany', 'German',
  'Spain', 'Italy', 'Portugal', 'Russia', 'Russian', 'Moscow', 'Putin', 'Ukraine', 'Ukrainian', 'Kyiv', 'China', 'Chinese',
  'Beijing', 'India', 'Indian', 'Japan', 'Iran', 'Iranian', 'Israel', 'Israeli', 'Gaza', 'Palestinian', 'Lebanon', 'Syria',
  'Saudi', 'Qatar', 'UAE', 'Dubai', 'Turkey', 'Pakistan', 'Brazil', 'Mexico', 'Canada', 'Australia', 'Venezuela', 'Musk', 'Pope',
  'États-Unis', 'Etats-Unis', 'Américain', 'Royaume-Uni', 'Russie', 'Chine', 'Allemagne', 'Espagne', 'Italie', 'Israël', 'Liban', 'Syrie',
  'Zelensky', 'Netanyahu', 'NATO', 'OTAN', 'Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Champions League', 'Real Madrid',
  'Barcelona', 'Arsenal', 'Chelsea', 'Liverpool', 'Manchester United', 'Man United', 'Man City', 'PSG', 'Vini Jr', 'Vinicius', 'Mbappé', 'Messi', 'Ronaldo',
], '');

export function classifyCountries({ title, summary, categories = [], homeCountry = null }) {
  const cats = categories.join(' | ');
  const scored = [];
  if (homeCountry && countMatches(INTERNATIONAL, title)) homeCountry = null;
  const shouting = isShouting(title);

  for (const rule of COUNTRY_RULES) {
    const clean = (s) => (rule.exclude && s ? s.replace(rule.exclude, ' ') : s);
    const t = shouting
      ? Math.min(countMatches(rule.matchCaps, rule.excludeCaps ? title.replace(rule.excludeCaps, ' ') : title), 2)
      : Math.min(countMatches(rule.match, clean(title)), 2);
    const s = Math.min(countMatches(rule.match, clean(summary)), 3);
    const c = countMatches(rule.match, clean(cats)) > 0 ? 2 : 0;
    let score = t * 3 + s + c;
    if (rule.code === homeCountry) score += 2;
    if (score > 0) scored.push({ code: rule.code, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  const chosen = scored.filter((x) => x.score >= 3);
  if (!chosen.length && top && top.score >= 2 && (scored.length === 1 || scored[1].score < top.score)) {
    chosen.push(top);
  }
  return chosen.slice(0, MAX_COUNTRIES);
}

export function classifyTopics({ title, summary, categories = [] }) {
  const cats = categories.join(' | ');
  const scored = [];
  for (const rule of TOPIC_RULES) {
    let score = 0;
    for (const re of rule.matchers) {
      score += Math.min(countMatches(re, title), 2) * 2 + Math.min(countMatches(re, summary), 3);
      if (countMatches(re, cats)) score += 2;
    }
    if (score >= 2) scored.push({ slug: rule.slug, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, MAX_TOPICS);
}
