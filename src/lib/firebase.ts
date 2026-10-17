import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User as FirebaseUser
} from 'firebase/auth';

export interface AuthProfile {
  uid: string;
  displayName: string;
  email: string | null;
  photoURL: string | null;
  provider: 'google' | 'spotify' | 'guest';
}

// Retrieve Firebase Config from Vite ENV (with fallback)
export function getFirebaseConfig() {
  const env = import.meta.env;
  return {
    apiKey: env.VITE_FIREBASE_API_KEY || localStorage.getItem('sq.fb.apiKey') || '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || localStorage.getItem('sq.fb.authDomain') || '',
    projectId: env.VITE_FIREBASE_PROJECT_ID || localStorage.getItem('sq.fb.projectId') || '',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || localStorage.getItem('sq.fb.storageBucket') || '',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || localStorage.getItem('sq.fb.messagingSenderId') || '',
    appId: env.VITE_FIREBASE_APP_ID || localStorage.getItem('sq.fb.appId') || '',
  };
}

export function isFirebaseConfigured(): boolean {
  const cfg = getFirebaseConfig();
  return Boolean(cfg.apiKey && cfg.projectId && cfg.apiKey !== 'YOUR_API_KEY');
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

function getFirebaseAuth(): Auth | null {
  if (auth) return auth;
  const cfg = getFirebaseConfig();
  if (!cfg.apiKey || !cfg.projectId || cfg.apiKey === 'YOUR_API_KEY') {
    return null;
  }
  try {
    app = getApps().length === 0 ? initializeApp(cfg) : getApps()[0];
    auth = getAuth(app);
    return auth;
  } catch (err) {
    console.warn('[Firebase] Init failed:', err);
    return null;
  }
}

/**
 * Sign in with Google Popup.
 * If Firebase is configured with real credentials, triggers GoogleAuthProvider popup.
 * If running in local demo without keys, provides demo Google sign-in.
 */
export async function signInWithGoogle(): Promise<AuthProfile> {
  const fbAuth = getFirebaseAuth();

  if (fbAuth) {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    const result = await signInWithPopup(fbAuth, provider);
    const user = result.user;
    return {
      uid: user.uid,
      displayName: user.displayName || 'Google Gamer',
      email: user.email,
      photoURL: user.photoURL,
      provider: 'google',
    };
  }

  // Graceful Demo Google Sign-In for instant testing
  const demoEmail = 'user@gmail.com';
  const demoProfile: AuthProfile = {
    uid: 'google-demo-' + Math.random().toString(36).slice(2, 8),
    displayName: 'Google Player',
    email: demoEmail,
    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    provider: 'google',
  };
  return demoProfile;
}

export async function signOutFirebase(): Promise<void> {
  const fbAuth = getFirebaseAuth();
  if (fbAuth) {
    await signOut(fbAuth);
  }
}

export function listenToFirebaseUser(callback: (user: AuthProfile | null) => void): () => void {
  const fbAuth = getFirebaseAuth();
  if (!fbAuth) {
    return () => {};
  }
  return onAuthStateChanged(fbAuth, (user: FirebaseUser | null) => {
    if (user) {
      callback({
        uid: user.uid,
        displayName: user.displayName || 'Google User',
        email: user.email,
        photoURL: user.photoURL,
        provider: 'google',
      });
    } else {
      callback(null);
    }
  });
}
