export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function request(method, path, body, extraHeaders = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...extraHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'You appear to be offline. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || `Request failed (${res.status})`);
  return data;
}

const qs = (params) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    p.set(k, Array.isArray(v) ? v.join(',') : v);
  }
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const api = {
  meta: () => request('GET', '/api/meta'),
  articles: (params = {}) => request('GET', `/api/articles${qs(params)}`),
  topStories: (params = {}) => request('GET', `/api/top-stories${qs(params)}`),
  sources: () => request('GET', '/api/sources'),
  country: (code) => request('GET', `/api/countries/${encodeURIComponent(code)}`),

  signup: (body) => request('POST', '/api/auth/signup', body),
  login: (body) => request('POST', '/api/auth/login', body),
  logout: () => request('POST', '/api/auth/logout'),
  forgotPassword: (body) => request('POST', '/api/auth/forgot-password', body),
  resetPassword: (body) => request('POST', '/api/auth/reset-password', body),

  me: () => request('GET', '/api/me'),
  updateProfile: (body) => request('PATCH', '/api/me', body),
  changePassword: (body) => request('POST', '/api/me/password', body),
  deleteAccount: (body) => request('DELETE', '/api/me', body),
  importLocal: (body) => request('POST', '/api/me/import', body),

  saved: () => request('GET', '/api/me/saved'),
  save: (articleId) => request('POST', '/api/me/saved', { articleId }),
  unsave: (articleId) => request('DELETE', `/api/me/saved/${articleId}`),

  createMonitor: (m) => request('POST', '/api/me/monitors', m),
  updateMonitor: (id, m) => request('PUT', `/api/me/monitors/${encodeURIComponent(id)}`, m),
  deleteMonitor: (id) => request('DELETE', `/api/me/monitors/${encodeURIComponent(id)}`),

  adminMetrics: (key) => request('GET', '/api/admin/metrics', null, key ? { 'X-Admin-Key': key } : {}),
  adminCollect: (key, all = false) => request('POST', `/api/admin/collect${all ? '?all=1' : ''}`, null, key ? { 'X-Admin-Key': key } : {}),
  adminIndicators: (key) => request('POST', '/api/admin/indicators', null, key ? { 'X-Admin-Key': key } : {}),
};
