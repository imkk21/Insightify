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

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login:  () => api.post('/auth/login'),
  getMe:  () => api.get('/auth/me'),
};

export const githubAPI = {
  getStats:   ()                       => api.get('/github/stats'),
  sync:       ()                       => api.post('/github/sync'),
  connect:    (githubUsername, githubToken) => api.post('/github/connect', { githubUsername, githubToken }),
  disconnect: ()                       => api.delete('/github/disconnect'),
};

export const weatherAPI = {
  get:  ({ lat, lon, city } = {}) => api.get('/weather', { params: { lat, lon, city } }),
  sync: ({ lat, lon, city } = {}) => api.post('/weather/sync', { lat, lon, city }),
};

export const newsAPI = {
  get:  () => api.get('/news'),
  sync: () => api.post('/news/sync'),
};

export const insightAPI = {
  getLatest:  ()          => api.get('/insight'),
  getHistory: (limit=10)  => api.get('/insight/history', { params: { limit } }),
  generate:   ()          => api.post('/insight/generate'),
  custom:     (prompt)    => api.post('/insight/custom', { prompt }),
  refactor:   (code, lang) => api.post('/insight/refactor', { code, language: lang }),
};

export const spotifyAPI = {
  getLoginUrl: () => api.get('/spotify/login'),
  getStatus:   () => api.get('/spotify/status'),
  getPlaylists: () => api.get('/spotify/playlists'),
};

export const focusAPI = {
  getSessions: () => api.get('/focus'),
  saveSession: (data) => api.post('/focus', data),
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
