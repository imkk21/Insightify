const router = require('express').Router();
const { verifyToken } = require('../middleware/authMiddleware');
const c = require('../controllers/autopilotController');

// Mounted at /api/autopilot
router.get('/status',             verifyToken, c.getStatus);
router.get('/plans',              verifyToken, c.getPlans);
router.get('/plans/:repo/patch',  verifyToken, c.getPatch);
router.post('/plans/explain',     verifyToken, c.explainPlan);
router.post('/pr',                verifyToken, c.openPr);
router.post('/incident',          verifyToken, c.incident);
router.get('/chores',             verifyToken, c.getChores);
router.get('/history',            verifyToken, c.getHistory);

module.exports = router;
