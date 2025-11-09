/**
 * POST /api/analysis/run
 *
 * Triggers AI analysis for a transcribed call.
 * This endpoint:
 * 1. Fetches the Call document with transcript
 * 2. Calls the LLM adapter to analyze the transcript
 * 3. Validates the analysis output with Zod schema
 * 4. Updates the Call document with analysis results
 * 5. Returns success/failure status
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { OpenAILLMAdapter } from '@/lib/adapters/openai-llm.adapter';
import { runAnalysisRequestSchema } from '@/lib/validators/schemas';
import { Call } from '@/types/models';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = runAnalysisRequestSchema.parse(body);

    const { callId } = validatedData;

    // Fetch call document
    const callDoc = await adminDb().collection('calls').doc(callId).get();

    if (!callDoc.exists) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    const call = callDoc.data() as Call;

    // Ensure call has a transcript
    if (!call.transcript) {
      return NextResponse.json(
        { error: 'Call does not have a transcript yet' },
        { status: 400 }
      );
    }

    // Update status to analyzing
    await adminDb().collection('calls').doc(callId).update({
      status: 'analyzing',
      updatedAt: Date.now(),
    });

    // Initialize LLM adapter
    const llmAdapter = new OpenAILLMAdapter();

    // Run analysis
    console.log(`Starting analysis for call ${callId}`);
    const analysis = await llmAdapter.analyze({
      segments: call.transcript.segments,
      fullText: call.transcript.text,
      metadata: {
        durationSec: call.durationSec,
        callType: call.callType,
      },
    });

      // Add timestamp
      analysis.createdAt = Date.now();

      // Clean analysis data: remove undefined values (Firestore doesn't accept undefined)
      const cleanedAnalysis = removeUndefinedValues(analysis);

      // Update call with analysis
      await adminDb().collection('calls').doc(callId).update({
        analysis: cleanedAnalysis,
        status: 'complete',
        updatedAt: Date.now(),
      });

    console.log(`Analysis completed for call ${callId}`);

    return NextResponse.json({
      success: true,
      callId,
      analysisId: callId, // For MVP, analysis is embedded in call doc
    });

  } catch (error) {
    console.error('Error running analysis:', error);

    // Try to mark call as failed if we have the callId
    const body = await request.json().catch(() => ({}));
    if (body.callId) {
      await adminDb().collection('calls').doc(body.callId).update({
        status: 'failed',
        updatedAt: Date.now(),
      }).catch(err => console.error('Failed to update status:', err));
    }

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, error: 'Invalid request body', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }

}

/**
 * Recursively remove undefined values from an object (Firestore doesn't accept undefined)
 */
function removeUndefinedValues(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedValues(item));
  }

  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedValues(value);
      }
    }
    return cleaned;
  }

  return obj;
}
