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
    // Handle redirect result if user just returned from login screen
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          try {
            const { data } = await authAPI.login();
            setProfile(data.user);
          } catch (e) {
            console.error('Auth sync failed from redirect:', e.message);
          }
        }
      })
      .catch((err) => console.error('Redirect result error:', err));

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
      setLoading(false);
    });
    return unsub;
  }, []);

  const loginWithGoogle = async () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
       // On mobile, popups are often blocked, redirect is safer
       return await signInWithRedirect(auth, googleProvider);
    } else {
       // On desktop, popups are a better UX
       const result = await signInWithPopup(auth, googleProvider);
       return result;
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
