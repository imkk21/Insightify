const express = require('express');
const router = express.Router();
const spotifyController = require('../controllers/spotifyController');
const { verifyToken } = require('../middleware/authMiddleware');

// OAuth redirect - requires auth to pass UID as state
router.get('/login', verifyToken, spotifyController.getAuthUrl);

// Public callback (handling redirect from Spotify)
router.get('/callback', spotifyController.callback);

// Secure endpoints
router.get('/status', verifyToken, spotifyController.getConnectionStatus);
router.get('/playlists', verifyToken, spotifyController.getPlaylists);

module.exports = router;
