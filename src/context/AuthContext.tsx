import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  fbSignOut, 
  onAuthStateChanged, 
  type User 
} from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  idToken: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  isDemoUser: boolean;
  loginAsDemoUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simulated demo user for offline or constrained environments
const DEMO_USER: any = {
  uid: 'demo_reflect_user_8048',
  displayName: 'Junaid Rahman',
  email: 'malikjunaidurrahman@gmail.com',
  photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  getIdToken: async () => 'demo_valid_token_' + Date.now(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemoUser, setIsDemoUser] = useState(false);

  useEffect(() => {
    // Check if demo user was active
    const savedDemo = localStorage.getItem('reflectai_demo_session');
    if (savedDemo === 'true') {
      setUser(DEMO_USER);
      setIsDemoUser(true);
      setIdToken('demo_token_' + DEMO_USER.uid);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsDemoUser(false);
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken();
          setIdToken(token);
        } catch (err) {
          console.error('[Auth] Failed to get initial ID token:', err);
        }
      } else {
        setIdToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      setUser(result.user);
      setIdToken(token);
      setIsDemoUser(false);
      localStorage.removeItem('reflectai_demo_session');
    } catch (err: any) {
      console.warn('[Auth] Google Sign-In popup notice:', err);
      // If popup was closed or iframe blocked popups, offer helpful error
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        setError('Popup was blocked by the browser. You may enable popups or try Demo Access.');
      } else {
        setError(err?.message || 'Authentication failed. Please try again.');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginAsDemoUser = () => {
    setUser(DEMO_USER);
    setIsDemoUser(true);
    setIdToken('demo_token_' + DEMO_USER.uid);
    localStorage.setItem('reflectai_demo_session', 'true');
    setLoading(false);
  };

  const signOut = async () => {
    setLoading(true);
    try {
      if (isDemoUser) {
        localStorage.removeItem('reflectai_demo_session');
        setUser(null);
        setIdToken(null);
        setIsDemoUser(false);
      } else {
        await fbSignOut(auth);
        setUser(null);
        setIdToken(null);
      }
    } catch (err: any) {
      console.error('[Auth] Sign-out error:', err);
      setError(err?.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    if (isDemoUser) {
      return 'demo_token_' + DEMO_USER.uid;
    }
    if (user) {
      try {
        const token = await user.getIdToken(true);
        setIdToken(token);
        return token;
      } catch (err) {
        console.error('[Auth] Error refreshing ID token:', err);
        return idToken;
      }
    }
    return null;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      idToken,
      signInWithGoogle,
      signOut,
      getIdToken,
      isDemoUser,
      loginAsDemoUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
