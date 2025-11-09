/**
 * POST /api/webhooks/transcription
 *
 * Webhook endpoint for receiving transcription results from the provider.
 * This endpoint:
 * 1. Verifies webhook signature for authenticity
 * 2. Parses and validates the payload
 * 3. Updates the Call document with transcript data
 * 4. Triggers the analysis job
 * 5. Returns idempotent response
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { MockTranscriptionAdapter } from '@/lib/adapters/mock-transcription.adapter';
import { transcriptionWebhookSchema } from '@/lib/validators/schemas';

// Track processed webhooks for idempotency
const processedWebhooks = new Map<string, boolean>();

export async function POST(request: NextRequest) {
  try {
    // Get signature from headers
    const signature = request.headers.get('x-webhook-signature') || '';
    const rawBody = await request.text();

    // Verify webhook signature
    const transcriptionAdapter = new MockTranscriptionAdapter();
    const isValid = transcriptionAdapter.verifyWebhook(signature, rawBody);

    if (!isValid && process.env.NODE_ENV === 'production') {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse and validate payload
    const payload = JSON.parse(rawBody);
    const validatedPayload = transcriptionWebhookSchema.parse(payload);

    // Idempotency check
    if (processedWebhooks.has(validatedPayload.jobId)) {
      console.log(`Webhook already processed for job ${validatedPayload.jobId}`);
      return NextResponse.json({ status: 'already_processed' });
    }

    // Find the call by transcription job ID
    const callsSnapshot = await adminDb()
      .collection('calls')
      .where('transcriptionJobId', '==', validatedPayload.jobId)
      .limit(1)
      .get();

    if (callsSnapshot.empty) {
      console.error(`No call found for job ${validatedPayload.jobId}`);
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    const callDoc = callsSnapshot.docs[0];
    const callId = callDoc.id;

    // Handle based on status
    if (validatedPayload.status === 'completed' && validatedPayload.transcript) {
      // Update call with transcript
      await adminDb().collection('calls').doc(callId).update({
        transcript: validatedPayload.transcript,
        status: 'transcribed',
        updatedAt: Date.now(),
      });

      console.log(`Transcript saved for call ${callId}`);

      // Trigger analysis asynchronously
      // In production, use a queue or background job
      triggerAnalysis(callId, request.nextUrl.origin).catch(err => {
        console.error('Failed to trigger analysis:', err);
      });

      // Mark as processed
      processedWebhooks.set(validatedPayload.jobId, true);

      return NextResponse.json({
        status: 'success',
        callId,
        message: 'Transcript saved, analysis started',
      });

    } else if (validatedPayload.status === 'failed') {
      // Mark call as failed
      await adminDb().collection('calls').doc(callId).update({
        status: 'failed',
        updatedAt: Date.now(),
      });

      console.error(`Transcription failed for call ${callId}: ${validatedPayload.error}`);

      return NextResponse.json({
        status: 'failed',
        callId,
        error: validatedPayload.error,
      });

    } else {
      // Unknown status or incomplete data
      console.warn(`Unexpected webhook status: ${validatedPayload.status}`);
      return NextResponse.json({ status: 'unknown' });
    }

  } catch (error) {
    console.error('Error processing transcription webhook:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid webhook payload', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Webhook processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Trigger analysis job for a transcribed call
 */
async function triggerAnalysis(callId: string, origin: string): Promise<void> {
  try {
    const response = await fetch(`${origin}/api/analysis/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callId }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Analysis API returned ${response.status}: ${error}`);
    }

    console.log(`Analysis triggered for call ${callId}`);
  } catch (error) {
    console.error(`Failed to trigger analysis for call ${callId}:`, error);
    throw error;
  }
}
