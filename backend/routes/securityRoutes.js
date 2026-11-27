const router = require('express').Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getScan, getSummary, scan } = require('../controllers/securityController');

router.get('/',         verifyToken, getScan);
router.get('/summary',  verifyToken, getSummary);
router.post('/scan',    verifyToken, scan);

module.exports = router;
