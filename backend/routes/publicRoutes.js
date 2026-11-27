const router = require('express').Router();
const { getPublicProfile } = require('../controllers/publicController');

router.get('/:username', getPublicProfile); // intentionally no verifyToken

module.exports = router;
