/**
 * Storage Port Interface
 *
 * Defines the contract for cloud storage operations.
 * This abstraction allows swapping storage providers (Firebase Storage, S3, etc.)
 * without affecting business logic.
 */

/**
 * Input for generating a signed upload URL
 */
export interface GetUploadUrlInput {
  /** File name */
  fileName: string;
  /** MIME type (e.g., 'audio/mpeg', 'audio/wav') */
  contentType: string;
  /** User ID for organizing storage */
  userId: string;
  /** Optional call ID if already created */
  callId?: string;
}

/**
 * Result from generating an upload URL
 */
export interface GetUploadUrlResult {
  /** Signed URL for uploading the file */
  uploadUrl: string;
  /** Final storage path where file will be stored */
  storagePath: string;
  /** Public URL to access the file (if applicable) */
  publicUrl?: string;
}

/**
 * Port interface for storage operations
 */
export interface StoragePort {
  /**
   * Generate a signed URL for client-side file upload
   *
   * @param input - Upload configuration
   * @returns Signed URL and storage path
   */
  getUploadUrl(input: GetUploadUrlInput): Promise<GetUploadUrlResult>;

  /**
   * Get a public or signed URL for accessing an uploaded file
   *
   * @param storagePath - Path to the file in storage
   * @returns Accessible URL (public or temporary signed)
   */
  getDownloadUrl(storagePath: string): Promise<string>;

  /**
   * Delete a file from storage
   *
   * @param storagePath - Path to the file in storage
   */
  deleteFile(storagePath: string): Promise<void>;

  /**
   * Optional: Check if a file exists
   *
   * @param storagePath - Path to the file in storage
   * @returns True if file exists
   */
  fileExists?(storagePath: string): Promise<boolean>;
}
