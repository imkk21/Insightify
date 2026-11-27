const router = require('express').Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getSkills, getMatches, getPublicSkills } = require('../controllers/skillsController');

// Mounted at /api/skills
router.get('/public/:username', getPublicSkills); // no auth: opted-in public profiles only
router.get('/matches', verifyToken, getMatches);
router.get('/', verifyToken, getSkills);

module.exports = router;
