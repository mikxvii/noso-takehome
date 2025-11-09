/**
 * AssemblyAI Transcription Adapter
 *
 * Production implementation of TranscriptionPort using AssemblyAI.
 * Supports speaker diarization and webhook callbacks.
 */

import { AssemblyAI } from 'assemblyai';
import OpenAI from 'openai';
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
      const webhookSecret = process.env.TRANSCRIPTION_WEBHOOK_SECRET;
      
      const params: any = {
        audio: input.audioUrl,
        speaker_labels: input.enableDiarization ?? true,
        speech_model: 'universal' as const,
        language_code: input.languageCode,
      };

      // Only include webhook URL if provided
      if (input.webhookUrl) {
        params.webhook_url = input.webhookUrl;
        
        // Only include webhook auth if secret is set (AssemblyAI requires non-empty value)
        if (webhookSecret) {
          params.webhook_auth_header_name = 'x-webhook-signature';
          params.webhook_auth_header_value = webhookSecret;
        } else {
          console.warn('[AssemblyAI] Webhook URL provided but TRANSCRIPTION_WEBHOOK_SECRET not set. Webhook will be unauthenticated.');
        }
      }

      console.log('[AssemblyAI] Submitting transcription with params:', {
        audio: input.audioUrl,
        speaker_labels: params.speaker_labels,
        webhook_url: input.webhookUrl,
        has_webhook_auth: !!webhookSecret,
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

        const transcript = await this.convertToTranscript(transcriptData);

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
          transcript: await this.convertToTranscript(transcript),
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
  private async convertToTranscript(assemblyTranscript: any): Promise<Transcript> {
    const rawSegments: Array<{ speaker: string; start: number; end: number; text: string }> = [];

    // AssemblyAI provides utterances when speaker_labels is enabled
    if (assemblyTranscript.utterances && Array.isArray(assemblyTranscript.utterances)) {
      for (const utterance of assemblyTranscript.utterances) {
        rawSegments.push({
          speaker: utterance.speaker,
          start: utterance.start / 1000, // Convert ms to seconds
          end: utterance.end / 1000,
          text: utterance.text,
        });
      }
    } else if (assemblyTranscript.words && Array.isArray(assemblyTranscript.words)) {
      // Fallback: group words into segments if utterances aren't available
      let currentSegment: { speaker: string; start: number; end: number; text: string } | null = null;

      for (const word of assemblyTranscript.words) {
        if (!currentSegment || word.speaker !== currentSegment.speaker) {
          if (currentSegment) {
            rawSegments.push(currentSegment);
          }
          currentSegment = {
            speaker: word.speaker,
            start: word.start / 1000,
            end: word.end / 1000,
            text: word.text,
          };
        } else {
          currentSegment.end = word.end / 1000;
          currentSegment.text += ' ' + word.text;
        }
      }

      if (currentSegment) {
        rawSegments.push(currentSegment);
      }
    }

    // Identify which speaker is the tech using AI
    const speakerMapping = await this.identifyTechSpeaker(rawSegments);

    // Map segments with correct speaker labels
    const segments: TranscriptSegment[] = rawSegments.map(seg => ({
      start: seg.start,
      end: seg.end,
      speaker: speakerMapping[seg.speaker] || 'unknown',
      text: seg.text,
    }));

    return {
      text: assemblyTranscript.text || '',
      segments,
      provider: 'assemblyai',
      confidence: assemblyTranscript.confidence,
    };
  }

  /**
   * Use AI to identify which speaker is the tech based on content analysis
   */
  private async identifyTechSpeaker(segments: Array<{ speaker: string; text: string }>): Promise<Record<string, SpeakerLabel>> {
    // Group segments by speaker
    const speakerGroups: Record<string, string[]> = {};
    for (const seg of segments) {
      if (!speakerGroups[seg.speaker]) {
        speakerGroups[seg.speaker] = [];
      }
      speakerGroups[seg.speaker].push(seg.text);
    }

    // Get unique speakers
    const speakers = Object.keys(speakerGroups);
    if (speakers.length === 0) {
      return {};
    }

    // If only one speaker, mark as unknown
    if (speakers.length === 1) {
      return { [speakers[0]]: 'unknown' };
    }

    // Use OpenAI to identify which speaker is the tech
    // Take first 5 segments from each speaker to analyze
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not set');
      }
      
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Build sample text from each speaker (first few segments)
      const speakerSamples: Record<string, string> = {};
      for (const speaker of speakers) {
        const samples = speakerGroups[speaker].slice(0, 5).join(' ');
        speakerSamples[speaker] = samples.substring(0, 500); // Limit to 500 chars per speaker
      }

      const prompt = `You are analyzing a phone call transcript between a field service technician and a customer.

Here are sample quotes from each speaker:

${speakers.map((sp, idx) => `Speaker ${sp}:
"${speakerSamples[sp]}"`).join('\n\n')}

Based on the content, identify which speaker is the FIELD SERVICE TECHNICIAN (tech) vs the CUSTOMER.

The technician typically:
- Introduces themselves with their name and company
- Asks diagnostic questions about problems
- Explains technical solutions
- Uses professional service language
- Mentions scheduling, repairs, or service work

The customer typically:
- Describes problems they're experiencing
- Asks questions about their situation
- Responds to the technician's questions
- May express concerns or satisfaction

Respond with ONLY a JSON object in this exact format:
{
  "techSpeaker": "<speaker letter, e.g., 'A' or 'B'>",
  "reasoning": "<brief explanation>"
}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at identifying speakers in service call transcripts. Respond only with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const response = JSON.parse(completion.choices[0].message.content || '{}');
      const techSpeaker = response.techSpeaker?.toUpperCase();

      console.log('[AssemblyAI] Speaker identification:', {
        techSpeaker,
        reasoning: response.reasoning,
        allSpeakers: speakers,
      });

      // Build mapping
      const mapping: Record<string, SpeakerLabel> = {};
      for (const speaker of speakers) {
        if (speaker.toUpperCase() === techSpeaker) {
          mapping[speaker] = 'tech';
        } else {
          mapping[speaker] = 'customer';
        }
      }

      return mapping;
    } catch (error) {
      console.error('[AssemblyAI] Failed to identify tech speaker, using fallback:', error);
      // Fallback: use first speaker as tech
      const mapping: Record<string, SpeakerLabel> = {};
      mapping[speakers[0]] = 'tech';
      for (let i = 1; i < speakers.length; i++) {
        mapping[speakers[i]] = 'customer';
      }
      return mapping;
    }
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
