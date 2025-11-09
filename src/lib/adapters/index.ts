/**
 * Adapters Index
 *
 * Centralized export of all concrete adapter implementations.
 * These classes implement the port interfaces and can be easily swapped.
 */

export { OpenAILLMAdapter } from './openai-llm.adapter';
export { MockTranscriptionAdapter } from './mock-transcription.adapter';
export { FirebaseStorageAdapter } from './firebase-storage.adapter';
