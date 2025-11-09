/**
 * Zod Validation Schemas
 *
 * Defines runtime validation schemas for all data models.
 * These ensure type safety and data integrity at runtime, especially for:
 * - API request/response payloads
 * - LLM-generated output (which can drift from expected schema)
 * - External webhook data
 */

import { z } from 'zod';

// ============================================================================
// Enums and Primitives
// ============================================================================

export const callStatusSchema = z.enum([
  'created',
  'uploading',
  'transcribing',
  'transcribed',
  'analyzing',
  'complete',
  'failed',
]);

export const callTypeSchema = z.enum([
  'repair',
  'maintenance',
  'installation',
  'other',
]);

export const speakerLabelSchema = z.enum(['tech', 'customer', 'unknown']);

export const stageQualitySchema = z.enum(['poor', 'ok', 'good', 'excellent']);

export const insightSeveritySchema = z.enum(['low', 'med', 'high']);

// ============================================================================
// Transcript Schemas
// ============================================================================

export const transcriptSegmentSchema = z.object({
  start: z.number().min(0),
  end: z.number().min(0),
  speaker: speakerLabelSchema,
  text: z.string(),
});

export const transcriptSchema = z.object({
  text: z.string(),
  segments: z.array(transcriptSegmentSchema),
  provider: z.enum(['assemblyai', 'whisper', 'other']),
  confidence: z.number().min(0).max(1).optional(),
});

// ============================================================================
// Analysis Schemas
// ============================================================================

export const evidenceSchema = z.object({
  quote: z.string(),
  timestamp: z.number().nullable().optional(), // Allow null or undefined
});

export const stageEvaluationSchema = z.object({
  present: z.boolean(),
  quality: stageQualitySchema,
  evidence: z.array(evidenceSchema).optional(),
  notes: z.string().optional(),
});

export const salesInsightSchema = z.object({
  snippet: z.string(),
  timestamp: z.number().nullable().optional(), // Allow null or undefined
  note: z.string(),
  severity: insightSeveritySchema.optional(),
});

export const missedOpportunitySchema = z.object({
  recommendation: z.string(),
  snippet: z.string().optional(),
  timestamp: z.number().nullable().optional(), // Allow null or undefined
});

export const checklistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  passed: z.boolean(),
  evidence: z.string().optional(),
  timestamp: z.number().nullable().optional(), // Allow null or undefined
});

export const analysisSchema = z.object({
  summary: z.string(),
  generalFeedback: z.string(),
  scores: z.object({
    complianceOverall: z.number().min(0).max(100),
    clarity: z.number().min(0).max(100),
    empathy: z.number().min(0).max(100),
    professionalism: z.number().min(0).max(100),
  }),
  callTypePrediction: z.string(),
  stages: z.object({
    introduction: stageEvaluationSchema,
    diagnosis: stageEvaluationSchema,
    solutionExplanation: stageEvaluationSchema,
    upsell: stageEvaluationSchema,
    maintenancePlan: stageEvaluationSchema,
    closing: stageEvaluationSchema,
  }),
  salesInsights: z.array(salesInsightSchema),
  missedOpportunities: z.array(missedOpportunitySchema),
  checklist: z.array(checklistItemSchema),
  createdAt: z.number(),
});

// ============================================================================
// Call Schema
// ============================================================================

export const callSchema = z.object({
  id: z.string(),
  userId: z.string(),
  audioPath: z.string(),
  durationSec: z.number().optional(),
  status: callStatusSchema,
  transcriptionJobId: z.string().optional(),
  callType: callTypeSchema.optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  transcript: transcriptSchema.optional(),
  analysis: analysisSchema.optional(),
});

// ============================================================================
// API Request/Response Schemas
// ============================================================================

/**
 * POST /api/calls request body
 */
export const createCallRequestSchema = z.object({
  fileName: z.string(),
  contentType: z.string(),
});

/**
 * POST /api/calls response
 */
export const createCallResponseSchema = z.object({
  callId: z.string(),
  uploadUrl: z.string().optional(),
  storagePath: z.string(),
});

/**
 * POST /api/webhooks/transcription request body
 */
export const transcriptionWebhookSchema = z.object({
  jobId: z.string(),
  status: z.string(),
  transcript: transcriptSchema.optional(),
  error: z.string().optional(),
});

/**
 * POST /api/analysis/run request body
 */
export const runAnalysisRequestSchema = z.object({
  callId: z.string(),
});

/**
 * POST /api/analysis/run response
 */
export const runAnalysisResponseSchema = z.object({
  success: z.boolean(),
  callId: z.string(),
  analysisId: z.string().optional(),
  error: z.string().optional(),
});

// ============================================================================
// Type Inference Helpers
// ============================================================================

export type CallStatusSchema = z.infer<typeof callStatusSchema>;
export type CallTypeSchema = z.infer<typeof callTypeSchema>;
export type SpeakerLabelSchema = z.infer<typeof speakerLabelSchema>;
export type StageQualitySchema = z.infer<typeof stageQualitySchema>;
export type TranscriptSegmentSchema = z.infer<typeof transcriptSegmentSchema>;
export type TranscriptSchema = z.infer<typeof transcriptSchema>;
export type AnalysisSchema = z.infer<typeof analysisSchema>;
export type CallSchema = z.infer<typeof callSchema>;
export type CreateCallRequestSchema = z.infer<typeof createCallRequestSchema>;
export type CreateCallResponseSchema = z.infer<typeof createCallResponseSchema>;
export type TranscriptionWebhookSchema = z.infer<typeof transcriptionWebhookSchema>;
export type RunAnalysisRequestSchema = z.infer<typeof runAnalysisRequestSchema>;
export type RunAnalysisResponseSchema = z.infer<typeof runAnalysisResponseSchema>;
