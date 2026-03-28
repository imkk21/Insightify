const router = require('express').Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getStats, syncStats, connectGithub, disconnectGithub } = require('../controllers/githubController');

router.get('/',             verifyToken, getStats);
router.get('/stats',        verifyToken, getStats);
router.post('/sync',        verifyToken, syncStats);
router.post('/connect',     verifyToken, connectGithub);
router.delete('/disconnect',verifyToken, disconnectGithub);

module.exports = router;
