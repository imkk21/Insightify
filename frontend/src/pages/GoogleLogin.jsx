import React, { useState } from "react";
import { auth, provider, signInWithPopup } from "../firebaseConfig";
import axios from "axios";

const GoogleLogin = () => {
  const [user, setUser] = useState(null);
  const [serverResponse, setServerResponse] = useState(null);

  const handleGoogleLogin = async () => {
    try {
      // Step 1: Firebase popup login
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken(); // Firebase ID token
      const { displayName, email, photoURL } = result.user;

      setUser({ displayName, email, photoURL });

      // Step 2: Send token to backend
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/google`, {
        token,
      });

      // Step 3: Store backend JWT
      localStorage.setItem("insightify_token", res.data.token);
      setServerResponse(res.data);

      alert("✅ Login successful!");
      console.log("Backend Response:", res.data);
    } catch (error) {
      console.error("❌ Google login failed:", error);
      alert("Google login failed. Check console for details.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-900">
      <h1 className="text-2xl font-bold mb-6">Sign in to Insightify</h1>

      <button
        onClick={handleGoogleLogin}
        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
      >
        <img
          src="https://developers.google.com/identity/images/g-logo.png"
          alt="google"
          className="w-5 h-5"
        />
        Sign in with Google
      </button>

      {user && (
        <div className="mt-6 bg-white p-4 rounded shadow w-80 text-left">
          <h2 className="text-lg font-semibold mb-2">User Info (Firebase):</h2>
          <p><strong>Name:</strong> {user.displayName}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <img src={user.photoURL} alt="profile" className="w-16 rounded-full mt-2" />
        </div>
      )}

      {serverResponse && (
        <div className="mt-6 bg-green-50 p-4 rounded shadow w-80 text-left">
          <h2 className="text-lg font-semibold mb-2">Backend Response ✅</h2>
          <pre className="text-xs bg-gray-50 p-2 rounded">{JSON.stringify(serverResponse, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default GoogleLogin;
