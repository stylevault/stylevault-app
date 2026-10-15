import { emptyState } from '../ui.js';

export default function notFound(main, { setTitle }) {
  setTitle('Page not found');
  main.innerHTML = `<div class="wrap" style="padding-top:56px">${emptyState({
    title: 'This page isn’t in the vault',
    body: 'The link may be old, or the page may have moved.',
    action: '<a class="btn btn-plum" href="/">Back to the home page</a>',
    iconName: 'map',
  })}</div>`;
}
