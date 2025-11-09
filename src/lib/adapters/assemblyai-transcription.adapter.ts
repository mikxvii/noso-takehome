/**
 * AssemblyAI Transcription Adapter
 *
 * Production implementation of TranscriptionPort using AssemblyAI.
 * Supports speaker diarization and webhook callbacks.
 */

import { AssemblyAI } from 'assemblyai';
import {
  TranscriptionPort,
  StartTranscriptionInput,
  StartTranscriptionResult,
  TranscriptionWebhookPayload,
} from '@/lib/ports/transcription.port';
import { Transcript, TranscriptSegment, SpeakerLabel } from '@/types/models';

export class AssemblyAITranscriptionAdapter implements TranscriptionPort {
  private client: AssemblyAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.ASSEMBLYAI_API_KEY;
    if (!key) {
      throw new Error('AssemblyAI API key is required');
    }
    this.client = new AssemblyAI({ apiKey: key });
  }

  async startJob(input: StartTranscriptionInput): Promise<StartTranscriptionResult> {
    try {
      // Submit transcription with speaker diarization
      // Using submit() for async processing with webhooks
      const params = {
        audio: input.audioUrl,
        speaker_labels: input.enableDiarization ?? true,
        speech_model: 'universal' as const,
        language_code: input.languageCode,
        webhook_url: input.webhookUrl,
        webhook_auth_header_name: 'x-webhook-signature',
        webhook_auth_header_value: process.env.TRANSCRIPTION_WEBHOOK_SECRET || '',
      };

      console.log('[AssemblyAI] Submitting transcription with params:', {
        audio: input.audioUrl,
        speaker_labels: params.speaker_labels,
        webhook_url: input.webhookUrl,
      });

      const transcript = await this.client.transcripts.submit(params);

      console.log('[AssemblyAI] Transcription job started:', {
        id: transcript.id,
        status: transcript.status,
        audioUrl: input.audioUrl,
      });

      return {
        jobId: transcript.id,
        status: transcript.status,
      };
    } catch (error) {
      console.error('[AssemblyAI] Failed to start transcription:', error);
      throw new Error(
        `Failed to start AssemblyAI transcription: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  verifyWebhook(signature: string, payload: string): boolean {
    // AssemblyAI sends the webhook secret in the header we specified
    const expectedSignature = process.env.TRANSCRIPTION_WEBHOOK_SECRET || '';

    // Simple comparison - in production you might want more sophisticated verification
    return signature === expectedSignature;
  }

  async parseWebhookPayload(rawPayload: unknown): Promise<TranscriptionWebhookPayload> {
    try {
      // AssemblyAI webhook payload structure
      const payload = rawPayload as any;

      console.log('[AssemblyAI] Parsing webhook payload:', {
        status: payload.status,
        hasUtterances: !!payload.utterances,
        utteranceCount: payload.utterances?.length || 0,
        hasWords: !!payload.words,
        wordCount: payload.words?.length || 0,
        transcriptId: payload.transcript_id || payload.id,
      });

      // Check if this is a completed transcript
      if (payload.status === 'completed') {
        // AssemblyAI webhook might only contain transcript_id, not full data
        // If utterances/words are missing, we need to fetch the full transcript
        let transcriptData = payload;
        
        if (!payload.utterances && !payload.words && (payload.transcript_id || payload.id)) {
          console.log('[AssemblyAI] Webhook payload missing transcript data, fetching full transcript...');
          // Fetch the full transcript
          const fullTranscript = await this.client.transcripts.get(payload.transcript_id || payload.id);
          transcriptData = fullTranscript;
        }

        const transcript = this.convertToTranscript(transcriptData);

        console.log('[AssemblyAI] Converted transcript:', {
          segmentCount: transcript.segments.length,
          hasText: !!transcript.text,
          provider: transcript.provider,
        });

        return {
          jobId: payload.transcript_id || payload.id,
          status: 'completed',
          transcript,
        };
      } else if (payload.status === 'error') {
        return {
          jobId: payload.transcript_id || payload.id,
          status: 'failed',
          error: payload.error || 'Transcription failed',
        };
      } else {
        // Processing or other status
        return {
          jobId: payload.transcript_id || payload.id,
          status: payload.status,
        };
      }
    } catch (error) {
      console.error('[AssemblyAI] Failed to parse webhook payload:', error);
      throw new Error('Invalid AssemblyAI webhook payload');
    }
  }

  async getJobStatus(jobId: string): Promise<{ status: string; transcript?: Transcript }> {
    try {
      const transcript = await this.client.transcripts.get(jobId);

      if (transcript.status === 'completed') {
        return {
          status: 'completed',
          transcript: this.convertToTranscript(transcript),
        };
      } else if (transcript.status === 'error') {
        return {
          status: 'failed',
        };
      } else {
        return {
          status: transcript.status,
        };
      }
    } catch (error) {
      console.error('[AssemblyAI] Failed to get job status:', error);
      throw new Error(`Failed to get AssemblyAI job status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert AssemblyAI transcript to our standard format
   */
  private convertToTranscript(assemblyTranscript: any): Transcript {
    const segments: TranscriptSegment[] = [];

    // AssemblyAI provides utterances when speaker_labels is enabled
    if (assemblyTranscript.utterances && Array.isArray(assemblyTranscript.utterances)) {
      for (const utterance of assemblyTranscript.utterances) {
        segments.push({
          start: utterance.start / 1000, // Convert ms to seconds
          end: utterance.end / 1000,
          speaker: this.mapSpeakerLabel(utterance.speaker),
          text: utterance.text,
        });
      }
    } else if (assemblyTranscript.words && Array.isArray(assemblyTranscript.words)) {
      // Fallback: group words into segments if utterances aren't available
      let currentSegment: TranscriptSegment | null = null;

      for (const word of assemblyTranscript.words) {
        if (!currentSegment || word.speaker !== currentSegment.speaker) {
          if (currentSegment) {
            segments.push(currentSegment);
          }
          currentSegment = {
            start: word.start / 1000,
            end: word.end / 1000,
            speaker: this.mapSpeakerLabel(word.speaker),
            text: word.text,
          };
        } else {
          currentSegment.end = word.end / 1000;
          currentSegment.text += ' ' + word.text;
        }
      }

      if (currentSegment) {
        segments.push(currentSegment);
      }
    }

    return {
      text: assemblyTranscript.text || '',
      segments,
      provider: 'assemblyai',
      confidence: assemblyTranscript.confidence,
    };
  }

  /**
   * Map AssemblyAI speaker labels to our format
   * AssemblyAI uses "A", "B", "C" etc. We'll map A=tech, B=customer for now
   */
  private mapSpeakerLabel(speaker: string): SpeakerLabel {
    if (!speaker) return 'unknown';

    // Simple heuristic: first speaker is usually tech, second is customer
    switch (speaker.toUpperCase()) {
      case 'A':
        return 'tech';
      case 'B':
        return 'customer';
      default:
        return 'unknown';
    }
  }
}
