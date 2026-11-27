const router = require('express').Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getFlow, getPlaylist, createPlaylist } = require('../controllers/flowController');

router.get('/',          verifyToken, getFlow);
router.get('/playlist',  verifyToken, getPlaylist);
router.post('/playlist', verifyToken, createPlaylist);

module.exports = router;
