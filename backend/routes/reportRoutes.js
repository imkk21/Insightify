const router = require('express').Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { create, sendToSlack } = require('../controllers/reportController');

router.post('/',          verifyToken, create);
router.post('/:id/slack', verifyToken, sendToSlack);

module.exports = router;
