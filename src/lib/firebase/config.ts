/**
 * Firebase Client Configuration
 *
 * Client-side Firebase SDK initialization for browser use.
 * Uses lazy initialization to prevent SSR/build-time errors.
 */

import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

/**
 * Firebase client configuration from environment variables
 */
function getFirebaseConfig() {
  // Validate required environment variables
  const requiredVars = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    // During SSR/build, return a minimal config to prevent errors
    // The actual initialization will happen on the client
    return null;
  }

  // Validate that all required vars are present
  const missingVars = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.warn(`Missing Firebase environment variables: ${missingVars.join(', ')}`);
    return null;
  }

  return requiredVars;
}

/**
 * Get or initialize Firebase app (singleton pattern, client-side only)
 */
async function getFirebaseApp(): Promise<FirebaseApp | null> {
  // Only initialize on client side
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const { initializeApp, getApps, getApp } = await import('firebase/app');
    
    if (getApps().length > 0) {
      return getApp();
    }

    const config = getFirebaseConfig();
    if (!config) {
      console.error('Firebase configuration is missing. Cannot initialize Firebase.');
      return null;
    }

    return initializeApp(config);
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    return null;
  }
}

// Lazy initialization - only initialize when actually accessed on client side
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;
let _initPromise: Promise<void> | null = null;

async function ensureInitialized(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (_app && _db && _storage) return; // Already fully initialized
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      _app = await getFirebaseApp();
      if (_app) {
        const [{ getAuth }, { getFirestore }, { getStorage }] = await Promise.all([
          import('firebase/auth'),
          import('firebase/firestore'),
          import('firebase/storage'),
        ]);
        _auth = getAuth(_app);
        _db = getFirestore(_app);
        _storage = getStorage(_app);
        
        console.log('[Firebase Config] Initialization complete:', {
          hasApp: !!_app,
          hasAuth: !!_auth,
          hasDb: !!_db,
          hasStorage: !!_storage,
        });
      } else {
        console.error('[Firebase Config] Failed to get Firebase app instance');
        throw new Error('Firebase app initialization failed');
      }
    } catch (error) {
      console.error('[Firebase Config] Failed to initialize Firebase services:', error);
      throw error; // Re-throw so callers know initialization failed
    }
  })();

  return _initPromise;
}

// Synchronous getters that return null during SSR/build
// They will be initialized on first access in the browser
function getAppSync(): FirebaseApp | null {
  if (typeof window === 'undefined') return null;
  if (!_app && typeof window !== 'undefined') {
    // Trigger async initialization
    ensureInitialized().catch(console.error);
  }
  return _app;
}

function getAuthSync(): Auth | null {
  if (typeof window === 'undefined') return null;
  if (!_auth && typeof window !== 'undefined') {
    ensureInitialized().catch(console.error);
  }
  return _auth;
}

function getDbSync(): Firestore | null {
  if (typeof window === 'undefined') return null;
  // Return the cached instance if available
  return _db;
}

function getStorageSync(): FirebaseStorage | null {
  if (typeof window === 'undefined') return null;
  if (!_storage && typeof window !== 'undefined') {
    ensureInitialized().catch(console.error);
  }
  return _storage;
}

// Export getters that are truly lazy - only execute when property is accessed
// During build/SSR, these will return null without executing any Firebase code
// Using a getter pattern to ensure they're only called when accessed
const createLazyGetter = <T>(getter: () => T | null): T | null => {
  if (typeof window === 'undefined') return null;
  return getter();
};

export const app = createLazyGetter(getAppSync) as FirebaseApp | null;
export const auth = createLazyGetter(getAuthSync) as Auth | null;
export const db = createLazyGetter(getDbSync) as Firestore | null;
export const storage = createLazyGetter(getStorageSync) as FirebaseStorage | null;

// Also export async initialization function for components that need to wait
export { ensureInitialized };

// Export a function to get the db instance after initialization
export async function getDbAfterInit(): Promise<Firestore | null> {
  await ensureInitialized();
  return _db;
}
