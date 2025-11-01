import { useState } from "react";
import { auth } from "../firebase/firebaseConfig";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateEmail,
  sendEmailVerification,
} from "firebase/auth";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

export default function ChangeEmail() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const user = auth.currentUser;
      if (!user) {
        setError("No authenticated user found.");
        return;
      }

      // ✅ Reauthenticate user before sensitive changes
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      // ✅ Update email in Firebase
      await updateEmail(user, newEmail);

      // ✅ Send verification link
      await sendEmailVerification(user);

      // ✅ Update email in MongoDB backend
      const token = await user.getIdToken();
      await axios.put(
        `${BASE_URL}/api/user/update`,
        { email: newEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage(
        "✅ Email updated successfully! A verification link has been sent to your new email."
      );
      setCurrentPassword("");
      setNewEmail("");
    } catch (err) {
      console.error("Email update error:", err);
      setError(err.message || "Error updating email.");
    }
  };

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "50px auto",
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "10px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        textAlign: "center",
      }}
    >
      <h2>Change Email</h2>

      <form onSubmit={handleChangeEmail}>
        <input
          type="password"
          placeholder="Current Password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px",
            margin: "8px 0",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        />

        <input
          type="email"
          placeholder="New Email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "10px",
            margin: "8px 0",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        />

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            marginTop: "10px",
          }}
        >
          Update Email
        </button>
      </form>

      {message && <p style={{ color: "green", marginTop: "10px" }}>{message}</p>}
      {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
    </div>
  );
}
