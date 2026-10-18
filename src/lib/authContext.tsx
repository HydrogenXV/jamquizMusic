import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  type AuthProfile,
  signInWithGoogle,
  signOutFirebase,
  listenToFirebaseUser,
  isFirebaseConfigured,
} from './firebase';
import {
  startSpotifyAuth,
  checkSpotifyCallback,
  logoutSpotify,
  isSpotifyConfigured,
} from './spotifyAuth';

interface AuthContextType {
  user: AuthProfile | null;
  loading: boolean;
  guestEntered: boolean;
  signInGoogle: () => Promise<void>;
  signInSpotify: () => Promise<void>;
  enterAsGuest: () => void;
  signOut: () => Promise<void>;
  isFirebaseConfigured: boolean;
  isSpotifyConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthProfile | null>(() => {
    const saved = localStorage.getItem('sq.auth.profile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [guestEntered, setGuestEntered] = useState(false);

  // Check Spotify callback or Firebase listener on mount
  useEffect(() => {
    let unmounted = false;

    const initAuth = async () => {
      // 1. Check if returning from Spotify OAuth
      const spotifyUser = await checkSpotifyCallback();
      if (!unmounted && spotifyUser) {
        setUser(spotifyUser);
        syncPlayerProfile(spotifyUser);
        setLoading(false);
        return;
      }

      // 2. Listen to Firebase Auth state (for Google login persistence)
      const unsub = listenToFirebaseUser((fbUser) => {
        if (unmounted) return;
        if (fbUser) {
          setUser(fbUser);
          localStorage.setItem('sq.auth.profile', JSON.stringify(fbUser));
          syncPlayerProfile(fbUser);
        } else if (user?.provider === 'google') {
          setUser(null);
          localStorage.removeItem('sq.auth.profile');
        }
        setLoading(false);
      });

      return () => {
        unmounted = true;
        unsub();
      };
    };

    initAuth();
  }, []);

  const syncPlayerProfile = (profile: AuthProfile) => {
    if (profile.displayName) {
      localStorage.setItem('sq.name', profile.displayName.slice(0, 18));
    }
  };

  const handleSignInGoogle = async () => {
    try {
      const profile = await signInWithGoogle();
      setUser(profile);
      localStorage.setItem('sq.auth.profile', JSON.stringify(profile));
      syncPlayerProfile(profile);
    } catch (err) {
      console.error('[Google Sign-In Error]', err);
      throw err;
    }
  };

  const handleSignInSpotify = async () => {
    try {
      const profile = await startSpotifyAuth();
      if (profile) {
        setUser(profile);
        syncPlayerProfile(profile);
      }
    } catch (err) {
      console.error('[Spotify Sign-In Error]', err);
      throw err;
    }
  };

  const handleEnterAsGuest = () => {
    setGuestEntered(true);
  };

  const handleSignOut = async () => {
    if (user?.provider === 'google') {
      await signOutFirebase();
    } else if (user?.provider === 'spotify') {
      logoutSpotify();
    }
    setUser(null);
    setGuestEntered(false);
    localStorage.removeItem('sq.auth.profile');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        guestEntered,
        signInGoogle: handleSignInGoogle,
        signInSpotify: handleSignInSpotify,
        enterAsGuest: handleEnterAsGuest,
        signOut: handleSignOut,
        isFirebaseConfigured: isFirebaseConfigured(),
        isSpotifyConfigured: isSpotifyConfigured(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
