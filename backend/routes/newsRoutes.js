const router = require('express').Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getNews } = require('../controllers/newsController');

router.get('/',      verifyToken, getNews);

module.exports = router;
