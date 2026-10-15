/**
 * Refreshes World Bank indicators for all 54 countries: one API call per indicator
 * covers every country. Values change only a few times a year, so each indicator is
 * refreshed weekly, a couple at a time, to stay within the free plan's per-run
 * CPU budget.
 */
import { COUNTRIES } from '../data/countries.js';
import { COUNTRY_FACTS } from '../data/country-facts.js';
import { INDICATORS, INDICATOR_YEARS } from '../data/indicators.js';

const API = 'https://api.worldbank.org/v2/country';
const STALE_AFTER_S = 7 * 86_400;

/** Indicators never fetched or last fetched over a week ago, oldest first. */
export async function staleIndicators(env, limit) {
  const { results } = await env.DB.prepare('SELECT indicator, refreshed_at FROM indicator_refreshes').all();
  const last = new Map(results.map((r) => [r.indicator, r.refreshed_at]));
  const cutoff = Math.floor(Date.now() / 1000) - STALE_AFTER_S;
  return INDICATORS
    .filter((i) => (last.get(i.code) ?? 0) < cutoff)
    .sort((a, b) => (last.get(a.code) ?? 0) - (last.get(b.code) ?? 0))
    .slice(0, limit)
    .map((i) => i.code);
}

export async function refreshIndicators(env, { only = null } = {}) {
  const codes = COUNTRIES.map((c) => c.code);
  const iso3 = codes.map((c) => COUNTRY_FACTS[c].iso3);
  const thisYear = new Date().getUTCFullYear();
  const range = `${thisYear - INDICATOR_YEARS}:${thisYear}`;
  const summary = { indicators: 0, values: 0, errors: [] };

  for (const ind of INDICATORS.filter((i) => !only || only.includes(i.code))) {
    try {
      // ISO3 codes, not ISO2: the API's firewall blocks a list containing ";LS"
      // (Lesotho) as if it were a shell command.
      const url = `${API}/${iso3.join(';')}/indicator/${ind.code}?format=json&date=${range}&per_page=1000`;
      const res = await fetch(url, { headers: { 'User-Agent': 'StyleVaultBot/1.0 (+https://stylevault.app/about)' }, signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const [meta, rows] = await res.json();
      if (!Array.isArray(rows)) throw new Error(meta?.message?.[0]?.value || 'Unexpected response');

      const values = rows.filter((r) => r.value !== null && codes.includes(r.country?.id));
      const statements = values.map((r) =>
        env.DB.prepare('INSERT OR REPLACE INTO indicator_values (country_code, indicator, year, value) VALUES (?, ?, ?, ?)')
          .bind(r.country.id, ind.code, Number(r.date), r.value));
      statements.push(
        env.DB.prepare('INSERT OR REPLACE INTO indicator_refreshes (indicator, refreshed_at, source_updated) VALUES (?, ?, ?)')
          .bind(ind.code, Math.floor(Date.now() / 1000), meta?.lastupdated ?? null),
      );
      for (let i = 0; i < statements.length; i += 500) await env.DB.batch(statements.slice(i, i + 500));
      summary.indicators++;
      summary.values += values.length;
    } catch (err) {
      summary.errors.push(`${ind.code}: ${err.message}`);
    }
  }
  return summary;
}
