import User from "../models/User.js";
import cloudinary from "../utils/cloudinary.js";

/* ============================================================
   📌 GET USER PROFILE
   ============================================================ */
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error) {
    console.error("Profile Fetch Error:", error);
    res.status(500).json({ message: "Error fetching user profile" });
  }
};

/* ============================================================
   ✏️ UPDATE USER PROFILE (Name + Avatar URL)
   ============================================================ */
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update fields if provided
    if (req.body.name) user.name = req.body.name;
    if (req.body.avatar) user.avatar = req.body.avatar;

    const updatedUser = await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        provider: updatedUser.provider,
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ message: "Error updating profile" });
  }
};

/* ============================================================
   🖼️ UPLOAD USER AVATAR (Cloudinary)
   ============================================================ */
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "insightify_avatars",
        transformation: [{ width: 200, height: 200, crop: "fill" }],
      },
      async (error, result) => {
        if (error) {
          console.error("Cloudinary Error:", error);
          return res.status(500).json({ message: "Cloudinary upload failed" });
        }

        // ✅ Update DB avatar URL
        const user = await User.findById(req.user._id);
        user.avatar = result.secure_url;
        await user.save();

        return res.json({
          message: "Avatar updated successfully!",
          avatar: result.secure_url,
        });
      }
    );

    // ✅ Use buffer instead of stream
    uploadStream.end(req.file.buffer);

  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ message: "Error uploading image" });
  }
};
