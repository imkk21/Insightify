import { verifyFirebaseToken } from "../utils/verifyFirebaseToken.js";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = await verifyFirebaseToken(token);
      req.user = await User.findOne({ email: decoded.email }).select("-password");
      if (!req.user) return res.status(401).json({ message: "User not found" });
      next();
    } catch (error) {
      console.error("Auth Middleware Error:", error);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    res.status(401).json({ message: "No token, authorization denied" });
  }
};
