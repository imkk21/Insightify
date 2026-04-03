const router = require('express').Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  getLatestInsight,
  getInsightHistory,
  generateNewInsight,
  generateCustomInsight,
  generateCodeRefactor,
} = require('../controllers/insightController');

router.get('/',            verifyToken, getLatestInsight);
router.get('/history',     verifyToken, getInsightHistory);
router.post('/generate',   verifyToken, generateNewInsight);
router.post('/custom',     verifyToken, generateCustomInsight);
router.post('/refactor',   verifyToken, generateCodeRefactor);

module.exports = router;
