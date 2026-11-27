const router = require('express').Router();
const { verifyToken } = require('../middleware/authMiddleware');
const c = require('../controllers/briefingController');

// Mounted at /api/briefing
router.use(verifyToken);
router.get('/', c.get);
router.post('/regenerate', c.regenerate);
router.get('/status', c.status);
router.get('/audio', c.audio);

module.exports = router;
