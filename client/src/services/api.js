/**
 * api.js
 * Centralized API client for communicating with the Placement Scheduler Backend.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Health & Service Status
  getHealth: () => request('/health'),

  // Data Seeding / Generation
  generateData: (payload = { totalStudents: 800, clearExisting: true }) =>
    request('/data/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getDataSummary: () => request('/data/summary'),

  // Schedule Retrieval & Generation
  getSchedule: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'all') query.set('status', params.status);
    if (params.day && params.day !== 'all') query.set('day', params.day);
    if (params.company) query.set('company', params.company);
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit || 50);

    const qs = query.toString();
    return request(`/schedule${qs ? `?${qs}` : ''}`);
  },

  getScheduleSummary: () => request('/schedule/summary'),

  generateSchedule: (payload = { clearExisting: true }) =>
    request('/schedule/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Disruption & Replanning
  getReplanSampleIds: () => request('/replan/ids'),

  submitReplan: (disruptionPayload) =>
    request('/replan', {
      method: 'POST',
      body: JSON.stringify(disruptionPayload),
    }),

  getReplanHistory: (page = 1, limit = 50) =>
    request(`/replan/history?page=${page}&limit=${limit}`),
};

export default api;
