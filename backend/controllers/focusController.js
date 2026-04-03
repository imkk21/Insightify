const DeepWork = require('../models/DeepWork');

const getSessions = async (req, res) => {
  try {
    const sessions = await DeepWork.find({ uid: req.user.uid }).sort({ completedAt: -1 }).limit(50);
    
    // Calculate total minutes this week
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const weeklySessions = await DeepWork.find({
      uid: req.user.uid,
      completedAt: { $gte: startOfWeek }
    });
    
    const weeklyMinutes = weeklySessions.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    
    res.json({ sessions, weeklyMinutes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const saveSession = async (req, res) => {
  try {
    const { durationMinutes, ambientNoise } = req.body;
    const session = await DeepWork.create({
      uid: req.user.uid,
      durationMinutes,
      ambientNoise
    });
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getSessions, saveSession };
