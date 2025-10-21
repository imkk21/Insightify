import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { verifyFirebaseToken } from "../utils/verifyFirebaseToken.js";

/**
 * @desc Google Login via Firebase
 * @route POST /api/auth/google
 */
export const googleLogin = async (req, res) => {
  const { token } = req.body;

  try {
    // Verify token using Firebase Admin SDK
    const decoded = await verifyFirebaseToken(token);
    if (!decoded) {
      return res.status(401).json({ message: "Invalid or expired Firebase token" });
    }

    const { name, email, picture } = decoded;

    // Find or create user in MongoDB
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        avatar: picture,
        provider: "google",
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      token: generateToken(user._id),
    });
  } catch (err) {
    console.error("❌ Firebase Google Login Error:", err.message);
    res.status(500).json({ message: "Firebase Google login failed" });
  }
};
