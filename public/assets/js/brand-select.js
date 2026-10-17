import { esc, icon } from './lib.js';

/**
 * Swaps a native <select> for a compact, on-brand dropdown. The select stays in the DOM (hidden)
 * as the source of truth: picking an option sets its value and fires 'change', so existing
 * listeners keep working untouched. Long lists (more than 12 options) get a filter box.
 *
 *   prefix  – small label shown before the value on the button ("Sort")
 *   short   – maps an option's text to the shorter form shown on the button
 */
export const dropParens = (text) => text.replace(/\s*\([^)]*\)/g, '').trim();

export function brandSelect(select, { prefix = '', short = dropParens, searchable = select.options.length > 12 } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'bsel';
  const label = (opt) => `${prefix ? `<span class="bsel-prefix">${esc(prefix)}</span>` : ''}<span class="bsel-value">${esc(short(opt?.textContent.trim() || ''))}</span>`;
  wrap.innerHTML = `
    <button type="button" class="bsel-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="${esc(select.getAttribute('aria-label') || select.labels?.[0]?.textContent.trim() || prefix)}">
      <span class="bsel-label">${label(select.selectedOptions[0])}</span>${icon('chevron-down')}
    </button>
    <div class="bsel-menu${searchable ? ' is-long' : ''}" hidden>
      ${searchable ? `<label class="bsel-search">${icon('search')}<input type="search" placeholder="Type to filter" aria-label="Filter options" autocomplete="off"></label>` : ''}
      <div class="bsel-list" role="listbox">
        ${[...select.options].map((o) => `
          <button type="button" class="bsel-opt" role="option" data-value="${esc(o.value)}" aria-selected="${o.selected}">
            <span>${esc(o.textContent.trim())}</span>${icon('check')}
          </button>`).join('')}
      </div>
    </div>`;
  select.hidden = true;
  select.tabIndex = -1;
  select.after(wrap);
  // Keep the visible label for="" pointing at something focusable.
  if (select.id) { wrap.querySelector('.bsel-btn').id = `${select.id}-btn`; select.labels?.forEach((l) => l.setAttribute('for', `${select.id}-btn`)); }

  const btn = wrap.querySelector('.bsel-btn');
  const menu = wrap.querySelector('.bsel-menu');
  const filter = wrap.querySelector('.bsel-search input');
  const opts = [...menu.querySelectorAll('.bsel-opt')];
  const visible = () => opts.filter((o) => !o.hidden);

  const setOpen = (open) => {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', open);
    if (!open) return;
    if (filter) { filter.value = ''; opts.forEach((o) => { o.hidden = false; }); }
    const current = opts.find((o) => o.getAttribute('aria-selected') === 'true') || opts[0];
    current?.scrollIntoView({ block: 'nearest' });
    (filter || current)?.focus();
  };
  const choose = (opt) => {
    opts.forEach((o) => o.setAttribute('aria-selected', o === opt));
    btn.querySelector('.bsel-label').innerHTML = label([...select.options].find((o) => o.value === opt.dataset.value));
    setOpen(false);
    btn.focus();
    if (select.value !== opt.dataset.value) {
      select.value = opt.dataset.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  btn.addEventListener('click', () => setOpen(menu.hidden));
  menu.addEventListener('click', (e) => {
    const opt = e.target.closest('.bsel-opt');
    if (opt) choose(opt);
  });
  filter?.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    opts.forEach((o) => { o.hidden = q && !o.textContent.toLowerCase().includes(q); });
  });
  menu.addEventListener('keydown', (e) => {
    const list = visible();
    if (e.key === 'Enter' && e.target === filter && list.length) { e.preventDefault(); choose(list[0]); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const i = list.indexOf(document.activeElement);
    list[(i + (e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length]?.focus();
  });

  // Close on outside click / Escape; listeners remove themselves once the view is gone.
  const onDoc = (e) => {
    if (!wrap.isConnected) { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); return; }
    if (!menu.hidden && !wrap.contains(e.target)) setOpen(false);
  };
  const onKey = (e) => { if (e.key === 'Escape' && !menu.hidden) { setOpen(false); btn.focus(); } };
  document.addEventListener('click', onDoc);
  document.addEventListener('keydown', onKey);
  return wrap;
}
