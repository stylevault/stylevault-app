import { $, icon } from '../lib.js';
import { store } from '../store.js';
import { emptyState, errorState, skeletonFeed, storyCard } from '../ui.js';

export default async function saved(main, { setTitle }) {
  setTitle('Saved stories');
  main.innerHTML = `
    <header class="page-head"><span class="eyebrow">Your vault</span><h1>Saved stories</h1>
      <p>${store.user ? 'Kept in your account, on every device you sign in to.' : 'Kept in this browser. Sign in to keep them on every device.'}</p></header>
    ${store.user ? '' : `<div class="sync-note">${icon('lock')}<span>Saved on this device only. <a href="/signup">Create a free account</a> and they’ll follow you everywhere.</span></div>`}
    <div data-list>${skeletonFeed(3)}</div>`;

  const list = $('[data-list]', main);
  try {
    const items = await store.savedArticles();
    list.innerHTML = items.length
      ? `<div class="feed">${items.map(storyCard).join('')}</div>`
      : emptyState({
        title: 'Nothing saved yet',
        body: `Tap the bookmark ${icon('bookmark', 'icon')} on any story to keep it here for later.`.replace('class="icon"', 'class="icon" style="display:inline;width:16px;height:16px;vertical-align:-3px"'),
        action: '<a class="btn btn-primary" href="/">Browse today’s stories</a>',
      });
  } catch (err) {
    list.innerHTML = errorState(err);
  }
}
