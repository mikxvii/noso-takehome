/**
 * Ports Index
 *
 * Centralized export of all port interfaces for clean architecture.
 */

export type {
  TranscriptionPort,
  StartTranscriptionInput,
  StartTranscriptionResult,
  TranscriptionWebhookPayload,
} from './transcription.port';

export type {
  LLMAnalysisPort,
  AnalysisInput,
} from './llm-analysis.port';

export type {
  StoragePort,
  GetUploadUrlInput,
  GetUploadUrlResult,
} from './storage.port';
