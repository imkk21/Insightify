const User = require('../models/User');

/**
 * POST /api/auth/login
 * Called after Firebase client-side auth.
 * Creates or updates the user in MongoDB.
 */
const loginOrRegister = async (req, res) => {
  try {
    const { uid, email, photoURL, name, picture } = req.user; // from verifyToken middleware
    const finalDisplayName = name || req.user.displayName || 'Developer';
    const finalPhotoURL = picture || photoURL || '';

    let user = await User.findOne({ uid });
    if (!user) {
      user = await User.create({ uid, email, displayName: finalDisplayName, photoURL: finalPhotoURL });
      console.log(`New user created: ${email}`);
    } else {
      user.lastLogin = new Date();
      if (!user.displayName && finalDisplayName) user.displayName = finalDisplayName;
      if (!user.photoURL && finalPhotoURL)    user.photoURL    = finalPhotoURL;
      await user.save();
    }

    res.json({ message: 'Authenticated', user });
  } catch (err) {
    console.error('loginOrRegister error:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { loginOrRegister, getMe };
