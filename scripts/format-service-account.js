#!/usr/bin/env node

/**
 * Helper script to format Firebase service account JSON for environment variables
 * 
 * Usage:
 *   1. Download your service account JSON from Firebase Console
 *   2. Run: node scripts/format-service-account.js path/to/service-account.json
 *   3. Copy the output and set it as FIREBASE_SERVICE_ACCOUNT_KEY
 */

const fs = require('fs');
const path = require('path');

const serviceAccountPath = process.argv[2];

if (!serviceAccountPath) {
  console.error('Usage: node scripts/format-service-account.js <path-to-service-account.json>');
  process.exit(1);
}

if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Error: File not found: ${serviceAccountPath}`);
  process.exit(1);
}

try {
  const fileContents = fs.readFileSync(serviceAccountPath, 'utf8');
  const serviceAccount = JSON.parse(fileContents);
  
  // Ensure private_key has proper newlines
  if (serviceAccount.private_key) {
    // Replace any escaped newlines with actual newlines
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    
    // Validate it has the proper format
    if (!serviceAccount.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
      console.warn('Warning: Private key may not be in PEM format');
    }
  }
  
  // Convert to single-line JSON string (for environment variables)
  const formatted = JSON.stringify(serviceAccount);
  
  console.log('\n=== Copy this value for FIREBASE_SERVICE_ACCOUNT_KEY ===\n');
  console.log(formatted);
  console.log('\n=== End of value ===\n');
  
  console.log('✅ Service account formatted successfully!');
  console.log('📋 Copy the value above and set it as FIREBASE_SERVICE_ACCOUNT_KEY in your deployment platform.\n');
  
} catch (error) {
  console.error('Error processing service account:', error.message);
  process.exit(1);
}

