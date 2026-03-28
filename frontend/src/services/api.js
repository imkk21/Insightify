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
};

export const userAPI = {
  getProfile:    ()     => api.get('/user/profile'),
  updateProfile: (data) => api.patch('/user/profile', data),
};

export default api;
