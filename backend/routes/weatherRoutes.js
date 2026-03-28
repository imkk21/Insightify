const router = require('express').Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getWeather, syncWeather } = require('../controllers/weatherController');

router.get('/',      verifyToken, getWeather);
router.post('/sync', verifyToken, syncWeather);

module.exports = router;
