/**
 * POST /api/calls
 *
 * Creates a new call record and initiates the transcription process.
 * This endpoint:
 * 1. Validates request body
 * 2. Creates a Call document in Firestore
 * 3. Generates a signed upload URL for the audio file
 * 4. Returns the upload URL to the client
 * 5. (After client uploads) Kicks off transcription job via webhook/polling
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FirebaseStorageAdapter } from '@/lib/adapters/firebase-storage.adapter';
import { MockStorageAdapter } from '@/lib/adapters/mock-storage.adapter';
import { MockTranscriptionAdapter } from '@/lib/adapters/mock-transcription.adapter';
import { AssemblyAITranscriptionAdapter } from '@/lib/adapters/assemblyai-transcription.adapter';
import { createCallRequestSchema } from '@/lib/validators/schemas';
import { Call } from '@/types/models';

export async function POST(request: NextRequest) {
  try {
    // Check if Firebase Admin is initialized
    let db;
    try {
      db = adminDb();
      console.log('[POST /api/calls] Firebase Admin initialized successfully');
    } catch (adminError) {
      const errorMessage = adminError instanceof Error ? adminError.message : String(adminError);
      console.error('[POST /api/calls] Firebase Admin not initialized:', errorMessage);
      console.error('[POST /api/calls] FIREBASE_SERVICE_ACCOUNT_KEY exists:', !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: 'FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set or invalid. Please configure Firebase Admin SDK in your deployment environment.',
          hint: 'Set FIREBASE_SERVICE_ACCOUNT_KEY in your production environment variables.',
          debug: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        },
        { status: 500 }
      );
    }

    // Parse and validate request body
    let body;
    let validatedData;
    try {
      body = await request.json();
      validatedData = createCallRequestSchema.parse(body);
      console.log('[POST /api/calls] Request validated:', { fileName: validatedData.fileName, contentType: validatedData.contentType });
    } catch (parseError) {
      console.error('[POST /api/calls] Request validation failed:', parseError);
      if (parseError instanceof Error && parseError.name === 'ZodError') {
        return NextResponse.json(
          { error: 'Invalid request body', details: parseError.message },
          { status: 400 }
        );
      }
      throw parseError;
    }

    // For MVP, use a mock user ID (in production, get from Firebase Auth token)
    const userId = request.headers.get('x-user-id') || 'anonymous-user';

    // Generate unique call ID
    const callId = `call-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Initialize adapters
    // Use FirebaseStorageAdapter if bucket is configured, otherwise fall back to mock
    const useFirebaseStorage = !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const storageAdapter = useFirebaseStorage
      ? new FirebaseStorageAdapter()
      : new MockStorageAdapter();

    // Use AssemblyAI if API key is configured, otherwise fall back to mock
    const useAssemblyAI = !!process.env.ASSEMBLYAI_API_KEY;
    const transcriptionAdapter = useAssemblyAI
      ? new AssemblyAITranscriptionAdapter()
      : new MockTranscriptionAdapter();

    // Generate signed upload URL
    let uploadResult;
    try {
      console.log('[POST /api/calls] Generating upload URL...');
      uploadResult = await storageAdapter.getUploadUrl({
        fileName: validatedData.fileName,
        contentType: validatedData.contentType,
        userId,
        callId,
      });
      console.log('[POST /api/calls] Upload URL generated:', uploadResult.uploadUrl?.substring(0, 100) + '...');
    } catch (uploadError) {
      console.error('[POST /api/calls] Failed to generate upload URL:', uploadError);
      throw new Error(`Failed to generate upload URL: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
    }

    // Create Call document in Firestore
    try {
      const now = Date.now();
      const callData: Call = {
        id: callId,
        userId,
        audioPath: uploadResult.storagePath,
        status: 'created',
        createdAt: now,
        updatedAt: now,
      };

      console.log('[POST /api/calls] Creating Firestore document...');
      await db.collection('calls').doc(callId).set(callData);
      console.log('[POST /api/calls] Firestore document created successfully');
    } catch (firestoreError) {
      console.error('[POST /api/calls] Failed to create Firestore document:', firestoreError);
      throw new Error(`Failed to create call in database: ${firestoreError instanceof Error ? firestoreError.message : 'Unknown error'}`);
    }

    // Don't start transcription here - wait for file upload to complete
    // The client will call /api/calls/[callId]/start-transcription after upload

    // Return response
    return NextResponse.json({
      callId,
      uploadUrl: uploadResult.uploadUrl,
      storagePath: uploadResult.storagePath,
    }, { status: 201 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[POST /api/calls] Error creating call:', {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : undefined,
    });

    // Don't expose stack traces in production
    const isDevelopment = process.env.NODE_ENV === 'development';

    return NextResponse.json(
      { 
        error: 'Failed to create call',
        details: errorMessage,
        ...(isDevelopment && errorStack ? { stack: errorStack } : {})
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/calls?userId=xxx
 *
 * Retrieves all calls for a user (optional endpoint for dashboard)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId') || 'anonymous-user';

    let snapshot;

    try {
      // Try query with composite index (userId + createdAt)
      snapshot = await adminDb()
        .collection('calls')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
    } catch (indexError: any) {
      // If index doesn't exist, fall back to simpler query and sort in memory
      console.warn('Composite index not available, using fallback query:', indexError.message);

      snapshot = await adminDb()
        .collection('calls')
        .where('userId', '==', userId)
        .limit(50)
        .get();

      // Sort in memory (works for small datasets)
      const calls = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

      return NextResponse.json({ calls });
    }

    const calls = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ calls });
  } catch (error) {
    console.error('Error fetching calls:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calls' },
      { status: 500 }
    );
  }
}
