import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String },
  provider: { type: String, enum: ["local", "google"], default: "local" },
  avatar: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// ✅ Default export for ESM
const User = mongoose.model("User", userSchema);
export default User;
