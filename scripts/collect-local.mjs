// Triggers a collection run against the local dev server (`npm run dev` must be running).
// Usage: npm run collect            → every active source, ignoring schedules
//        npm run collect -- --due   → only sources that are due, like the cron does
//        npm run collect -- --indicators → refresh World Bank indicators instead
import { readFileSync } from 'node:fs';

const vars = Object.fromEntries(
  readFileSync(new URL('../.dev.vars', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const base = process.env.STYLEVAULT_URL || 'http://localhost:8787';
const all = !process.argv.includes('--due');

const path = process.argv.includes('--indicators') ? '/api/admin/indicators' : `/api/admin/collect${all ? '?all=1' : ''}`;
const res = await fetch(`${base}${path}`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${vars.ADMIN_TOKEN}` },
});
console.log(res.status, await res.text());
