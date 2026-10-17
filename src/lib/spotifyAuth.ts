import type { AuthProfile } from './firebase';

export function getSpotifyConfig() {
  const env = import.meta.env;
  const clientId = env.VITE_SPOTIFY_CLIENT_ID || localStorage.getItem('sq.spotify.clientId') || '';

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const isLocal = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Check if user manually saved a preference in localStorage
  const customUri = localStorage.getItem('sq.spotify.redirectUri');
  if (customUri) {
    return { clientId, redirectUri: customUri };
  }

  const envUri = env.VITE_SPOTIFY_REDIRECT_URI;
  if (envUri) {
    // If developing locally on localhost/127.0.0.1 and envUri points to a remote domain,
    // use the active localhost origin so OAuth redirects back to the local dev server.
    if (isLocal && !envUri.includes('localhost') && !envUri.includes('127.0.0.1')) {
      return { clientId, redirectUri: `${origin}/` };
    }
    return { clientId, redirectUri: envUri };
  }

  return {
    clientId,
    redirectUri: `${origin}/`,
  };
}

export function isSpotifyConfigured(): boolean {
  const { clientId } = getSpotifyConfig();
  return Boolean(clientId && clientId !== 'YOUR_SPOTIFY_CLIENT_ID');
}

// Generate PKCE code verifier and challenge
function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(a: ArrayBuffer): string {
  return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(a))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Initiates Spotify OAuth PKCE flow.
 * If Spotify Client ID is configured, redirects to Spotify.
 * If not configured, provides an immediate Demo Spotify profile.
 */
export async function startSpotifyAuth(): Promise<AuthProfile | null> {
  const { clientId, redirectUri } = getSpotifyConfig();

  if (!clientId || clientId === 'YOUR_SPOTIFY_CLIENT_ID') {
    // Instant Demo Spotify Account for immediate testing
    const demoProfile: AuthProfile = {
      uid: 'spotify-demo-' + Math.random().toString(36).slice(2, 8),
      displayName: 'Spotify Maestro',
      email: 'dj.maestro@spotify.com',
      photoURL: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=150&auto=format&fit=crop&q=80',
      provider: 'spotify',
    };
    localStorage.setItem('sq.auth.profile', JSON.stringify(demoProfile));
    localStorage.setItem('sq.spotify.token', 'mock_spotify_token_12345');
    return demoProfile;
  }

  const verifier = generateRandomString(64);
  const challenge = base64urlencode(await sha256(verifier));

  window.sessionStorage.setItem('spotify_verifier', verifier);
  window.sessionStorage.setItem('spotify_redirect_uri', redirectUri);

  const scope = [
    'user-read-private',
    'user-read-email',
    'playlist-read-private',
    'playlist-read-collaborative'
  ].join(' ');

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('code_challenge', challenge);

  window.location.href = authUrl.toString();
  return null;
}

/**
 * Handle redirect back from Spotify Authorization
 */
export async function checkSpotifyCallback(): Promise<AuthProfile | null> {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');

  if (error) {
    console.error('[Spotify Auth Error]', error);
    cleanUrl();
    return null;
  }

  if (!code) return null;

  const verifier = window.sessionStorage.getItem('spotify_verifier');
  const storedRedirectUri = window.sessionStorage.getItem('spotify_redirect_uri');
  const { clientId, redirectUri: fallbackUri } = getSpotifyConfig();
  const redirectUri = storedRedirectUri || fallbackUri;

  if (!verifier || !clientId) {
    cleanUrl();
    return null;
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    });

    const data = await response.json();
    if (data.access_token) {
      localStorage.setItem('sq.spotify.token', data.access_token);
      window.sessionStorage.removeItem('spotify_verifier');
      window.sessionStorage.removeItem('spotify_redirect_uri');

      // Fetch user profile from Spotify
      const profileRes = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      const profileData = await profileRes.json();

      const profile: AuthProfile = {
        uid: profileData.id,
        displayName: profileData.display_name || 'Spotify Listener',
        email: profileData.email || null,
        photoURL: profileData.images?.[0]?.url || 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=150&auto=format&fit=crop&q=80',
        provider: 'spotify',
      };

      localStorage.setItem('sq.auth.profile', JSON.stringify(profile));
      cleanUrl();
      return profile;
    } else if (data.error) {
      console.error('[Spotify Token Error]', data.error_description || data.error);
    }
  } catch (err) {
    console.error('[Spotify Token Exchange Failed]', err);
  }

  cleanUrl();
  return null;
}

function cleanUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('error');
  url.searchParams.delete('state');
  window.history.replaceState({}, document.title, url.pathname + url.hash);
}

export function getSpotifyToken(): string | null {
  return localStorage.getItem('sq.spotify.token');
}

export function logoutSpotify(): void {
  localStorage.removeItem('sq.spotify.token');
  localStorage.removeItem('sq.auth.profile');
}
