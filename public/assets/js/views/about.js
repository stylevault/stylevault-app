import { icon, nf } from '../lib.js';
import { store } from '../store.js';

export default function about(main, { setTitle }) {
  setTitle('About');
  const { stats } = store.meta;
  main.innerHTML = `
    <section class="page-hero"><div class="wrap">
      <span class="eyebrow">About Style Vault</span>
      <h1>Understand Africa, one country at a time</h1>
      <p class="lede">Style Vault is the learning product of Ria’s Colony, which exists to make Africa easier to understand, explore and do business across.</p>
    </div></section>
    <div class="wrap" style="padding-top:44px">
      <div class="prose">
        <p><strong>Style</strong> is the distinctive way something is done: a manner, a technique, a way of expressing or presenting. Every African country has its own way of trading and governing, building and creating, travelling and living. Style Vault is where all of it is kept, for each of the continent’s 54 countries.</p>
        <p>People across Africa often know surprisingly little about other parts of the continent. Investors, researchers, students, travellers and the diaspora piece it together from dozens of websites. Style Vault brings the dependable parts together: <strong>reference facts</strong>, <strong>cited indicators</strong>, <strong>research and analysis</strong>, and <strong>reporting from local newsrooms</strong>, organised country by country.</p>

        <h2>What’s in a country file</h2>
        <ul>
          <li>Capital, main languages, currency and the regional blocs a country belongs to.</li>
          <li>Nine World Bank indicators, from population and GDP to electricity access, each with its year and up to 15 years of history.</li>
          <li>Research and analysis from ${nf(stats.sources)} sources, including think tanks, survey organisations and UN bodies.</li>
          <li>Reporting from newsrooms based in that country and across the region.</li>
        </ul>

        <h2>Our standards</h2>
        <ul>
          <li>Every figure shows its source and year. If data is old, we say so.</li>
          <li>Every story links to the publisher that wrote it. We don’t rewrite, summarise with AI, or republish full articles.</li>
          <li>Our sources and sorting rules are public: see <a href="/sources">Sources &amp; methods</a>.</li>
        </ul>

        <h2>Your data</h2>
        <p>You can read everything without an account. If you create one, we store your name, email, a securely hashed password, and what you follow and save, nothing more. You can delete your account at any time from your account settings.</p>

        <div class="note plum" style="margin-top:12px">${icon('globe')}<span>Style Vault is part of <a href="https://riascolony.org" target="_blank" rel="noopener">Ria’s Colony</a>: for the life you are becoming.</span></div>
      </div>
    </div>`;
}
