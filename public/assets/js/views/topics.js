import { esc, nf } from '../lib.js';
import { store } from '../store.js';

export const TOPIC_BLURBS = {
  business: 'Markets, banks, enterprise and the money moving the continent.',
  politics: 'Elections, governments, parliaments and the institutions that run countries.',
  trade: 'AfCFTA, ports, corridors and the goods crossing borders.',
  technology: 'Fintech, telecoms, start-ups and Africa’s digital build-out.',
  agriculture: 'Farming, food prices, cocoa, coffee and food security.',
  education: 'Schools, universities, exams and the next generation.',
  tourism: 'Travel, visas, airlines, hotels and heritage.',
  style: 'Fashion, music, film, art and design: Africa’s creative signature.',
  energy: 'Power, oil and gas, renewables, mining and infrastructure.',
  health: 'Hospitals, outbreaks, medicines and public health.',
  climate: 'Weather, conservation, drought, floods and the green transition.',
  security: 'Conflict, peace efforts, policing and the courts.',
  sport: 'Football, athletics and the stars of African sport.',
};

export default function topics(main, { setTitle }) {
  setTitle('Topics');
  main.innerHTML = `
    <section class="page-hero"><div class="wrap">
      <span class="eyebrow">Subjects</span>
      <h1>Explore by topic</h1>
      <p class="lede">Follow a subject across all 54 countries at once: research, analysis and reporting, sorted the moment it arrives.</p>
    </div></section>
    <div class="wrap" style="padding-top:40px">
      <div class="topic-grid">
        ${store.meta.topics.map((t) => `
          <article class="topic-card">
            <h3><a href="/topic/${t.slug}">${esc(t.name)}</a></h3>
            <p>${esc(TOPIC_BLURBS[t.slug] || '')}</p>
            <span>${nf(t.recent)} pieces this week</span>
          </article>`).join('')}
      </div>
    </div>`;
}
