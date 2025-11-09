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
      // Normalize the private key field - handle escaped newlines and clean up formatting
      // When stored in env vars, newlines might be escaped in various ways
      if (serviceAccount.private_key) {
        let privateKey = serviceAccount.private_key;
        
        // Step 1: Handle different escape formats
        // Replace literal \n strings with actual newlines
        privateKey = privateKey.replace(/\\n/g, '\n');
        
        // Step 2: Clean up whitespace issues
        // Remove any carriage returns
        privateKey = privateKey.replace(/\r/g, '');
        
        // Step 3: Ensure proper PEM format
        // Trim leading/trailing whitespace
        privateKey = privateKey.trim();
        
        // Step 4: Fix broken END marker (common issue: "-----END\n PRIVATE KEY-----")
        // Fix cases where END marker is split across lines
        privateKey = privateKey.replace(/-----END\s*\n\s*PRIVATE KEY-----/g, '-----END PRIVATE KEY-----');
        privateKey = privateKey.replace(/-----END\s+PRIVATE KEY-----/g, '-----END PRIVATE KEY-----');
        
        // Step 5: Ensure BEGIN and END markers are on their own lines (but keep them intact)
        // Only add newlines if markers are concatenated with other content
        privateKey = privateKey.replace(/([^\n])-----BEGIN PRIVATE KEY-----/g, '$1\n-----BEGIN PRIVATE KEY-----');
        privateKey = privateKey.replace(/-----END PRIVATE KEY-----([^\n])/g, '-----END PRIVATE KEY-----\n$1');
        
        // Step 6: Remove any content after the END marker (common issue)
        // The private key should end with "-----END PRIVATE KEY-----\n" or "-----END PRIVATE KEY-----"
        const endMarkerIndex = privateKey.indexOf('-----END PRIVATE KEY-----');
        if (endMarkerIndex !== -1) {
          const endMarkerEnd = endMarkerIndex + '-----END PRIVATE KEY-----'.length;
          // Keep only up to and including the END marker, plus optional trailing newline
          privateKey = privateKey.substring(0, endMarkerEnd).trim() + '\n';
        }
        
        // Step 7: Remove any content before BEGIN marker
        const beginMarkerIndex = privateKey.indexOf('-----BEGIN PRIVATE KEY-----');
        if (beginMarkerIndex > 0) {
          privateKey = privateKey.substring(beginMarkerIndex);
        }
        
        // Step 8: Normalize newlines - ensure consistent \n format
        // Remove any double newlines but keep single newlines
        privateKey = privateKey.replace(/\n{3,}/g, '\n\n');
        
        // Step 9: Ensure the key ends with a single newline
        privateKey = privateKey.replace(/\n+$/, '\n');
        
        // Step 10: Final validation - ensure END marker is intact (not split)
        if (!privateKey.includes('-----END PRIVATE KEY-----')) {
          // Try to reconstruct if it's still broken
          privateKey = privateKey.replace(/-----END[\s\n]+PRIVATE KEY-----/g, '-----END PRIVATE KEY-----');
        }
        
        serviceAccount.private_key = privateKey;
        
        // Validate the private key format
        if (!serviceAccount.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
          console.warn('Private key may not be properly formatted. Expected PEM format with BEGIN/END markers.');
        }
        
        // Additional validation - check for common issues
        if (serviceAccount.private_key.split('-----BEGIN PRIVATE KEY-----').length !== 2) {
          console.warn('Private key may have multiple BEGIN markers or formatting issues.');
        }
        if (serviceAccount.private_key.split('-----END PRIVATE KEY-----').length !== 2) {
          console.warn('Private key may have multiple END markers or formatting issues.');
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
    // Log a sample of the private key for debugging
    if (serviceAccount.private_key) {
      const keyPreview = serviceAccount.private_key.substring(0, 80).replace(/\n/g, '\\n');
      const hasNewlines = serviceAccount.private_key.includes('\n');
      const beginMarker = serviceAccount.private_key.includes('-----BEGIN PRIVATE KEY-----');
      const endMarker = serviceAccount.private_key.includes('-----END PRIVATE KEY-----');
      const lines = serviceAccount.private_key.split('\n').length;
      
      console.log('[Firebase Admin] Private key preview:', keyPreview + '...');
      console.log('[Firebase Admin] Private key stats:', {
        hasNewlines,
        hasBeginMarker: beginMarker,
        hasEndMarker: endMarker,
        lineCount: lines,
        length: serviceAccount.private_key.length,
        endsWithNewline: serviceAccount.private_key.endsWith('\n'),
      });
      
      // Show the last 50 chars to check for trailing content
      const last50 = serviceAccount.private_key.slice(-50).replace(/\n/g, '\\n');
      console.log('[Firebase Admin] Private key ending:', last50);
    }
    
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Firebase Admin] Initialization error:', errorMessage);
    
    if (errorMessage.includes('private key') || errorMessage.includes('PEM') || errorMessage.includes('DER')) {
      // Provide more helpful error message
      let helpfulMessage = 'Failed to parse Firebase service account private key.\n';
      helpfulMessage += 'Common causes:\n';
      helpfulMessage += '1. Extra content after the END marker\n';
      helpfulMessage += '2. Missing or extra newlines\n';
      helpfulMessage += '3. Corrupted key data\n';
      helpfulMessage += '\nTry regenerating the service account key from Firebase Console.\n';
      helpfulMessage += `Original error: ${errorMessage}`;
      
      throw new Error(helpfulMessage);
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
