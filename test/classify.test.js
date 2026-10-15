import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyCountries, classifyTopics } from '../src/collector/classify.js';

const codes = (r) => r.map((x) => x.code).sort();
const slugs = (r) => r.map((x) => x.slug);

test('a multi-country story reaches every country it is genuinely about', () => {
  const r = classifyCountries({
    title: 'Ghana, Kenya and Rwanda sign AfCFTA trade pact in Accra',
    summary: 'Ministers from the three countries agreed to cut tariffs on manufactured goods.',
    homeCountry: 'GH',
  });
  assert.deepEqual(codes(r), ['GH', 'KE', 'RW']);
  assert.equal(r[0].code, 'GH');
});

test('a passing mention in the teaser does not tag a country', () => {
  const r = classifyCountries({
    title: 'Nairobi Securities Exchange hits record high',
    summary: 'Analysts compared the rally with earlier gains in Nigeria.',
    homeCountry: 'KE',
  });
  assert.deepEqual(codes(r), ['KE']);
});

test('a domestic story without a country name falls back to the publisher home country', () => {
  assert.deepEqual(codes(classifyCountries({ title: 'Matatu operators announce fare hikes', summary: '', homeCountry: 'KE' })), ['KE']);
});

test('world news from a national outlet is not tagged with its home country', () => {
  assert.deepEqual(classifyCountries({ title: 'US considers new sanctions on Iran', summary: '', homeCountry: 'ZA' }), []);
});

test('all-caps headlines are still matched', () => {
  assert.deepEqual(codes(classifyCountries({ title: "DECLARATION DE L'ANCIEN PRESIDENT CONGOLAIS : QUE PREPARE KABILA ?", summary: '' })), ['CD']);
});

test('global sport from a national outlet is not tagged with its home country', () => {
  assert.deepEqual(classifyCountries({ title: 'Referees must protect players like me, Yamal, Álvarez – Vini Jr', summary: '', homeCountry: 'NG' }), []);
  assert.deepEqual(codes(classifyCountries({ title: 'Arsenal confirm Nigerian striker signing', summary: '', homeCountry: 'NG' })), ['NG']);
});

test('ambiguous names are disambiguated', () => {
  assert.deepEqual(codes(classifyCountries({ title: 'Oil spill hits communities in the Niger Delta', summary: '' })), ['NG']);
  assert.deepEqual(codes(classifyCountries({ title: 'Piracy rises in the Gulf of Guinea', summary: '' })), []);
  assert.deepEqual(codes(classifyCountries({ title: 'South Sudan opens new oil pipeline talks', summary: '' })), ['SS']);
  assert.deepEqual(codes(classifyCountries({ title: 'Kinshasa and Kigali resume peace talks', summary: '' })), ['CD', 'RW']);
});

test('French and accented names match', () => {
  assert.deepEqual(codes(classifyCountries({ title: 'Sénégal : le gouvernement lance un plan pour Thiès', summary: '' })), ['SN']);
  assert.deepEqual(codes(classifyCountries({ title: "Côte d’Ivoire : Abidjan accueille le sommet", summary: '' })), ['CI']);
});

test('topics are tagged from keywords, acronyms are case-sensitive', () => {
  assert.ok(slugs(classifyTopics({ title: 'Nigerian fintech startup raises $20m to expand mobile money', summary: '' })).includes('technology'));
  assert.ok(slugs(classifyTopics({ title: 'Lagos Fashion Week celebrates Ankara designers', summary: '' })).includes('style'));
  assert.ok(!slugs(classifyTopics({ title: 'Residents who said they were ignored', summary: '' })).includes('health'));
  assert.ok(slugs(classifyTopics({ title: 'WHO declares end of mpox outbreak', summary: '' })).includes('health'));
});
