const router = require('express').Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getRepos, getReport, getTour } = require('../controllers/codebaseController');

// ponytail: a repo literally named "repos" is shadowed by this route
router.get('/repos',       verifyToken, getRepos);
router.get('/:repo',       verifyToken, getReport);
router.get('/:repo/tour',  verifyToken, getTour);

module.exports = router;
