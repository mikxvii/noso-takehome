/**
 * Mock Storage Adapter
 *
 * Development-only adapter that simulates file storage without actually
 * storing files. Useful for testing without Firebase Storage enabled.
 */

import {
  StoragePort,
  GetUploadUrlInput,
  GetUploadUrlResult,
} from '@/lib/ports/storage.port';

export class MockStorageAdapter implements StoragePort {
  async getUploadUrl(input: GetUploadUrlInput): Promise<GetUploadUrlResult> {
    const callId = input.callId || this.generateCallId();
    const storagePath = `audio/${input.userId}/${callId}/${input.fileName}`;

    // Return a mock upload URL that accepts the file
    // In a real scenario, this would be a signed URL to Firebase Storage
    // For development, we'll use a data URL that the browser can "upload" to
    const mockUploadUrl = `/api/mock-upload?path=${encodeURIComponent(storagePath)}`;

    return {
      uploadUrl: mockUploadUrl,
      storagePath,
      publicUrl: undefined,
    };
  }

  async getDownloadUrl(storagePath: string): Promise<string> {
    // Return a mock download URL
    // In production, this would be a signed URL from Firebase Storage
    return `https://mock-storage.example.com/${storagePath}`;
  }

  async deleteFile(storagePath: string): Promise<void> {
    // Mock implementation - no-op
    console.log(`[Mock] Would delete file: ${storagePath}`);
  }

  async fileExists(storagePath: string): Promise<boolean> {
    // Mock implementation - always return true for development
    return true;
  }

  private generateCallId(): string {
    return `call-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

