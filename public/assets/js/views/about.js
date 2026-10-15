import { nf } from '../lib.js';
import { store } from '../store.js';

export default function about(main, { setTitle }) {
  setTitle('About');
  const { stats } = store.meta;
  main.innerHTML = `
    <header class="page-head"><span class="eyebrow">About</span><h1>Why “StyleVault”?</h1></header>
    <div class="prose" style="margin-top:12px">
      <p><strong>Style</strong> is the distinctive way something is done: a manner, a technique, a way of expressing or presenting. Africa has its own: in how it trades and governs, builds and invents, dresses, sings, travels and argues. StyleVault is where all of it is gathered, from every one of the continent’s 54 countries.</p>
      <p>Instead of checking dozens of websites, open one place. Browse everything, or set up a <a href="/monitor">monitor</a> that quietly collects the countries, industries and keywords you follow.</p>

      <h2>How it works</h2>
      <div class="pillars">
        <div class="pillar"><strong>Collected hourly</strong><p>We read the public news feeds of ${nf(stats.sources)} African and Africa-focused newsrooms. Busy sources are checked every hour; quieter ones a little less often.</p></div>
        <div class="pillar"><strong>Sorted by rules</strong><p>Each story is tagged by country and topic using transparent, editable rules (names, cities, institutions and keywords), not a black-box AI.</p></div>
        <div class="pillar"><strong>Grouped by story</strong><p>When several newsrooms report the same development, we group them. That’s how <em>Top stories</em> are chosen.</p></div>
        <div class="pillar"><strong>Always linked</strong><p>We keep the headline, publisher, date and a short teaser, then send you to the original article. Journalism deserves the click.</p></div>
      </div>

      <h2>Coverage</h2>
      <p>Every African country has a page from day one. Some countries have more accessible newsrooms than others, so coverage is deeper in some places for now. We add sources continuously, and the <a href="/sources">sources page</a> shows exactly who we read and how each feed is doing.</p>

      <h2>Your data</h2>
      <p>You can read everything without an account. If you create one, we store your name, email, a securely hashed password, your monitors and your saved stories, and nothing else. You can delete your account at any time from your account settings.</p>
    </div>`;
}
