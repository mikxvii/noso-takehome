/**
 * Mock Upload Endpoint
 *
 * Development-only endpoint that simulates file uploads.
 * Accepts file uploads and stores them in memory (or discards them).
 * Only used when MockStorageAdapter is active.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');

    // Read the file data (we'll discard it in mock mode, but accept it)
    const fileData = await request.arrayBuffer();

    console.log(`[Mock Upload] Received file upload for path: ${path}, size: ${fileData.byteLength} bytes`);

    // In a real implementation, this would upload to Firebase Storage
    // For mock mode, we just accept it and return success

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('[Mock Upload] Error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  // Handle CORS preflight
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

