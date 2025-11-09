/**
 * Firebase Storage Adapter
 *
 * Concrete implementation of StoragePort using Firebase Cloud Storage.
 * Handles file uploads, signed URLs, and storage management.
 */

import { adminStorage } from '@/lib/firebase/admin';
import {
  StoragePort,
  GetUploadUrlInput,
  GetUploadUrlResult,
} from '@/lib/ports/storage.port';

export class FirebaseStorageAdapter implements StoragePort {
  private getBucket() {
    const storage = adminStorage();
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (bucketName) {
      return storage.bucket(bucketName);
    }
    return storage.bucket();
  }

  async getUploadUrl(input: GetUploadUrlInput): Promise<GetUploadUrlResult> {
    // Construct storage path: audio/{userId}/{callId}/{fileName}
    const callId = input.callId || this.generateCallId();
    const storagePath = `audio/${input.userId}/${callId}/${input.fileName}`;

    const file = this.getBucket().file(storagePath);

    // Generate a signed URL for PUT upload (valid for 15 minutes)
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: input.contentType,
    });

    return {
      uploadUrl: signedUrl,
      storagePath,
      publicUrl: undefined, // Firebase Storage doesn't have public URLs by default
    };
  }

  async getDownloadUrl(storagePath: string): Promise<string> {
    const file = this.getBucket().file(storagePath);

    // Generate a signed URL for read access (valid for 1 hour)
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    return signedUrl;
  }

  async deleteFile(storagePath: string): Promise<void> {
    const file = this.getBucket().file(storagePath);
    await file.delete();
  }

  async fileExists(storagePath: string): Promise<boolean> {
    const file = this.getBucket().file(storagePath);
    const [exists] = await file.exists();
    return exists;
  }

  private generateCallId(): string {
    return `call-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
