/**
 * Script to configure CORS for Firebase Storage
 * 
 * Run with: npx tsx scripts/setup-cors.ts
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('firebase-service-account.json not found!');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Try to get bucket name from env, or construct it
// Load env vars from .env.local if it exists
try {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const bucketMatch = envContent.match(/NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=(.+)/);
    if (bucketMatch) {
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = bucketMatch[1].trim();
    }
  }
} catch (e) {
  // Ignore errors reading env file
}

let bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
if (!bucketName) {
  // Common Firebase Storage bucket naming patterns
  bucketName = `${serviceAccount.project_id}.appspot.com`;
}

// If bucket name is .appspot.com but we found .firebasestorage.app, use that instead
// Firebase creates .firebasestorage.app buckets by default now
const useFirebaseStorageApp = bucketName.includes('.appspot.com');

console.log(`Attempting to configure CORS for bucket: ${bucketName}`);
const bucket = admin.storage().bucket(bucketName);

// CORS configuration
const corsConfig = [
  {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    method: ['PUT', 'GET', 'POST', 'HEAD', 'OPTIONS'],
    responseHeader: ['Content-Type', 'x-goog-resumable', 'Authorization'],
    maxAgeSeconds: 3600,
  },
];

async function setupCors() {
  try {
    // Use the Google Cloud Storage client directly
    const { Storage } = require('@google-cloud/storage');
    const storage = new Storage({
      projectId: serviceAccount.project_id,
      credentials: serviceAccount,
    });
    
    // First, try to check if bucket exists and list available buckets
    try {
      const [exists] = await bucket.exists();
      if (!exists) {
        console.log(`\n⚠️  Bucket "${bucketName}" does not exist.`);
        console.log('Listing available buckets...\n');
        
        const [buckets] = await storage.getBuckets();
        if (buckets.length > 0) {
          console.log('Available buckets:');
          buckets.forEach((b: any) => console.log(`  - ${b.name}`));
          
          // If looking for .appspot.com but .firebasestorage.app exists, use that
          // Or if the requested bucket doesn't exist, use the first available
          const firebaseStorageBucket = buckets.find((b: any) => b.name.includes('.firebasestorage.app'));
          if (useFirebaseStorageApp && firebaseStorageBucket) {
            console.log(`\n⚠️  Bucket "${bucketName}" not found, but found "${firebaseStorageBucket.name}"`);
            console.log(`Using: ${firebaseStorageBucket.name}`);
            bucketName = firebaseStorageBucket.name;
          } else {
            console.log(`\nUsing first available bucket: ${buckets[0].name}`);
            bucketName = buckets[0].name;
          }
        } else {
          console.log('\n❌ No buckets found. Firebase Storage needs to be enabled first.');
          console.log('\n📋 Steps to enable Firebase Storage:');
          console.log('1. Go to: https://console.firebase.google.com/project/noso-takehome/storage');
          console.log('2. Click "Get Started" to enable Storage');
          console.log('3. Choose "Start in test mode" (you can secure it later)');
          console.log('4. Select a location for your bucket');
          console.log('5. Run this script again: npm run setup-cors');
          console.log('\n💡 Note: Firebase Storage is FREE on the Spark plan (5GB storage, 1GB/day downloads)');
          process.exit(1);
        }
      }
    } catch (checkError: any) {
      console.log('Could not check bucket existence, proceeding anyway...');
    }
    
    const gcsBucket = storage.bucket(bucketName);
    await gcsBucket.setCorsConfiguration(corsConfig);
    
    console.log('\n✅ CORS configuration set successfully!');
    console.log('CORS config:', JSON.stringify(corsConfig, null, 2));
    console.log(`\nBucket: ${bucketName}`);
    console.log('Allowed origins: http://localhost:3000, http://localhost:3001');
    console.log('Allowed methods: PUT, GET, POST, HEAD, OPTIONS');
  } catch (error: any) {
    console.error('\n❌ Error setting CORS:', error.message);
    if (error.code === 403) {
      console.error('\n⚠️  Permission denied. Make sure your service account has Storage Admin role.');
      console.error('Go to: https://console.cloud.google.com/iam-admin/iam?project=noso-takehome');
      console.error('Find your service account and add "Storage Admin" role.');
    } else if (error.code === 404) {
      console.error('\n⚠️  Bucket not found. Make sure:');
      console.error('1. Firebase Storage is enabled in your project');
      console.error('2. The bucket name is correct');
      console.error('3. Set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET in your .env.local');
    }
    console.error('\nAlternative: Install gcloud SDK and run:');
    console.error(`  gsutil cors set cors.json gs://${bucketName}`);
    process.exit(1);
  }
}

setupCors();

