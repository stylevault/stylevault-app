import { api } from '../api.js';
import { $, esc, flag, icon, initials } from '../lib.js';
import { store } from '../store.js';
import { confirmDialog, toast } from '../ui.js';
import { brandSelect } from '../brand-select.js';

const PASSPORT_KEY = 'sv_eta_passport'; // shared with the ETA tracker tool
const ACTIVITY_KEY = 'sv_reading_activity';

const readLocal = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const writeLocal = (key, value) => { try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch { /* storage blocked */ } };

export default function account(main, { setTitle, navigate }) {
  if (!store.user) return navigate('/login?next=/account', { replace: true });
  setTitle('Account');
  const u = store.user;
  const since = new Date(u.createdAt * 1000).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const followedCountries = store.monitors
    .filter((m) => m.countries.length === 1 && !m.topics.length && !m.keywords)
    .map((m) => store.countryByCode.get(m.countries[0])).filter(Boolean);
  const followedTopics = store.monitors
    .filter((m) => m.topics.length === 1 && !m.countries.length && !m.keywords)
    .map((m) => store.topicBySlug.get(m.topics[0])).filter(Boolean);
  const activity = store.getReadingActivity();
  const mostRead = activity.topCountries.map((code) => store.countryByCode.get(code)).filter(Boolean);
  const passport = readLocal(PASSPORT_KEY) || '';
  const countriesByName = [...store.meta.countries].sort((a, b) => a.name.localeCompare(b.name));

  const countryChip = (c) => `<a class="acc-chip" href="/country/${c.slug}">${flag(c.code, 'acc-flag', '')}<span>${esc(c.name)}</span></a>`;

  main.innerHTML = `
    <section class="acc-hero"><div class="wrap">
      <div class="acc-id">
        <span class="avatar acc-avatar" data-avatar>${esc(initials(u.name))}</span>
        <div class="acc-id-text">
          <h1 data-name>${esc(u.name)}</h1>
          <p>${esc(u.email)}</p>
          <p class="acc-since">Member since ${esc(since)}</p>
        </div>
      </div>
      <div class="acc-stats">
        <a href="/following"><strong>${store.monitors.length}</strong><span>Following</span></a>
        <a href="/saved"><strong>${store.savedIds.size}</strong><span>Saved</span></a>
        <a href="/countries"><strong>${followedCountries.length}</strong><span>Countries</span></a>
      </div>
    </div></section>

    <div class="acc-body"><div class="wrap acc-page"><div class="acc-sections">
      <section class="acc-section">
        <div class="acc-head">
          <div><h2>Your interests</h2><p>What shapes your home page and news.</p></div>
          <a class="text-link" href="/following">Manage ${icon('arrow-right')}</a>
        </div>
        <div class="acc-group">
          <div class="acc-group-header">
            <h3>Countries you follow</h3>
            ${followedCountries.length ? `<span class="acc-count-pill">${followedCountries.length}</span>` : ''}
          </div>
          ${followedCountries.length
            ? `<div class="acc-grid">${followedCountries.map(countryChip).join('')}</div>`
            : `<p class="acc-empty">Follow countries to shape your home page and news. <a href="/countries">Browse countries</a></p>`}
        </div>
        <div class="acc-group">
          <div class="acc-group-header">
            <h3>Topics you follow</h3>
            ${followedTopics.length ? `<span class="acc-count-pill">${followedTopics.length}</span>` : ''}
          </div>
          ${followedTopics.length
            ? `<div class="acc-grid">${followedTopics.map((t) => `<a class="acc-chip" href="/topic/${t.slug}"><span class="acc-topic-dot"></span><span>${esc(t.name)}</span></a>`).join('')}</div>`
            : `<p class="acc-empty">No topics yet. <a href="/topics">Explore topics</a></p>`}
        </div>
        ${mostRead.length ? `
          <div class="acc-group">
            <div class="acc-group-header">
              <h3>You read most about</h3>
              <span class="acc-count-pill">${mostRead.length}</span>
            </div>
            <div class="acc-grid">${mostRead.map(countryChip).join('')}</div>
          </div>` : ''}
      </section>

      <section class="acc-section">
        <div class="acc-head"><div><h2>Preferences</h2><p>Saved in this browser.</p></div></div>
        <div class="acc-row">
          <div>
            <label class="acc-label" for="acc-passport">Your passport</label>
            <p class="acc-hint">Pre-selected in the ETA &amp; visa tracker on this device.</p>
          </div>
          <select class="select acc-select" id="acc-passport" data-passport>
            <option value="" ${passport ? '' : 'selected'}>Not set</option>
            ${countriesByName.map((c) => `<option value="${c.code}" ${c.code === passport ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="acc-row">
          <div>
            <span class="acc-label">Reading history</span>
            <p class="acc-hint" data-activity-hint>${activity.totalEvents
              ? `${activity.totalEvents} recent ${activity.totalEvents === 1 ? 'visit' : 'visits'} kept on this device to tailor suggestions.`
              : 'Nothing stored on this device.'}</p>
          </div>
          <button class="btn btn-outline btn-sm" type="button" data-clear-activity ${activity.totalEvents ? '' : 'disabled'}>Clear</button>
        </div>
      </section>

      <section class="acc-section">
        <div class="acc-head">
          <div><h2>Privacy &amp; standards</h2><p>Our commitment to data protection, open citations and editorial transparency.</p></div>
        </div>
        <div class="acc-row">
          <div>
            <span class="acc-label">Privacy Policy</span>
            <p class="acc-hint">Learn how Style Vault protects your data, avoids ad tracking, and supports instant account erasure.</p>
          </div>
          <a class="btn btn-outline btn-sm" href="/privacy">${icon('shield')} Privacy Policy</a>
        </div>
        <div class="acc-row">
          <div>
            <span class="acc-label">Sources &amp; methods</span>
            <p class="acc-hint">Explore the 150+ independent newsrooms, World Bank indicators, and indexing rules we use.</p>
          </div>
          <a class="btn btn-outline btn-sm" href="/sources">${icon('book')} Sources &amp; methods</a>
        </div>
      </section>

      <section class="acc-section">
        <div class="acc-head"><div><h2>Account</h2><p>Name, password and sign-in.</p></div></div>
        <form class="acc-form" data-profile>
          <label class="acc-label" for="acc-name">Name</label>
          <div class="acc-inline">
            <input class="input" id="acc-name" name="name" value="${esc(u.name)}" maxlength="80" autocomplete="name">
            <button class="btn btn-plum btn-sm" type="submit">Save</button>
          </div>
        </form>

        <details class="acc-more">
          <summary>Change password ${icon('chevron-down')}</summary>
          <form class="acc-form" data-password>
            <div class="field"><label for="cur">Current password</label><input class="input" id="cur" name="current" type="password" autocomplete="current-password"></div>
            <div class="field"><label for="new">New password</label><input class="input" id="new" name="next" type="password" autocomplete="new-password" minlength="8">
              <span class="hint">At least 8 characters. Changing it signs you out on your other devices.</span></div>
            <p class="form-error" role="alert" data-pw-error></p>
            <div><button class="btn btn-plum btn-sm" type="submit">Change password</button></div>
          </form>
        </details>

        <div class="acc-row acc-signout">
          <button class="btn btn-outline btn-sm" type="button" data-signout>${icon('logout')} Sign out</button>
        </div>

        <details class="acc-more acc-danger">
          <summary>Delete account ${icon('chevron-down')}</summary>
          <p class="acc-hint">Permanently removes your account, everything you follow and everything you saved. This can’t be undone.</p>
          <form class="acc-form" data-delete>
            <div class="field"><label for="del-pw">Confirm with your password</label><input class="input" id="del-pw" name="password" type="password" autocomplete="current-password"></div>
            <p class="form-error" role="alert" data-del-error></p>
            <div><button class="btn btn-danger btn-sm" type="submit">${icon('trash')} Delete my account</button></div>
          </form>
        </details>
      </section>
    </div></div></div>`;

  brandSelect($('[data-passport]', main));
  $('[data-passport]', main).addEventListener('change', (e) => {
    writeLocal(PASSPORT_KEY, e.target.value || null);
    toast(e.target.value ? 'Passport saved' : 'Passport cleared');
  });

  $('[data-clear-activity]', main).addEventListener('click', async (e) => {
    const ok = await confirmDialog({ title: 'Clear reading history?', body: 'Suggestions based on what you’ve read will start fresh on this device.', confirmLabel: 'Clear history' });
    if (!ok) return;
    writeLocal(ACTIVITY_KEY, null);
    e.target.disabled = true;
    $('[data-activity-hint]', main).textContent = 'Nothing stored on this device.';
    toast('Reading history cleared');
  });

  $('[data-profile]', main).addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const { user } = await api.updateProfile({ name: e.target.name.value });
      store.applyMe({ user, savedIds: [...store.savedIds], monitors: store.monitors });
      $('[data-name]', main).textContent = user.name;
      $('[data-avatar]', main).textContent = initials(user.name);
      toast('Name updated');
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  $('[data-password]', main).addEventListener('submit', async (e) => {
    e.preventDefault();
    const box = $('[data-pw-error]', main);
    box.classList.remove('show');
    try {
      await api.changePassword({ current: e.target.current.value, next: e.target.next.value });
      e.target.reset();
      toast('Password changed');
    } catch (err) {
      box.textContent = err.message;
      box.classList.add('show');
    }
  });

  $('[data-delete]', main).addEventListener('submit', async (e) => {
    e.preventDefault();
    const box = $('[data-del-error]', main);
    box.classList.remove('show');
    const password = e.target.password.value;
    if (!password) {
      box.textContent = 'Enter your password to confirm.';
      box.classList.add('show');
      return;
    }
    const ok = await confirmDialog({ title: 'Delete your account?', body: 'Everything you follow and save will be permanently deleted.', confirmLabel: 'Delete permanently', danger: true });
    if (!ok) return;
    try {
      await api.deleteAccount({ password });
      store.applyMe({ user: null });
      toast('Your account has been deleted');
      navigate('/', { replace: true });
    } catch (err) {
      box.textContent = err.message;
      box.classList.add('show');
    }
  });
}
