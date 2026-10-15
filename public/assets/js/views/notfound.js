import { emptyState } from '../ui.js';

export default function notFound(main, { setTitle }) {
  setTitle('Page not found');
  main.innerHTML = `<div style="margin-top:24px">${emptyState({
    title: 'This page isn’t in the vault',
    body: 'The link may be old, or the page may have moved.',
    action: '<a class="btn btn-primary" href="/">Back to today’s stories</a>',
  })}</div>`;
}
