/**
 * POST /api/calls/[callId]/start-transcription
 *
 * Starts the transcription job after the file has been uploaded.
 * This endpoint is called by the client after successfully uploading the file.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FirebaseStorageAdapter } from '@/lib/adapters/firebase-storage.adapter';
import { MockStorageAdapter } from '@/lib/adapters/mock-storage.adapter';
import { MockTranscriptionAdapter } from '@/lib/adapters/mock-transcription.adapter';
import { AssemblyAITranscriptionAdapter } from '@/lib/adapters/assemblyai-transcription.adapter';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await params;

    // Get the call document
    const callDoc = await adminDb().collection('calls').doc(callId).get();
    if (!callDoc.exists) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    const callData = callDoc.data();
    if (!callData) {
      return NextResponse.json(
        { error: 'Call data not found' },
        { status: 404 }
      );
    }

    // Initialize adapters
    const useFirebaseStorage = !!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const storageAdapter = useFirebaseStorage
      ? new FirebaseStorageAdapter()
      : new MockStorageAdapter();

    const useAssemblyAI = !!process.env.ASSEMBLYAI_API_KEY;
    const transcriptionAdapter = useAssemblyAI
      ? new AssemblyAITranscriptionAdapter()
      : new MockTranscriptionAdapter();

    // Verify file exists in storage (for Firebase Storage)
    if (useFirebaseStorage && storageAdapter.fileExists) {
      const fileExists = await storageAdapter.fileExists(callData.audioPath);
      if (!fileExists) {
        return NextResponse.json(
          { error: 'File not found in storage. Please upload the file first.' },
          { status: 400 }
        );
      }
    }

    // Get the download URL for the transcription service
    const downloadUrl = await storageAdapter.getDownloadUrl(callData.audioPath);

    console.log('Starting transcription job for call:', callId);
    console.log('Download URL:', downloadUrl.substring(0, 100) + '...');

    // Start transcription job
    // For local development, AssemblyAI can't reach localhost
    // Use NEXT_PUBLIC_WEBHOOK_URL env var if set (e.g., ngrok URL), otherwise use origin
    const webhookBaseUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL || request.nextUrl.origin;
    const webhookUrl = `${webhookBaseUrl}/api/webhooks/transcription`;
    
    console.log('Webhook URL:', webhookUrl);
    console.log('⚠️  Note: For local development, AssemblyAI cannot reach localhost.');
    console.log('   Options: 1) Use ngrok and set NEXT_PUBLIC_WEBHOOK_URL, or 2) Poll for status manually');
    
    const transcriptionResult = await transcriptionAdapter.startJob({
      audioUrl: downloadUrl,
      webhookUrl,
      enableDiarization: true,
    });

    // Update call with transcription job ID and status
    await adminDb().collection('calls').doc(callId).update({
      transcriptionJobId: transcriptionResult.jobId,
      status: 'transcribing',
      updatedAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      jobId: transcriptionResult.jobId,
      message: 'Transcription job started',
    });

  } catch (error) {
    console.error('Error starting transcription:', error);
    return NextResponse.json(
      { error: 'Failed to start transcription', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

