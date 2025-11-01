import { useState, useContext } from "react";
import axios from "axios";
import {
  auth,
  provider,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendEmailVerification,
} from "../firebase/firebaseConfig";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

export default function Login() {
  const { login } = useContext(AuthContext);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState(null);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // ✅ Email/Password Login with Verification Check
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      const user = userCredential.user;

      // 🔒 Check if email is verified
      if (!user.emailVerified) {
        setUnverifiedUser(user);
        setError("Please verify your email before logging in.");
        await auth.signOut();
        setLoading(false);
        return;
      }

      // ✅ Get Firebase token and authenticate with backend
      const token = await user.getIdToken();
      const res = await axios.post(`${BASE_URL}/api/auth/firebase-login`, {
        token,
      });

      login(res.data);
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Google Login
  const handleGoogleLogin = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken();
      const res = await axios.post(`${BASE_URL}/api/auth/google`, { token });
      login(res.data);
      window.location.href = "/dashboard";
    } catch (err) {
      console.error("Google login error:", err);
      setError("Google login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Resend verification email
  const handleResendVerification = async () => {
    if (!unverifiedUser) return;
    try {
      await sendEmailVerification(unverifiedUser);
      setMessage("✅ Verification email resent! Check your inbox.");
      setError("");
    } catch (err) {
      console.error("Resend error:", err);
      setError("Failed to resend verification email. Try again later.");
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
      }}
    >
      <h2 style={{ textAlign: "center" }}>Login to Insightify</h2>

      <form onSubmit={handleLogin} style={{ marginTop: "20px" }}>
        <input
          name="email"
          type="email"
          placeholder="Email"
          onChange={handleChange}
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
          name="password"
          type="password"
          placeholder="Password"
          onChange={handleChange}
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
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "10px",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        style={{
          width: "100%",
          padding: "10px",
          marginTop: "10px",
          backgroundColor: "#db4437",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        {loading ? "Please wait..." : "Sign in with Google"}
      </button>

      {/* 🔁 Resend Verification Email */}
      {unverifiedUser && (
        <div style={{ textAlign: "center", marginTop: "15px" }}>
          <button
            onClick={handleResendVerification}
            style={{
              background: "none",
              border: "none",
              color: "#007bff",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Resend verification email
          </button>
        </div>
      )}

      {/* 🔗 Forgot Password Link */}
      <div style={{ textAlign: "center", marginTop: "15px" }}>
        <Link to="/forgot-password" style={{ color: "#007bff" }}>
          Forgot Password?
        </Link>
      </div>

      {/* 🔗 Register Link */}
      <div style={{ textAlign: "center", marginTop: "10px" }}>
        <p>
          Don’t have an account?{" "}
          <Link to="/register" style={{ color: "#007bff" }}>
            Register
          </Link>
        </p>
      </div>

      {message && (
        <p style={{ color: "green", textAlign: "center", marginTop: "10px" }}>
          {message}
        </p>
      )}
      {error && (
        <p style={{ color: "red", textAlign: "center", marginTop: "10px" }}>
          {error}
        </p>
      )}
    </div>
  );
}
