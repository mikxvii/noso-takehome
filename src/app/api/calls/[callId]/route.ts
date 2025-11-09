/**
 * DELETE /api/calls/[callId]
 *
 * Deletes a call and its associated data from Firestore.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await params;

    if (!callId) {
      return NextResponse.json(
        { error: 'Call ID is required' },
        { status: 400 }
      );
    }

    // Check if call exists
    const callDoc = await adminDb().collection('calls').doc(callId).get();

    if (!callDoc.exists) {
      return NextResponse.json(
        { error: 'Call not found' },
        { status: 404 }
      );
    }

    // Delete the call document
    await adminDb().collection('calls').doc(callId).delete();

    console.log(`Successfully deleted call: ${callId}`);

    return NextResponse.json({
      success: true,
      callId,
      message: 'Call deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting call:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete call',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
