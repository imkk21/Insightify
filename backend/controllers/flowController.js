const axios = require('axios');
const User = require('../models/User');
const { freshStats } = require('./githubController');
const { getSpotifyAccessToken } = require('./spotifyController');
const { askGemini } = require('../services/insightService');
const { analyzeFlow, scoreTracks } = require('../services/flowService');

const PLAYLIST_NAME = 'Insightify Flow';
const SUB_LABELS = { consistency: 'Consistency', deepWork: 'Deep work', rhythm: 'Rhythm', recovery: 'Recovery' };

/** `tz` = minutes east of UTC (browser: -getTimezoneOffset()). Real zones span -720..+840. */
const parseTz = (req) => {
  const raw = req.query.tz ?? '0';
  const tz = Number(raw);
  return /^-?\d+$/.test(String(raw)) && Math.abs(tz) <= 840 ? tz : null;
};

const plain = (doc) => (doc?.toObject ? doc.toObject() : doc);
const fail = (res, err, msg) => {
  console.error(msg, err.response?.data || err.message);
  res.status(502).json({ error: msg });
};

// ponytail: in-memory note cache (per process, unbounded by user count); move to FlowSnapshot if it grows.
const notes = new Map();

const flowNote = async (uid, a) => {
  const key = JSON.stringify([a.score, a.burnout.risk, a.burnout.signals.map((s) => s.id)]);
  const hit = notes.get(uid);
  if (hit?.key === key) return hit.note;

  const ranked = Object.entries(a.subscores).sort((x, y) => y[1] - x[1]);
  const fallback = `Flow ${a.score}/100 this week. ${SUB_LABELS[ranked[0][0]]} is your strongest area; `
    + `${SUB_LABELS[ranked[3][0]].toLowerCase()} has the most room to grow. Burnout risk looks ${a.burnout.risk}`
    + `${a.burnout.signals[0] ? `: ${a.burnout.signals[0].text.toLowerCase()}.` : '.'}`;
  const prompt = `You are a calm, supportive engineering coach. From these commit-timing heuristics (not medical data), write 2-3 short sentences for the developer: one strength, one risk, one concrete tip. No headings, no diagnosis.\n`
    + `Flow score: ${a.score}/100. Sub-scores: ${ranked.map(([k, v]) => `${SUB_LABELS[k]} ${v}`).join(', ')}.\n`
    + `Peak focus window: ${a.patterns.focusWindow.label}. Burnout risk: ${a.burnout.risk}. Signals: ${a.burnout.signals.map((s) => s.text).join('; ') || 'none'}.`;
  const { content, model } = await askGemini(prompt, fallback);
  const note = { text: content, model };
  notes.set(uid, { key, note });
  return note;
};

/** GET /api/flow?tz=330 */
exports.getFlow = async (req, res) => {
  const tz = parseTz(req);
  if (tz === null) return res.status(400).json({ error: 'tz must be an integer between -840 and 840.' });
  try {
    const stats = plain(await freshStats(req.user.uid));
    if (!stats) return res.status(400).json({ error: 'Connect GitHub to see your flow.' });
    const a = analyzeFlow({ calendar: stats.calendar || [], commits: stats.recentCommits || [], tz });
    res.json({ ...a, note: await flowNote(req.user.uid, a), recovery: null }); // recovery: wearables, not wired yet
  } catch (err) { fail(res, err, 'Could not compute your flow right now.'); }
};

const spotify = (token) => axios.create({ baseURL: 'https://api.spotify.com/v1', headers: { Authorization: `Bearer ${token}` } });

/** Ranked flow tracks, or a status object explaining why there are none. */
const flowTracks = async (uid) => {
  const user = await User.findOne({ uid });
  if (!user?.spotifyAccessToken) return { connected: false, needsReconnect: false, tracks: [] };
  let api;
  let items;
  try {
    api = spotify(await getSpotifyAccessToken(user));
    ({ data: { items } } = await api.get('/me/player/recently-played', { params: { limit: 50 } }));
  } catch (err) {
    const s = err.response?.status;
    // 401/403: token predates the recently-played scope (or refresh failed) → reconnect
    if (s === 401 || s === 403 || err.config?.url?.includes('accounts.spotify.com')) {
      return { connected: true, needsReconnect: true, tracks: [] };
    }
    throw err;
  }
  const stats = plain(await freshStats(uid));
  return { connected: true, needsReconnect: false, plays: items?.length || 0, tracks: scoreTracks(items || [], stats?.recentCommits || []), api };
};

/** GET /api/flow/playlist?tz=330 */
exports.getPlaylist = async (req, res) => {
  if (parseTz(req) === null) return res.status(400).json({ error: 'tz must be an integer between -840 and 840.' });
  try {
    const { api, ...out } = await flowTracks(req.user.uid);
    res.json(out);
  } catch (err) { fail(res, err, 'Could not read your Spotify history.'); }
};

/** POST /api/flow/playlist?tz=330 → creates/updates the private "Insightify Flow" playlist. */
exports.createPlaylist = async (req, res) => {
  if (parseTz(req) === null) return res.status(400).json({ error: 'tz must be an integer between -840 and 840.' });
  try {
    const { api, connected, needsReconnect, tracks } = await flowTracks(req.user.uid);
    if (!connected) return res.status(400).json({ error: 'Connect Spotify first.' });
    if (needsReconnect) return res.status(409).json({ error: 'Reconnect Spotify to allow playlist access.', needsReconnect: true });
    if (!tracks.length) return res.status(400).json({ error: 'No tracks overlapped with your commits yet.' });

    const { data: me } = await api.get('/me');
    // ponytail: only looks at the first 50 playlists for an existing one; paginate if users have more.
    const { data: mine } = await api.get('/me/playlists', { params: { limit: 50 } });
    let playlist = mine.items?.find((p) => p?.name === PLAYLIST_NAME && p.owner?.id === me.id);
    if (!playlist) {
      ({ data: playlist } = await api.post(`/users/${encodeURIComponent(me.id)}/playlists`, {
        name: PLAYLIST_NAME, public: false,
        description: 'Tracks you were playing while you shipped. Built by Insightify.',
      }));
    }
    await api.put(`/playlists/${encodeURIComponent(playlist.id)}/tracks`, { uris: tracks.map((t) => t.uri) });
    res.json({ playlist: {
      id: playlist.id, name: playlist.name, images: playlist.images || [],
      url: playlist.external_urls?.spotify || null, tracks: tracks.length,
    } });
  } catch (err) {
    const s = err.response?.status;
    if (s === 401 || s === 403) return res.status(409).json({ error: 'Reconnect Spotify to allow playlist access.', needsReconnect: true });
    fail(res, err, 'Could not create the playlist on Spotify.');
  }
};
