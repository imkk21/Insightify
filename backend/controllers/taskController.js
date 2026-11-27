const Task = require('../models/Task');

const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ uid: req.user.uid }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const createTask = async (req, res) => {
  try {
    const { title, status } = req.body;
    if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ error: 'Title is required' });

    const newTask = await Task.create({ uid: req.user.uid, title, status });
    res.status(201).json(newTask);
  } catch (err) {
    res.status(err.name === 'ValidationError' ? 400 : 500).json({ error: err.message });
  }
};

const updateTask = async (req, res) => {
  try {
    // Whitelist: never let the client overwrite uid or other internal fields
    const updates = {};
    if (req.body.title  !== undefined) updates.title  = req.body.title;
    if (req.body.status !== undefined) updates.status = req.body.status;

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, uid: req.user.uid },
      updates,
      { new: true, runValidators: true }
    );
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(['ValidationError', 'CastError'].includes(err.name) ? 400 : 500).json({ error: err.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, uid: req.user.uid });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(err.name === 'CastError' ? 400 : 500).json({ error: err.message });
  }
};

module.exports = { getTasks, createTask, updateTask, deleteTask };
