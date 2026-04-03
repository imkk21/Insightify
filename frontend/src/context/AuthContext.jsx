import { createContext, useContext, useEffect, useState } from 'react';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Single source of truth for auth state
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const { data } = await authAPI.login();
          setProfile(data.user);
        } catch (e) {
          console.error('Auth sync failed:', e.message);
        }
      } else {
        setProfile(null);
      }
      // Only release loading when initial auth check is definitely complete
      setLoading(false);
    });

    return unsub;
  }, []);

  const loginWithGoogle = async () => {
    try {
      // Use Popup for all platforms – avoids Missing Initial State errors on Vercel/Firebase
      return await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code === 'auth/popup-blocked') {
        alert('Login popup was blocked. Please enable popups for this site or open directly in your browser (not inside Instagram/GitHub).');
      }
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const refreshProfile = async () => {
    try {
      const { data } = await authAPI.getMe();
      setProfile(data);
    } catch { /* silent */ }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginWithGoogle, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
