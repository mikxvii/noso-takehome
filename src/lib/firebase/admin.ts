/**
 * Firebase Admin SDK Configuration
 *
 * Server-side Firebase Admin SDK initialization for API routes.
 * Uses service account credentials for privileged operations.
 */

import * as admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Initialize Firebase Admin SDK (singleton pattern with lazy initialization)
 *
 * Supports two methods:
 * 1. File-based: Use firebase-service-account.json in project root (for local dev)
 * 2. Env var: Use FIREBASE_SERVICE_ACCOUNT_KEY env var with JSON string (for production)
 */
function initializeFirebaseAdmin() {
  // Check if already initialized
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Service account JSON uses snake_case (private_key) but TypeScript type uses camelCase
  // So we'll use 'any' type and let Firebase SDK handle the conversion
  let serviceAccount: any;

  // Try to load from file first (for local development)
  const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    try {
      const fileContents = fs.readFileSync(serviceAccountPath, 'utf8');
      serviceAccount = JSON.parse(fileContents);
      console.log('Loaded Firebase service account from file');
    } catch (error) {
      throw new Error(
        `Failed to parse firebase-service-account.json: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  } else {
    // Fall back to environment variable (for production/Vercel)
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountJson) {
      console.warn(
        'FIREBASE_SERVICE_ACCOUNT_KEY not set and firebase-service-account.json not found. ' +
        'Admin SDK will not be initialized. This is expected during build time.'
      );
      // Return a mock app for build time
      return null as any;
    }

    try {
      serviceAccount = JSON.parse(serviceAccountJson);
      // Normalize the private key field - handle escaped newlines
      // When stored in env vars, newlines might be escaped in various ways
      if (serviceAccount.private_key) {
        let privateKey = serviceAccount.private_key;
        
        // Handle different escape formats:
        // 1. Literal \n strings (most common in env vars)
        privateKey = privateKey.replace(/\\n/g, '\n');
        
        // 2. Already has newlines but might have extra escaping
        // 3. Handle cases where BEGIN/END markers might be on same line
        // Ensure proper formatting for PEM format
        if (!privateKey.includes('\n') && privateKey.includes('-----BEGIN')) {
          // If no newlines but has BEGIN marker, try to add them
          privateKey = privateKey.replace(/-----BEGIN/g, '\n-----BEGIN');
          privateKey = privateKey.replace(/-----END/g, '-----END\n');
          privateKey = privateKey.replace(/\n\n/g, '\n'); // Remove double newlines
        }
        
        serviceAccount.private_key = privateKey;
        
        // Validate the private key format
        if (!serviceAccount.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
          console.warn('Private key may not be properly formatted. Expected PEM format with BEGIN/END markers.');
        }
      }
    } catch (error) {
      const parseError = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it is valid JSON. Error: ${parseError}`
      );
    }
  }

  // Initialize with service account using admin.credential.cert()
  try {
    // Log a sample of the private key for debugging (first 50 chars only)
    if (serviceAccount.private_key) {
      const keyPreview = serviceAccount.private_key.substring(0, 50);
      const hasNewlines = serviceAccount.private_key.includes('\n');
      console.log('[Firebase Admin] Private key preview:', keyPreview + '...');
      console.log('[Firebase Admin] Private key has newlines:', hasNewlines);
      console.log('[Firebase Admin] Private key length:', serviceAccount.private_key.length);
    }
    
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('private key') || errorMessage.includes('PEM')) {
      throw new Error(
        'Failed to parse Firebase service account private key. ' +
        'Ensure the private_key field is properly formatted with actual newlines. ' +
        'The private key should look like: "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n" ' +
        `Original error: ${errorMessage}`
      );
    }
    throw error;
  }
}

// Lazy getters for admin SDK instances
let _adminApp: admin.app.App | null = null;

function getAdminApp() {
  if (!_adminApp) {
    _adminApp = initializeFirebaseAdmin();
  }
  return _adminApp;
}

function getAdminAuth() {
  const app = getAdminApp();
  if (!app) {
    throw new Error('Firebase Admin app is not initialized. Check your service account configuration.');
  }
  // Use default instance if only one app is initialized
  return admin.auth();
}

function getAdminDb() {
  const app = getAdminApp();
  if (!app) {
    throw new Error('Firebase Admin app is not initialized. Check your service account configuration.');
  }
  // Use default instance if only one app is initialized
  // This avoids module resolution issues with Next.js bundling
  return admin.firestore();
}

function getAdminStorage() {
  const app = getAdminApp();
  if (!app) {
    throw new Error('Firebase Admin app is not initialized. Check your service account configuration.');
  }
  // Use default instance if only one app is initialized
  return admin.storage();
}

export { getAdminApp as adminApp, getAdminAuth as adminAuth, getAdminDb as adminDb, getAdminStorage as adminStorage };
