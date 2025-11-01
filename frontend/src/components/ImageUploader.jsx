import { useState } from "react";
import axios from "axios";
import { auth } from "../firebase/firebaseConfig";

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

export default function ImageUploader({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleUpload = async () => {
    if (!file) return setMessage("Please choose an image");

    try {
      const token = await auth.currentUser.getIdToken();
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await axios.post(`${BASE_URL}/api/user/upload-avatar`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setMessage("✅ Avatar Uploaded");
      onUploadSuccess(res.data.avatar);
    } catch (err) {
      console.error(err);
      setMessage("❌ Upload failed");
    }
  };

  return (
    <div style={{ marginTop: "15px" }}>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <button
        onClick={handleUpload}
        style={{
          marginLeft: "10px",
          backgroundColor: "#28a745",
          color: "#fff",
          padding: "6px 12px",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Upload
      </button>

      {message && <p style={{ marginTop: "6px" }}>{message}</p>}
    </div>
  );
}
