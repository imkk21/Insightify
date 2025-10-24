import User from "../models/User.js";
import { verifyFirebaseToken } from "../utils/verifyFirebaseToken.js";

/* ============================================================
   🔐 Firebase Email/Password Authentication
   ============================================================ */

/**
 * ✅ Handles Firebase Email/Password login & registration
 * - Ensures email verification before user creation
 * - Creates MongoDB user only after verification
 */
export const firebaseLogin = async (req, res) => {
  try {
    const { token } = req.body;
    const decoded = await verifyFirebaseToken(token);

    // 🚫 Block unverified email/password users
    if (decoded.firebase?.sign_in_provider === "password" && !decoded.email_verified) {
      return res
        .status(403)
        .json({ message: "Please verify your email before logging in." });
    }

    const { name, email, picture } = decoded;

    // ✅ Check if user already exists in MongoDB
    let user = await User.findOne({ email });

    // 🆕 If not, create a new record (only after verified)
    if (!user) {
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        avatar: picture || "",
        provider: "firebase",
      });
    }

    res.status(200).json({
      message: "Firebase login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        provider: user.provider,
      },
    });
  } catch (error) {
    console.error("Firebase Login Error:", error);
    res.status(500).json({ message: "Error during Firebase login" });
  }
};

/* ============================================================
   🌐 Google Authentication via Firebase
   ============================================================ */

export const googleLogin = async (req, res) => {
  const { token } = req.body;

  try {
    const decoded = await verifyFirebaseToken(token);
    if (!decoded)
      return res
        .status(401)
        .json({ message: "Invalid or expired Firebase token" });

    const { name, email, picture } = decoded;

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
      message: "Google login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        provider: user.provider,
      },
    });
  } catch (error) {
    console.error("Firebase Google Login Error:", error.message);
    res.status(500).json({ message: "Server error during Google login" });
  }
};
