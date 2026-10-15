import { api } from '../api.js';
import { $, esc, icon, initials } from '../lib.js';
import { store } from '../store.js';
import { confirmDialog, toast } from '../ui.js';

export default function account(main, { setTitle, navigate }) {
  if (!store.user) return navigate('/login?next=/account', { replace: true });
  setTitle('Account');
  const u = store.user;
  const since = new Date(u.createdAt * 1000).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  main.innerHTML = `
    <section class="page-hero"><div class="wrap"><span class="eyebrow">Your vault</span><h1>Account</h1></div></section>
    <div class="wrap" style="padding-top:32px"><div class="settings">
      <section class="panel">
        <div class="profile-card">
          <span class="avatar" data-avatar>${esc(initials(u.name))}</span>
          <div><h2 data-name>${esc(u.name)}</h2><div class="muted">${esc(u.email)} · Member since ${esc(since)}</div></div>
        </div>
        <div class="stat-row" style="margin-top:18px">
          <a class="stat-box" href="/following"><strong>${store.monitors.length}</strong><span>Following</span></a>
          <a class="stat-box" href="/saved"><strong>${store.savedIds.size}</strong><span>Saved</span></a>
          <a class="stat-box" href="/countries"><strong>${store.monitors.filter((m) => m.countries.length === 1 && !m.topics.length && !m.keywords).length}</strong><span>Countries followed</span></a>
        </div>
      </section>

      <section class="panel">
        <h2>Profile</h2>
        <form data-profile>
          <div class="field"><label for="acc-name">Name</label><input class="input" id="acc-name" name="name" value="${esc(u.name)}" maxlength="80" autocomplete="name"></div>
          <div><button class="btn btn-plum btn-sm" type="submit">Save name</button></div>
        </form>
      </section>

      <section class="panel">
        <h2>Password</h2>
        <form data-password>
          <div class="field"><label for="cur">Current password</label><input class="input" id="cur" name="current" type="password" autocomplete="current-password"></div>
          <div class="field"><label for="new">New password</label><input class="input" id="new" name="next" type="password" autocomplete="new-password" minlength="8">
            <span class="hint">At least 8 characters. Changing it signs you out on your other devices.</span></div>
          <p class="form-error" role="alert" data-pw-error></p>
          <div><button class="btn btn-plum btn-sm" type="submit">Change password</button></div>
        </form>
      </section>

      <section class="panel">
        <h2>Session</h2>
        <p style="margin-bottom:14px">Signed in on this device.</p>
        <button class="btn btn-outline btn-sm" type="button" data-signout>${icon('logout')} Sign out</button>
      </section>

      <section class="panel" style="border-color:color-mix(in srgb, var(--danger) 30%, var(--line))">
        <h2>Delete account</h2>
        <p style="margin-bottom:14px">Permanently removes your account, everything you follow and everything you saved. This can’t be undone.</p>
        <form data-delete style="display:grid;gap:12px;max-width:360px">
          <div class="field"><label for="del-pw">Confirm with your password</label><input class="input" id="del-pw" name="password" type="password" autocomplete="current-password"></div>
          <p class="form-error" role="alert" data-del-error></p>
          <div><button class="btn btn-danger btn-sm" type="submit">${icon('trash')} Delete my account</button></div>
        </form>
      </section>
    </div></div>`;

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
