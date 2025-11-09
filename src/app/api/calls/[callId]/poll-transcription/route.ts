/**
 * GET /api/calls/[callId]/poll-transcription
 *
 * Polls AssemblyAI for transcription status and updates Firestore when complete.
 * Useful for local development when webhooks can't reach localhost.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { AssemblyAITranscriptionAdapter } from '@/lib/adapters/assemblyai-transcription.adapter';

export async function GET(
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
    if (!callData?.transcriptionJobId) {
      return NextResponse.json(
        { error: 'No transcription job ID found' },
        { status: 400 }
      );
    }

    // Check transcription status
    const transcriptionAdapter = new AssemblyAITranscriptionAdapter();
    const status = await transcriptionAdapter.getJobStatus(callData.transcriptionJobId);

    if (status.status === 'completed' && status.transcript) {
      // Update call with transcript
      await adminDb().collection('calls').doc(callId).update({
        transcript: status.transcript,
        status: 'transcribed',
        updatedAt: Date.now(),
      });

      console.log(`[Poll] Transcript saved for call ${callId} with ${status.transcript.segments.length} segments`);

      // Trigger analysis
      const origin = request.nextUrl.origin;
      fetch(`${origin}/api/analysis/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId }),
      }).catch(err => {
        console.error('Failed to trigger analysis:', err);
      });

      return NextResponse.json({
        status: 'completed',
        transcript: status.transcript,
        message: 'Transcript retrieved and saved',
      });
    } else if (status.status === 'failed') {
      await adminDb().collection('calls').doc(callId).update({
        status: 'failed',
        updatedAt: Date.now(),
      });

      return NextResponse.json({
        status: 'failed',
        message: 'Transcription failed',
      });
    } else {
      return NextResponse.json({
        status: status.status,
        message: 'Transcription still in progress',
      });
    }

  } catch (error) {
    console.error('Error polling transcription:', error);
    return NextResponse.json(
      { error: 'Failed to poll transcription', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

