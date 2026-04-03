const axios = require('axios');
const User = require('../models/User');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:5000/api/spotify/callback';

exports.getAuthUrl = (req, res) => {
  console.log('Initiating Spotify Auth for user:', req.user.uid);
  console.log('Client ID check:', !!CLIENT_ID);
  
  const scope = 'user-read-private user-read-email playlist-read-private user-modify-playback-state user-read-playback-state';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope: scope,
    redirect_uri: REDIRECT_URI,
    state: req.user.uid,
    show_dialog: true
  });

  const url = `https://accounts.spotify.com/authorize?${params.toString()}`;
  console.log('Generated URL:', url);
  res.json({ url });
};

exports.callback = async (req, res) => {
  const { code, state } = req.query; // state is the uid we passed

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', REDIRECT_URI);

    const response = await axios({
      method: 'post',
      url: 'https://accounts.spotify.com/api/token',
      data: params.toString(),
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
      },
    });

    const { access_token, refresh_token, expires_in } = response.data;
    const expiryDate = new Date(Date.now() + expires_in * 1000);

    await User.findOneAndUpdate(
      { uid: state },
      { 
        spotifyAccessToken: access_token, 
        spotifyRefreshToken: refresh_token, 
        spotifyTokenExpiry: expiryDate 
      }
    );

    // Redirect to frontend Deep Work page
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/focus?spotify=connected`);
  } catch (error) {
    console.error('Spotify Callback Error:', error.response?.data || error.message);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/focus?error=spotify_auth_failed`);
  }
};

exports.getPlaylists = async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user || !user.spotifyAccessToken) {
      return res.status(401).json({ error: 'Spotify not connected' });
    }

    // Simple Token Refresh Logic
    if (user.spotifyTokenExpiry && new Date() > user.spotifyTokenExpiry) {
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', user.spotifyRefreshToken);

      const refreshRes = await axios({
        method: 'post',
        url: 'https://accounts.spotify.com/api/token',
        data: params.toString(),
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
        },
      });

      user.spotifyAccessToken = refreshRes.data.access_token;
      user.spotifyTokenExpiry = new Date(Date.now() + refreshRes.data.expires_in * 1000);
      await user.save();
    }

    const playlistsRes = await axios.get('https://api.spotify.com/v1/me/playlists?limit=20', {
      headers: { 'Authorization': `Bearer ${user.spotifyAccessToken}` }
    });

    res.json(playlistsRes.data.items);
  } catch (error) {
    console.error('Fetch playlists error detail:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: 'Failed to fetch playlists' });
  }
};

exports.getConnectionStatus = async (req, res) => {
  const user = await User.findOne({ uid: req.user.uid });
  res.json({ connected: !!user?.spotifyAccessToken });
};

exports.disconnectSpotify = async (req, res) => {
  try {
    const uid = req.user.uid;
    await User.findOneAndUpdate(
      { uid },
      { 
        spotifyAccessToken: '', 
        spotifyRefreshToken: '', 
        spotifyTokenExpiry: null 
      }
    );
    res.json({ message: 'Spotify disconnected successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
