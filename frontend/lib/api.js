// Typed-ish API client for the Hazel Glen Care backend.
// Reads the base URL from NEXT_PUBLIC_API_URL and attaches the JWT from storage.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const TOKEN_KEY = 'hgc_token';

// Origin the API serves static files from (strip the trailing /api).
const MEDIA_ORIGIN = BASE_URL.replace(/\/api\/?$/, '');

/** Resolve a stored media path to something an <img src> can load. */
export function mediaUrl(p) {
  if (!p) return null;
  if (/^(data:|https?:)/.test(p)) return p; // data URL or already absolute
  return `${MEDIA_ORIGIN}${p.startsWith('/') ? '' : '/'}${p}`;
}

export const tokenStore = {
  get() {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(TOKEN_KEY);
  },
  set(token) {
    if (typeof window === 'undefined') return;
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  },
  clear() {
    this.set(null);
  },
};

/** Core request helper. Throws an Error with .status and .details on failure. */
async function request(path, { method = 'GET', body, auth = true, params } = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) Object.entries(params).forEach(([k, v]) => v != null && v !== '' && url.searchParams.set(k, v));

  const headers = { 'Content-Type': 'application/json' };
  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.details = data?.details;
    throw err;
  }
  return data;
}

export const api = {
  request,

  auth: {
    login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
    register: (payload) => request('/auth/register', { method: 'POST', body: payload }), // admin-only
    me: () => request('/auth/me'),
  },

  shifts: {
    list: (params) => request('/shifts', { params }),
    get: (id) => request(`/shifts/${id}`),
    create: (payload) => request('/shifts', { method: 'POST', body: payload }),
    update: (id, payload) => request(`/shifts/${id}`, { method: 'PATCH', body: payload }),
    cancel: (id) => request(`/shifts/${id}`, { method: 'DELETE' }),
    candidates: (id, limit = 10) => request(`/shifts/${id}/candidates`, { params: { limit } }),
    autoAssign: (id, autoConfirm = false) => request(`/shifts/${id}/auto-assign`, { method: 'POST', body: { autoConfirm } }),
    broadcast: (id) => request(`/shifts/${id}/broadcast`, { method: 'POST' }),
  },

  recruitment: {
    jobs: (params) => request('/recruitment/jobs', { params, auth: false }),
    createJob: (payload) => request('/recruitment/jobs', { method: 'POST', body: payload }),
    applications: (params) => request('/recruitment/applications', { params }),
    apply: (payload) => request('/recruitment/applications', { method: 'POST', body: payload, auth: false }),
    screen: (id, cvText) => request(`/recruitment/applications/${id}/screen`, { method: 'POST', body: { cvText } }),
    setStatus: (id, status) => request(`/recruitment/applications/${id}/status`, { method: 'PATCH', body: { status } }),
  },

  directory: {
    staff: () => request('/directory/staff'),
  },

  compliance: {
    checkStaff: (staffId, warnWithinDays = 30) => request(`/compliance/staff/${staffId}`, { params: { warnWithinDays } }),
    scan: (withinDays = 30) => request('/compliance/scan', { method: 'POST', body: { withinDays } }),
    remind: (withinDays = 30) => request('/compliance/remind', { method: 'POST', body: { withinDays } }),
  },

  reports: {
    list: (type) => request('/reports', { params: { type } }),
    generate: (type, start, end) => request('/reports', { method: 'POST', body: { type, start, end } }),
  },

  staff: {
    me: () => request('/staff/me'),
    uploadPhoto: (photo) => request('/staff/me/photo', { method: 'POST', body: { photo } }),
    respond: (assignmentId, accept) => request(`/staff/assignments/${assignmentId}/respond`, { method: 'POST', body: { accept } }),
    timesheets: () => request('/staff/me/timesheets'),
    submitTimesheet: (payload) => request('/staff/timesheets', { method: 'POST', body: payload }),
    clockIn: (assignmentId, payload) => request(`/staff/assignments/${assignmentId}/clock-in`, { method: 'POST', body: payload }),
    clockOut: (assignmentId, payload) => request(`/staff/assignments/${assignmentId}/clock-out`, { method: 'POST', body: payload }),
  },

  timesheets: {
    list: (status) => request('/timesheets', { params: { status } }),
    setStatus: (id, status) => request(`/timesheets/${id}/status`, { method: 'PATCH', body: { status } }),
  },

  metrics: {
    dashboard: () => request('/metrics/dashboard'),
  },

  team: {
    list: () => request('/team'),
    createStaff: (payload) => request('/team/staff', { method: 'POST', body: payload }),
    createAdmin: (payload) => request('/team/admins', { method: 'POST', body: payload }),
    convertApplicant: (applicationId) => request(`/team/applications/${applicationId}/convert`, { method: 'POST' }),
  },

  client: {
    me: () => request('/client/me'),
    requests: () => request('/client/shift-requests'),
    createRequest: (payload) => request('/client/shift-requests', { method: 'POST', body: payload }),
  },

  notifications: {
    list: () => request('/notifications'),
    markRead: (id) => request(`/notifications/${id}/read`, { method: 'POST' }),
  },

  invoices: {
    list: (params) => request('/invoices', { params }),
    get: (id) => request(`/invoices/${id}`),
    generate: (clientId, start, end) => request('/invoices/generate', { method: 'POST', body: { clientId, start, end } }),
    setStatus: (id, status) => request(`/invoices/${id}/status`, { method: 'PATCH', body: { status } }),
    async downloadPdf(id, filename = 'invoice.pdf') {
      const token = tokenStore.get();
      const res = await fetch(`${BASE_URL}/invoices/${id}/pdf`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error('Could not generate the PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click();
      a.remove(); URL.revokeObjectURL(url);
    },
  },

  clients: {
    list: () => request('/clients'),
  },
};

export default api;
