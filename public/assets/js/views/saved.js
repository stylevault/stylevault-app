import { $, icon } from '../lib.js';
import { store } from '../store.js';
import { anyCard, emptyState, errorState, skeletonRows } from '../ui.js';

export default async function saved(main, { setTitle }) {
  setTitle('Saved');
  main.innerHTML = `
    <section class="page-hero"><div class="wrap">
      <span class="eyebrow">Your vault</span><h1>Saved</h1>
      <p class="lede">${store.user ? 'Kept in your account, on every device you sign in to.' : 'Kept in this browser.'}</p>
    </div></section>
    <div class="wrap" style="padding-top:32px;max-width:920px">
      ${store.user ? '' : `<div class="note" style="margin-bottom:24px">${icon('lock')}<span>Saved on this device only. <a href="/signup">Create a free account</a> and they’ll follow you everywhere.</span></div>`}
      <div data-list>${skeletonRows(3)}</div>
    </div>`;

  const list = $('[data-list]', main);
  try {
    const items = await store.savedArticles();
    list.innerHTML = items.length
      ? `<div class="news-list">${items.map(anyCard).join('')}</div>`
      : emptyState({
        title: 'Nothing saved yet',
        body: 'Use the bookmark on any research paper or story to keep it here for later.',
        action: '<a class="btn btn-plum" href="/research">Browse research</a>',
        iconName: 'bookmark',
      });
  } catch (err) {
    list.innerHTML = errorState(err);
  }
}
