const User = require('../models/User');

const getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid }).select('-githubToken');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const updateProfile = async (req, res) => {
  try {
    const { city, displayName, lat, lon } = req.body;
    const updates = {};
    if (city !== undefined)       updates.city        = city;
    if (displayName !== undefined) updates.displayName = displayName;
    if (lat != null)              updates.lat         = lat;
    if (lon != null)              updates.lon         = lon;

    const user = await User.findOneAndUpdate(
      { uid: req.user.uid }, updates, { new: true }
    ).select('-githubToken');
    res.json({ message: 'Profile updated', user });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { getProfile, updateProfile };
