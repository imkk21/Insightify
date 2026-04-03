const router = require('express').Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getSessions, saveSession } = require('../controllers/focusController');

router.get('/', verifyToken, getSessions);
router.post('/', verifyToken, saveSession);

module.exports = router;
