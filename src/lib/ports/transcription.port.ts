/**
 * Transcription Port Interface
 *
 * Defines the contract for transcription services with speaker diarization.
 * This abstraction allows swapping transcription providers (AssemblyAI, Whisper, etc.)
 * without affecting business logic.
 */

import { Transcript } from '@/types/models';

/**
 * Input parameters for starting a transcription job
 */
export interface StartTranscriptionInput {
  /** URL to the audio file (must be publicly accessible) */
  audioUrl: string;
  /** Webhook URL to receive transcription results */
  webhookUrl: string;
  /** Optional language code (e.g., 'en', 'es') */
  languageCode?: string;
  /** Enable speaker diarization */
  enableDiarization?: boolean;
}

/**
 * Result from starting a transcription job
 */
export interface StartTranscriptionResult {
  /** Unique job identifier from the provider */
  jobId: string;
  /** Provider-specific status */
  status?: string;
}

/**
 * Webhook payload structure (provider-agnostic)
 */
export interface TranscriptionWebhookPayload {
  /** Job identifier */
  jobId: string;
  /** Job status (completed, failed, etc.) */
  status: string;
  /** Transcript data (only if status is completed) */
  transcript?: Transcript;
  /** Error message (only if status is failed) */
  error?: string;
}

/**
 * Port interface for transcription services
 */
export interface TranscriptionPort {
  /**
   * Start a new transcription job with speaker diarization
   *
   * @param input - Configuration for the transcription job
   * @returns Job identifier and initial status
   */
  startJob(input: StartTranscriptionInput): Promise<StartTranscriptionResult>;

  /**
   * Verify webhook signature to ensure authenticity
   *
   * @param signature - Signature from webhook headers
   * @param payload - Raw webhook payload body
   * @returns True if signature is valid
   */
  verifyWebhook(signature: string, payload: string): boolean;

  /**
   * Parse webhook payload into standardized format
   *
   * @param rawPayload - Raw webhook body from provider
   * @returns Normalized webhook payload
   */
  parseWebhookPayload(rawPayload: unknown): Promise<TranscriptionWebhookPayload>;

  /**
   * Optional: Get current status of a transcription job
   * (Useful for polling if webhooks fail)
   *
   * @param jobId - Job identifier
   * @returns Current job status and transcript if available
   */
  getJobStatus?(jobId: string): Promise<{
    status: string;
    transcript?: Transcript;
  }>;
}
