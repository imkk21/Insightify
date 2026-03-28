const router = require('express').Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  getLatestInsight,
  getInsightHistory,
  generateNewInsight,
  generateCustomInsight,
} = require('../controllers/insightController');

router.get('/',            verifyToken, getLatestInsight);
router.get('/history',     verifyToken, getInsightHistory);
router.post('/generate',   verifyToken, generateNewInsight);
router.post('/custom',     verifyToken, generateCustomInsight);

module.exports = router;
