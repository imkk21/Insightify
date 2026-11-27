const axios = require('axios');
const crypto = require('crypto');
const User = require('../models/User');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:5000/api/spotify/callback';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
const STATE_TTL_MS = 10 * 60 * 1000;

// OAuth state = "<uid>.<issuedAt>.<hmac>". Signed with the client secret so nobody can
// forge a state for another user's uid and attach their own Spotify to that account.
const sign = (payload) => crypto.createHmac('sha256', CLIENT_SECRET).update(payload).digest('base64url');

const makeState = (uid) => {
  const payload = `${uid}.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
};

const readState = (state = '') => {
  const i = state.lastIndexOf('.');
  if (i < 0) return null;
  const payload = state.slice(0, i);
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(state.slice(i + 1));
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  const j = payload.lastIndexOf('.');
  if (Date.now() - Number(payload.slice(j + 1)) > STATE_TTL_MS) return null;
  return payload.slice(0, j); // uid
};

const tokenRequest = (params) => axios.post('https://accounts.spotify.com/api/token', params.toString(), {
  headers: {
    'content-type': 'application/x-www-form-urlencoded',
    Authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
  },
});

exports.getAuthUrl = (req, res) => {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: 'playlist-read-private', // only /me/playlists is used; playback is the embed iframe
    redirect_uri: REDIRECT_URI,
    state: makeState(req.user.uid),
    show_dialog: true,
  });
  res.json({ url: `https://accounts.spotify.com/authorize?${params}` });
};

exports.callback = async (req, res) => {
  const uid = readState(req.query.state);
  if (!uid || !req.query.code) return res.redirect(`${FRONTEND_URL}/music?error=spotify_auth_failed`);

  try {
    const { data } = await tokenRequest(new URLSearchParams({
      grant_type: 'authorization_code',
      code: req.query.code,
      redirect_uri: REDIRECT_URI,
    }));

    await User.findOneAndUpdate({ uid }, {
      spotifyAccessToken:  data.access_token,
      spotifyRefreshToken: data.refresh_token,
      spotifyTokenExpiry:  new Date(Date.now() + data.expires_in * 1000),
    });

    res.redirect(`${FRONTEND_URL}/music?spotify=connected`);
  } catch (error) {
    console.error('Spotify Callback Error:', error.response?.data || error.message);
    res.redirect(`${FRONTEND_URL}/music?error=spotify_auth_failed`);
  }
};

exports.getPlaylists = async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user || !user.spotifyAccessToken) {
      return res.status(401).json({ error: 'Spotify not connected' });
    }

    if (user.spotifyTokenExpiry && new Date() > user.spotifyTokenExpiry) {
      const { data } = await tokenRequest(new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: user.spotifyRefreshToken,
      }));
      user.spotifyAccessToken = data.access_token;
      if (data.refresh_token) user.spotifyRefreshToken = data.refresh_token; // Spotify may rotate it
      user.spotifyTokenExpiry = new Date(Date.now() + data.expires_in * 1000);
      await user.save();
    }

    const { data } = await axios.get('https://api.spotify.com/v1/me/playlists?limit=20', {
      headers: { Authorization: `Bearer ${user.spotifyAccessToken}` },
    });
    res.json(data.items);
  } catch (error) {
    console.error('Fetch playlists error:', error.response?.data || error.message);
    // Don't forward Spotify's 401 as-is: the frontend would treat it as an Insightify auth failure
    res.status(502).json({ error: 'Failed to fetch playlists' });
  }
};

exports.getConnectionStatus = async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    res.json({ connected: !!user?.spotifyAccessToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.disconnectSpotify = async (req, res) => {
  try {
    await User.findOneAndUpdate(
      { uid: req.user.uid },
      { spotifyAccessToken: '', spotifyRefreshToken: '', spotifyTokenExpiry: null }
    );
    res.json({ message: 'Spotify disconnected successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
