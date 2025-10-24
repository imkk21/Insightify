import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.js";

import {
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/profile", protect, getUserProfile);
router.put("/update", protect, updateUserProfile);
router.post("/upload-avatar", protect, upload.single("avatar"), uploadAvatar);

export default router;
