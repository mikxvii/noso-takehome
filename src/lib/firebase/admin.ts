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
      // When stored in env vars, newlines might be escaped as \n strings
      if (serviceAccount.private_key) {
        // Replace literal \n strings with actual newlines
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
    } catch (error) {
      throw new Error(
        'Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Ensure it is valid JSON.'
      );
    }
  }

  // Initialize with service account using admin.credential.cert()
  try {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('private key')) {
      throw new Error(
        'Failed to parse Firebase service account private key. ' +
        'Ensure the private_key field is properly formatted with actual newlines.'
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
