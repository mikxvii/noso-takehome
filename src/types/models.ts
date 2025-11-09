/**
 * Core data models for the Service Call Recording Analysis system.
 * These interfaces define the shape of data stored in Firestore and used throughout the app.
 */

// ============================================================================
// Call Status and Types
// ============================================================================

export type CallStatus =
  | 'created'
  | 'uploading'
  | 'transcribing'
  | 'transcribed'
  | 'analyzing'
  | 'complete'
  | 'failed';

export type CallType = 'repair' | 'maintenance' | 'installation' | 'other';

export type SpeakerLabel = 'tech' | 'customer' | 'unknown';

export type StageQuality = 'poor' | 'ok' | 'good' | 'excellent';

export type InsightSeverity = 'low' | 'med' | 'high';

// ============================================================================
// Transcript Models
// ============================================================================

/**
 * A single segment of transcribed audio with speaker diarization
 */
export interface TranscriptSegment {
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  /** Speaker label from diarization */
  speaker: SpeakerLabel;
  /** Transcribed text for this segment */
  text: string;
}

/**
 * Complete transcript with diarized segments
 */
export interface Transcript {
  /** Full transcript text (all segments concatenated) */
  text: string;
  /** Array of diarized segments with timestamps */
  segments: TranscriptSegment[];
  /** Transcription provider used */
  provider: 'assemblyai' | 'whisper' | 'other';
  /** Optional confidence score from provider */
  confidence?: number;
}

// ============================================================================
// Analysis Models
// ============================================================================

/**
 * Evidence for a particular stage or insight
 */
export interface Evidence {
  /** Quote from the transcript */
  quote: string;
  /** Optional timestamp in seconds (can be null) */
  timestamp?: number | null;
}

/**
 * Evaluation of a single conversation stage
 */
export interface StageEvaluation {
  /** Whether the stage was present in the call */
  present: boolean;
  /** Quality rating of the stage execution */
  quality: StageQuality;
  /** Supporting evidence from the transcript */
  evidence?: Evidence[];
  /** Additional notes about the stage */
  notes?: string;
}

/**
 * Sales insight identified during analysis
 */
export interface SalesInsight {
  /** Text snippet from transcript */
  snippet: string;
  /** Optional timestamp in seconds (can be null) */
  timestamp?: number | null;
  /** Descriptive note about the insight */
  note: string;
  /** Optional severity level */
  severity?: InsightSeverity;
}

/**
 * Missed opportunity identified during analysis
 */
export interface MissedOpportunity {
  /** Recommendation for improvement */
  recommendation: string;
  /** Optional supporting snippet */
  snippet?: string;
  /** Optional timestamp in seconds (can be null) */
  timestamp?: number | null;
}

/**
 * Single checklist item for requirements validation
 */
export interface ChecklistItem {
  /** Unique identifier for the checklist item */
  id: string;
  /** Display label for the requirement */
  label: string;
  /** Whether the requirement was met */
  passed: boolean;
  /** Supporting evidence or explanation */
  evidence?: string;
  /** Optional timestamp in seconds (can be null) */
  timestamp?: number | null;
}

/**
 * Complete analysis results for a call
 */
export interface Analysis {
  /** AI-generated summary of the call (2-3 sentences) */
  summary: string;
  /** Scoring metrics */
  scores: {
    /** Overall compliance score (0-100) */
    complianceOverall: number;
    /** Clarity score (0-100) */
    clarity: number;
    /** Empathy score (0-100) */
    empathy: number;
    /** Professionalism score (0-100) */
    professionalism: number;
  };
  /** Predicted call type with optional confidence */
  callTypePrediction: string;
  /** Evaluation of each conversation stage */
  stages: {
    introduction: StageEvaluation;
    diagnosis: StageEvaluation;
    solutionExplanation: StageEvaluation;
    upsell: StageEvaluation;
    maintenancePlan: StageEvaluation;
    closing: StageEvaluation;
  };
  /** Sales insights extracted from the call */
  salesInsights: SalesInsight[];
  /** Missed opportunities identified */
  missedOpportunities: MissedOpportunity[];
  /** Requirements checklist validation */
  checklist: ChecklistItem[];
  /** Timestamp when analysis was created */
  createdAt: number;
}

// ============================================================================
// Call Model (Firestore document)
// ============================================================================

/**
 * Main Call document stored in Firestore
 */
export interface Call {
  /** Unique call identifier */
  id: string;
  /** User ID who uploaded the call */
  userId: string;
  /** Firebase Storage path or HTTPS URL to audio file */
  audioPath: string;
  /** Duration of audio in seconds (optional, filled after upload) */
  durationSec?: number;
  /** Current processing status */
  status: CallStatus;
  /** Transcription job ID from provider */
  transcriptionJobId?: string;
  /** Detected or predicted call type */
  callType?: CallType;
  /** Timestamp when call was created */
  createdAt: number;
  /** Timestamp when call was last updated */
  updatedAt: number;
  /** Embedded transcript (for MVP; could be subcollection) */
  transcript?: Transcript;
  /** Embedded analysis (for MVP; could be subcollection) */
  analysis?: Analysis;
}

// ============================================================================
// UI-specific Types
// ============================================================================

/**
 * Filter options for transcript view
 */
export interface TranscriptFilter {
  /** Search query string */
  search: string;
  /** Filter by speaker (null = show all) */
  speaker: SpeakerLabel | 'all';
}

/**
 * Upload progress state
 */
export interface UploadProgress {
  /** Current progress percentage (0-100) */
  percent: number;
  /** Current phase of processing */
  phase: 'idle' | 'uploading' | 'transcribing' | 'analyzing' | 'complete' | 'error';
  /** Optional error message */
  error?: string;
}
