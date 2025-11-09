/**
 * LLM Analysis Port Interface
 *
 * Defines the contract for AI-powered call analysis services.
 * This abstraction allows swapping LLM providers (OpenAI, Gemini, Anthropic, etc.)
 * without affecting business logic.
 */

import { Analysis, Transcript } from '@/types/models';

/**
 * Input for LLM analysis
 */
export interface AnalysisInput {
  /** Diarized transcript segments with speaker labels */
  segments: Transcript['segments'];
  /** Full transcript text */
  fullText: string;
  /** Optional call metadata for context */
  metadata?: {
    durationSec?: number;
    callType?: string;
  };
}

/**
 * Port interface for LLM-based analysis
 */
export interface LLMAnalysisPort {
  /**
   * Analyze a service call transcript and generate comprehensive insights
   *
   * @param input - Transcript data and optional metadata
   * @returns Complete analysis with scores, stages, insights, and checklist
   * @throws Error if analysis fails or returns invalid schema
   */
  analyze(input: AnalysisInput): Promise<Analysis>;

  /**
   * Optional: Get the model name/version being used
   * Useful for logging and debugging
   */
  getModelInfo?(): {
    provider: string;
    model: string;
    version?: string;
  };
}
