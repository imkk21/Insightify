const router = require('express').Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getNews, syncNews } = require('../controllers/newsController');

router.get('/',      verifyToken, getNews);
router.post('/sync', verifyToken, syncNews);

module.exports = router;
