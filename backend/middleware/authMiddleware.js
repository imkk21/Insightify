const { admin } = require('../config/firebase');

/**
 * Middleware: verify Firebase ID token from Authorization header.
 * Attaches decoded token to req.user.
 */
const verifyToken = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized – no token provided' });
  }

  const token = header.split(' ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded; // { uid, email, name, ... }
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return res.status(401).json({ error: 'Unauthorized – invalid or expired token' });
  }
};

module.exports = { verifyToken };
