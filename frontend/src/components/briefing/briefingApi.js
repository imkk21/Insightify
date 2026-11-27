import api from '../../services/api';

// Generation can take a while (GitHub refresh + AI), ElevenLabs longer still.
const tz = () => new Date().getTimezoneOffset();

export const briefingAPI = {
  get:        () => api.get('/briefing', { params: { tz: tz() }, timeout: 60000 }),
  regenerate: () => api.post('/briefing/regenerate', { tz: tz() }, { timeout: 60000 }),
  status:     () => api.get('/briefing/status'),
  audio:      () => api.get('/briefing/audio', { responseType: 'blob', timeout: 90000 }),
};

export const fmtTime = (s) => {
  const n = Math.max(0, Math.round(s || 0));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
};
