import jwt from "jsonwebtoken";

// ✅ Default export for ESM compatibility
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

export default generateToken;
