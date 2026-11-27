const router = require('express').Router();
const { verifyToken } = require('../middleware/authMiddleware');
const c = require('../controllers/roomsController');

router.use(verifyToken);
router.get('/',                         c.listRooms);
router.post('/',                        c.createRoom);
router.post('/join',                    c.joinRoom);
router.get('/:code',                    c.getRoom);
router.delete('/:code',                 c.deleteRoom);
router.post('/:code/heartbeat',         c.heartbeat);
router.post('/:code/leave',             c.leaveRoom);
router.delete('/:code/members/:uid',    c.removeMember);
router.post('/:code/timer',             c.startTimer);
router.delete('/:code/timer',           c.stopTimer);
router.put('/:code/playlist',           c.setPlaylist);
router.post('/:code/kudos',             c.toggleKudos);
router.post('/:code/challenges',        c.createChallenge);
router.delete('/:code/challenges/:id',  c.deleteChallenge);

module.exports = router;
