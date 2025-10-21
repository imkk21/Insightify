import React, { useState } from "react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import axios from "axios";


const TestGoogleAuth = () => {
  const [user, setUser] = useState(null);
  const [serverResponse, setServerResponse] = useState(null);

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const idToken = credentialResponse.credential;
      const decoded = jwtDecode(idToken);
      setUser(decoded); // shows basic Google info immediately

      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/google`, {
        token: idToken,
      });

      setServerResponse(res.data);
      alert("✅ Google Login Successful");
      console.log("✅ Backend Response:", res.data);
    } catch (error) {
      console.error("❌ Google Login Failed:", error);
      alert("Google login failed, check console for details");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-gray-900">
      <h1 className="text-2xl font-bold mb-6">🔐 Test Google Login (Insightify)</h1>

      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => console.log("❌ Google Login Failed")}
        />
      </GoogleOAuthProvider>

      {user && (
        <div className="mt-6 p-4 bg-white rounded shadow text-left w-96">
          <h2 className="text-lg font-semibold mb-2">Google Token Info:</h2>
          <p><strong>Name:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Picture:</strong></p>
          <img src={user.picture} alt="profile" className="w-16 rounded-full" />
        </div>
      )}

      {serverResponse && (
        <div className="mt-6 p-4 bg-green-50 rounded shadow text-left w-96">
          <h2 className="text-lg font-semibold mb-2">Backend Response ✅</h2>
          <pre className="text-sm">{JSON.stringify(serverResponse, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default TestGoogleAuth;
