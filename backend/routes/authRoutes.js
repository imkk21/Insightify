import express from "express";
import { firebaseLogin, googleLogin } from "../controllers/authController.js";

const router = express.Router();

// ✅ Firebase Email/Password Login (and registration auto handled)
router.post("/firebase-login", firebaseLogin);

// ✅ Google Login
router.post("/google", googleLogin);

export default router;
