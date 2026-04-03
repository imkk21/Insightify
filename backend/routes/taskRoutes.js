const router = require('express').Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { getTasks, createTask, updateTask, deleteTask } = require('../controllers/taskController');

router.get('/', verifyToken, getTasks);
router.post('/', verifyToken, createTask);
router.patch('/:id', verifyToken, updateTask);
router.delete('/:id', verifyToken, deleteTask);

module.exports = router;
