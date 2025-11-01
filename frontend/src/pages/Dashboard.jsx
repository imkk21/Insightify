import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { auth } from "../firebase/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import ImageUploader from "../components/ImageUploader"; // ✅ IMPORT

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

export default function Dashboard() {
  const { logout } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ name: "", avatar: "" });
  const [successMsg, setSuccessMsg] = useState("");

  // ✅ Wait for Firebase auth state to load before fetching profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setError("No authenticated user found.");
        setLoading(false);
        return;
      }

      try {
        const token = await currentUser.getIdToken();
        const res = await axios.get(`${BASE_URL}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setProfile(res.data);
        setFormData({
          name: res.data.name || "",
          avatar: res.data.avatar || "",
        });
      } catch (err) {
        console.error("Profile fetch error:", err);
        setError(err.response?.data?.message || "Failed to fetch profile");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // ✅ Handle input changes
  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // ✅ Update profile values (name & avatar fields)
  const handleUpdate = async () => {
    setError("");
    setSuccessMsg("");

    try {
      const token = await auth.currentUser.getIdToken();
      const res = await axios.put(`${BASE_URL}/api/user/update`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setProfile(res.data.user);
      setSuccessMsg("Profile updated successfully!");
      setEditing(false);
    } catch (err) {
      console.error("Update error:", err);
      setError(err.response?.data?.message || "Failed to update profile");
    }
  };

  // ✅ Logout
  const handleLogout = async () => {
    await auth.signOut();
    logout();
    window.location.href = "/login";
  };

  // ✅ Loading UI
  if (loading)
    return <p style={{ textAlign: "center" }}>Loading your dashboard...</p>;

  // ✅ Error UI
  if (error)
    return (
      <div style={{ textAlign: "center" }}>
        <h2>Error</h2>
        <p style={{ color: "red" }}>{error}</p>
        <button onClick={handleLogout}>Go to Login</button>
      </div>
    );

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "40px auto",
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        background: "#fff",
      }}
    >
      <h2 style={{ textAlign: "center" }}>
        Welcome, {profile?.name || "User"} 👋
      </h2>

      {/* Avatar Display + Upload */}
      <div style={{ textAlign: "center" }}>
        <img
          src={
            formData.avatar ||
            profile?.avatar ||
            "https://via.placeholder.com/100?text=Avatar"
          }
          alt="avatar"
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            margin: "10px auto",
            objectFit: "cover",
          }}
        />

        {/* ✅ Cloudinary Upload Component */}
        <ImageUploader
          onUploadSuccess={(url) => {
            setProfile((prev) => ({ ...prev, avatar: url }));
            setFormData((prev) => ({ ...prev, avatar: url }));
          }}
        />
      </div>

      {/* ✅ Edit Mode */}
      {editing ? (
        <div style={{ marginTop: "15px" }}>
          <label>
            <strong>Name:</strong>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "8px",
                margin: "6px 0",
                borderRadius: "6px",
                border: "1px solid #ccc",
              }}
            />
          </label>

          <label>
            <strong>Avatar URL:</strong>
            <input
              type="text"
              name="avatar"
              value={formData.avatar}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "8px",
                margin: "6px 0",
                borderRadius: "6px",
                border: "1px solid #ccc",
              }}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button
              onClick={handleUpdate}
              style={{
                marginTop: "10px",
                padding: "10px 15px",
                backgroundColor: "#28a745",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              style={{
                marginTop: "10px",
                padding: "10px 15px",
                backgroundColor: "#6c757d",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p>
            <strong>Email:</strong> {profile?.email}
          </p>
          <p>
            <strong>Provider:</strong> {profile?.provider}
          </p>
          <p>
            <strong>Joined:</strong>{" "}
            {new Date(profile?.createdAt).toLocaleDateString()}
          </p>

          <button
            onClick={() => setEditing(true)}
            style={{
              marginTop: "15px",
              width: "100%",
              padding: "10px",
              backgroundColor: "#ffc107",
              color: "#000",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Edit Profile
          </button>
        </>
      )}

      {successMsg && (
        <p
          style={{
            color: "green",
            marginTop: "10px",
            textAlign: "center",
          }}
        >
          {successMsg}
        </p>
      )}

      {error && !loading && (
        <p
          style={{
            color: "red",
            marginTop: "10px",
            textAlign: "center",
          }}
        >
          {error}
        </p>
      )}

      <button
        onClick={handleLogout}
        style={{
          marginTop: "20px",
          width: "100%",
          padding: "10px",
          border: "none",
          borderRadius: "6px",
          backgroundColor: "#007bff",
          color: "#fff",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        Logout
      </button>
      <button
  onClick={() => (window.location.href = "/change-password")}
  style={{
    marginTop: "10px",
    width: "100%",
    padding: "10px",
    border: "none",
    borderRadius: "6px",
    backgroundColor: "#6f42c1",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
  }}
>
  Change Password
</button>

    </div>
  );
}
