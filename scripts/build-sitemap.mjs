import fs from 'fs';
import { COUNTRIES } from '../src/data/countries.js';
import { TOPICS } from '../src/data/topics.js';

const tools = [
  'womens-safety-africa',
  'travel-checklist',
  'currency-converter',
  'time-zones',
  'contraband-guide',
  'tourism-at-a-glance'
];

const staticPages = [
  { url: '', prio: '1.0', change: 'daily' },
  { url: '/countries', prio: '0.9', change: 'weekly' },
  { url: '/research', prio: '0.9', change: 'daily' },
  { url: '/news', prio: '0.9', change: 'hourly' },
  { url: '/topics', prio: '0.8', change: 'weekly' },
  { url: '/tools', prio: '0.8', change: 'weekly' },
  { url: '/about', prio: '0.6', change: 'monthly' },
  { url: '/sources', prio: '0.6', change: 'monthly' },
  { url: '/privacy', prio: '0.4', change: 'yearly' },
];

const today = new Date().toISOString().split('T')[0];
let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

for (const p of staticPages) {
  xml += `  <url>\n    <loc>https://stylevault.app${p.url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.change}</changefreq>\n    <priority>${p.prio}</priority>\n  </url>\n`;
}

for (const c of COUNTRIES) {
  const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  xml += `  <url>\n    <loc>https://stylevault.app/country/${slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.85</priority>\n  </url>\n`;
}

for (const t of TOPICS) {
  xml += `  <url>\n    <loc>https://stylevault.app/topic/${t.slug}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.75</priority>\n  </url>\n`;
}

for (const tool of tools) {
  xml += `  <url>\n    <loc>https://stylevault.app/tools/${tool}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.75</priority>\n  </url>\n`;
}

xml += '</urlset>\n';

fs.writeFileSync('public/sitemap.xml', xml, 'utf8');
console.log(`Generated public/sitemap.xml with ${staticPages.length + COUNTRIES.length + TOPICS.length + tools.length} URLs`);

