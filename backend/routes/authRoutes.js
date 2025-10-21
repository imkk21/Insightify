import express from "express";
import { googleLogin } from "../controllers/authController.js";

const router = express.Router();

// Firebase Google Auth route
router.post("/google", googleLogin);

export default router;
