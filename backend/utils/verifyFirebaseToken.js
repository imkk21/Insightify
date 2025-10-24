import admin from "firebase-admin";
import serviceAccount from "../config/firebase-service-account.json" assert { type: "json" };

// ✅ Initialize Firebase Admin SDK (only once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

/**
 * ✅ Verify Firebase ID Token and Email Verification
 * This function ensures:
 * - Token validity
 * - Email verification (for email/password users)
 */
export const verifyFirebaseToken = async (token) => {
  try {
    const decoded = await admin.auth().verifyIdToken(token);

    // 🚨 Enforce email verification for email/password users
    if (decoded.firebase?.sign_in_provider === "password" && !decoded.email_verified) {
      throw new Error("Email not verified. Please verify your email before accessing this resource.");
    }

    return decoded;
  } catch (error) {
    console.error("❌ Firebase token verification failed:", error.message);
    throw new Error(error.message || "Invalid or expired Firebase token");
  }
};

// ✅ Default export (optional)
export default { verifyFirebaseToken };
