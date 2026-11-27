import axios from 'axios';
import { auth } from './firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login:  () => api.post('/auth/login'),
  getMe:  () => api.get('/auth/me'),
};

export const githubAPI = {
  getStats:   ()                       => api.get('/github/stats'),
  sync:       ()                       => api.post('/github/sync'),
  connect:    (githubUsername)            => api.post('/github/connect', { githubUsername }),
  disconnect: ()                       => api.delete('/github/disconnect'),
};

export const weatherAPI = {
  get:  ({ lat, lon, city } = {}) => api.get('/weather', { params: { lat, lon, city } }),
  sync: ({ lat, lon, city } = {}) => api.post('/weather/sync', { lat, lon, city }),
};

export const newsAPI = {
  get: () => api.get('/news'),
};

export const insightAPI = {
  getLatest:  ()          => api.get('/insight'),
  getHistory: (limit=10)  => api.get('/insight/history', { params: { limit } }),
  generate:   ()          => api.post('/insight/generate'),
  custom:     (prompt)    => api.post('/insight/custom', { prompt }),
  refactor:   (code, lang) => api.post('/insight/refactor', { code, language: lang }),
};

export const reportAPI = {
  create:      (type) => api.post('/reports', { type }),
  sendToSlack: (id)   => api.post(`/reports/${id}/slack`),
};

export const securityAPI = {
  get:     () => api.get('/security'),
  summary: () => api.get('/security/summary'),
  scan:    () => api.post('/security/scan', null, { timeout: 120000 }), // ~30s for 15 repos
};

export const spotifyAPI = {
  getLoginUrl: () => api.get('/spotify/login'),
  getStatus:   () => api.get('/spotify/status'),
  getPlaylists: () => api.get('/spotify/playlists'),
  disconnect: () => api.delete('/spotify/disconnect'),
};

export const taskAPI = {
  getTasks:     ()     => api.get('/tasks'),
  createTask:   (data) => api.post('/tasks', data),
  updateTask:   (id, data) => api.patch(`/tasks/${id}`, data),
  deleteTask:   (id)   => api.delete(`/tasks/${id}`),
};

export const userAPI = {
  getProfile:    ()     => api.get('/user/profile'),
  updateProfile: (data) => api.patch('/user/profile', data),
};

export default api;
