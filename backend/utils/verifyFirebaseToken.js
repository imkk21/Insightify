import admin from "firebase-admin";
import serviceAccount from "../config/firebase-service-account.json" assert { type: "json" };

// Initialize Firebase Admin SDK only once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Use named export in ESM style
export const verifyFirebaseToken = async (token) => {
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded;
  } catch (error) {
    console.error("❌ Invalid Firebase token:", error.message);
    return null;
  }
};

// ✅ Also export default for compatibility (optional)
export default { verifyFirebaseToken };
