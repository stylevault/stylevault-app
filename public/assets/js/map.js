import { esc } from './lib.js';
import { store } from './store.js';

/**
 * Renders the clickable map of Africa. `onFocus(country)` fires on hover/focus,
 * `onOpen(country)` on click/Enter. Western Sahara is drawn neutrally and is not
 * selectable, since its status is disputed.
 */
export async function renderMap(container, { onFocus, onOpen, highlight = null } = {}) {
  const { VIEWBOX, PATHS, ISLAND_MARKERS, NEUTRAL } = await import('./africa-map.js');
  const countries = store.meta.countries;

  const shapes = countries.map((c) => {
    const label = `${esc(c.name)}: open country file`;
    const attrs = `data-code="${c.code}" data-region="${c.region}" tabindex="0" role="link" aria-label="${label}"`;
    const path = PATHS[c.code] ? `<path class="country" d="${PATHS[c.code]}" ${attrs}><title>${esc(c.name)}</title></path>` : '';
    const isle = ISLAND_MARKERS[c.code]
      ? `<circle class="island" cx="${ISLAND_MARKERS[c.code][0]}" cy="${ISLAND_MARKERS[c.code][1]}" r="9" ${attrs}><title>${esc(c.name)}</title></circle>`
      : '';
    return path + isle;
  }).join('');

  container.innerHTML = `<svg class="africa-map" viewBox="${VIEWBOX}" role="group" aria-label="Map of Africa: choose a country">
    <path class="neutral" d="${NEUTRAL}" aria-hidden="true"/>${shapes}</svg>`;

  const svg = container.firstElementChild;
  const byCode = (el) => store.countryByCode.get(el?.closest?.('[data-code]')?.dataset.code);
  const mark = (code) => svg.querySelectorAll('[data-code]').forEach((el) => el.classList.toggle('on', el.dataset.code === code));

  if (highlight) mark(highlight);
  const focus = (e) => {
    const c = byCode(e.target);
    if (!c) return;
    mark(c.code);
    onFocus?.(c);
  };
  svg.addEventListener('mouseover', focus);
  svg.addEventListener('focusin', focus);
  svg.addEventListener('click', (e) => {
    const c = byCode(e.target);
    if (c) onOpen?.(c);
  });
  svg.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const c = byCode(e.target);
    if (c) { e.preventDefault(); onOpen?.(c); }
  });
  return { mark };
}
