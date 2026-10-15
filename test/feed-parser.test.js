import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFeed } from '../src/collector/feed-parser.js';
import { normalizeUrl, titleTokens, similarity } from '../src/collector/normalize.js';

test('parses RSS 2.0 with CDATA, entities and media images', () => {
  const xml = `<?xml version="1.0"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel>
    <item>
      <title><![CDATA[Kenya &amp; Uganda <b>agree</b> rail deal]]></title>
      <link>https://example.co.ke/rail-deal?utm_source=rss</link>
      <pubDate>Wed, 14 Oct 2026 08:30:00 +0300</pubDate>
      <description>&lt;p&gt;The standard gauge railway will reach Kampala.&lt;/p&gt;</description>
      <media:content url="http://example.co.ke/img.jpg" medium="image" />
      <category>Business</category>
    </item></channel></rss>`;
  const [item] = parseFeed(xml);
  assert.equal(item.title, 'Kenya & Uganda agree rail deal');
  assert.equal(item.summary, 'The standard gauge railway will reach Kampala.');
  assert.equal(item.image, 'https://example.co.ke/img.jpg');
  assert.equal(item.publishedAt, Date.parse('2026-10-14T05:30:00Z') / 1000);
  assert.deepEqual(item.categories, ['Business']);
});

test('parses Atom entries', () => {
  const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><entry>
    <title type="html">Rwanda&#8217;s tourism grows</title>
    <link rel="alternate" href="https://example.rw/tourism"/>
    <published>2026-10-14T10:00:00Z</published>
    <summary>Visitor numbers rose.</summary></entry></feed>`;
  const [item] = parseFeed(xml);
  assert.equal(item.title, 'Rwanda’s tourism grows');
  assert.equal(item.link, 'https://example.rw/tourism');
});

test('folds stylised unicode headlines', () => {
  const [item] = parseFeed('<rss><channel><item><title>𝐆ID 𝐑𝐞𝐬𝐩𝐨𝐧𝐝𝐬</title><link>https://x.gm/a</link></item></channel></rss>');
  assert.equal(item.title, 'GID Responds');
});

test('URL normalisation strips tracking and trailing slashes', () => {
  assert.equal(normalizeUrl('http://www.Example.com/story/?utm_source=x&id=2#top'), 'https://example.com/story?id=2');
});

test('headline similarity spots the same story across publishers', () => {
  const a = titleTokens('Ghana central bank holds policy rate at 21.5% amid easing inflation');
  const b = titleTokens('Bank of Ghana holds policy rate at 21.5% as inflation eases');
  assert.ok(similarity(a, b).jaccard >= 0.45);
});
