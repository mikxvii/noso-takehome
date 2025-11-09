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
    // Parse and validate request body
    const body = await request.json();
    const validatedData = createCallRequestSchema.parse(body);

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
    const uploadResult = await storageAdapter.getUploadUrl({
      fileName: validatedData.fileName,
      contentType: validatedData.contentType,
      userId,
      callId,
    });

    console.log('Generated upload URL:', uploadResult.uploadUrl?.substring(0, 100) + '...');

    // Create Call document in Firestore
    const now = Date.now();
    const callData: Call = {
      id: callId,
      userId,
      audioPath: uploadResult.storagePath,
      status: 'created',
      createdAt: now,
      updatedAt: now,
    };

    await adminDb().collection('calls').doc(callId).set(callData);

    // Don't start transcription here - wait for file upload to complete
    // The client will call /api/calls/[callId]/start-transcription after upload

    // Return response
    return NextResponse.json({
      callId,
      uploadUrl: uploadResult.uploadUrl,
      storagePath: uploadResult.storagePath,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating call:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create call', details: error instanceof Error ? error.message : 'Unknown error' },
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

    const snapshot = await adminDb()
      .collection('calls')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

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
