import { esc, nf } from '../lib.js';
import { store } from '../store.js';

export const TOPIC_BLURBS = {
  business: 'Markets, banks, start-ups and the money moving the continent.',
  politics: 'Elections, governments, parliaments and the people who run them.',
  trade: 'AfCFTA, ports, corridors and the goods crossing borders.',
  technology: 'Fintech, telecoms, start-ups and Africa’s digital build-out.',
  agriculture: 'Farms, food prices, cocoa, coffee and food security.',
  education: 'Schools, universities, exams and the next generation.',
  tourism: 'Travel, visas, airlines, hotels and the places worth seeing.',
  style: 'Fashion, music, film, art and design: Africa’s creative signature.',
  energy: 'Power, oil and gas, renewables, mining and infrastructure.',
  health: 'Hospitals, outbreaks, medicines and public health.',
  climate: 'Weather, conservation, droughts, floods and the green transition.',
  security: 'Conflict, peace efforts, policing and the courts.',
  sport: 'Football, athletics and the stars of African sport.',
};

export default function topics(main, { setTitle }) {
  setTitle('Topics');
  main.innerHTML = `
    <header class="page-head">
      <span class="eyebrow">Subjects</span>
      <h1>Explore by topic</h1>
      <p>Every story is sorted by subject the moment it arrives, so you can follow an industry across all 54 countries at once.</p>
    </header>
    <div class="topic-grid" style="margin-top:20px">
      ${store.meta.topics.map((t) => `
        <article class="topic-tile" style="--c:${t.color}">
          <h3><a href="/topic/${t.slug}">${esc(t.name)}</a></h3>
          <div><p style="font-size:0.9rem;opacity:.92">${esc(TOPIC_BLURBS[t.slug] || '')}</p>
          <span>${nf(t.recent)} stories this week</span></div>
        </article>`).join('')}
    </div>`;
}
