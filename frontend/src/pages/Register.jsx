import { useState } from "react";
import {
  auth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "../firebase/firebaseConfig";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      await sendEmailVerification(userCredential.user);

      setMessage(
        "✅ Registration successful! A verification email has been sent. Please verify before logging in."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
      <h2>Create Account</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="name"
          placeholder="Full Name"
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
          name="email"
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
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>

      {message && <p style={{ color: "green", marginTop: "10px" }}>{message}</p>}
      {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
    </div>
  );
}
