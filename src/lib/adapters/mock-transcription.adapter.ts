/**
 * Mock Transcription Adapter
 *
 * A simple mock implementation of TranscriptionPort for development and testing.
 * In production, replace this with AssemblyAI, Whisper, or another real provider.
 *
 * This adapter simulates async transcription by:
 * 1. Accepting a job submission
 * 2. Returning a mock job ID
 * 3. Allowing webhook simulation via a separate trigger
 */

import crypto from 'crypto';
import {
  TranscriptionPort,
  StartTranscriptionInput,
  StartTranscriptionResult,
  TranscriptionWebhookPayload,
} from '@/lib/ports/transcription.port';
import { Transcript, SpeakerLabel } from '@/types/models';

export class MockTranscriptionAdapter implements TranscriptionPort {
  private webhookSecret: string;

  constructor(webhookSecret?: string) {
    this.webhookSecret = webhookSecret || process.env.TRANSCRIPTION_WEBHOOK_SECRET || 'mock-secret-key';
  }

  async startJob(input: StartTranscriptionInput): Promise<StartTranscriptionResult> {
    // Generate a mock job ID
    const jobId = `mock-job-${crypto.randomUUID()}`;

    // In a real implementation, this would submit to the transcription API
    console.log('[MockTranscription] Job started:', {
      jobId,
      audioUrl: input.audioUrl,
      webhookUrl: input.webhookUrl,
    });

    // Simulate async processing - in development, you would manually trigger the webhook
    // or use a delayed worker to call the webhook URL with mock data

    return {
      jobId,
      status: 'processing',
    };
  }

  verifyWebhook(signature: string, payload: string): boolean {
    // Simple HMAC verification
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  parseWebhookPayload(rawPayload: unknown): TranscriptionWebhookPayload {
    // Mock parsing - assumes payload is already in our format
    const payload = rawPayload as TranscriptionWebhookPayload;

    if (!payload.jobId || !payload.status) {
      throw new Error('Invalid webhook payload: missing required fields');
    }

    return payload;
  }

  async getJobStatus(jobId: string): Promise<{ status: string; transcript?: Transcript }> {
    // Mock polling endpoint
    return {
      status: 'processing',
    };
  }

  /**
   * Helper method to generate mock transcript data for testing
   * This would not exist in a real adapter
   */
  static generateMockTranscript(audioUrl: string): Transcript {
    const mockSegments = [
      {
        start: 0,
        end: 5.2,
        speaker: 'tech' as SpeakerLabel,
        text: 'Hello, this is Mike from ABC Service. Am I speaking with John Smith?',
      },
      {
        start: 5.5,
        end: 7.8,
        speaker: 'customer' as SpeakerLabel,
        text: 'Yes, that\'s me. Thanks for calling back.',
      },
      {
        start: 8.0,
        end: 12.5,
        speaker: 'tech' as SpeakerLabel,
        text: 'Great! I understand you\'re having an issue with your HVAC system. Can you describe what\'s happening?',
      },
      {
        start: 13.0,
        end: 18.2,
        speaker: 'customer' as SpeakerLabel,
        text: 'Yeah, the air conditioning isn\'t cooling properly. It\'s been running but the house stays warm.',
      },
      {
        start: 18.5,
        end: 25.0,
        speaker: 'tech' as SpeakerLabel,
        text: 'I see. Let me ask a few questions to help diagnose this. Is the unit making any unusual noises?',
      },
      {
        start: 25.3,
        end: 28.0,
        speaker: 'customer' as SpeakerLabel,
        text: 'No, it sounds normal. Just not cooling.',
      },
      {
        start: 28.5,
        end: 35.0,
        speaker: 'tech' as SpeakerLabel,
        text: 'Okay, and when did you last have the system serviced or the filters changed?',
      },
      {
        start: 35.5,
        end: 39.0,
        speaker: 'customer' as SpeakerLabel,
        text: 'Hmm, probably about a year ago. Maybe longer.',
      },
      {
        start: 39.5,
        end: 48.0,
        speaker: 'tech' as SpeakerLabel,
        text: 'That could definitely be part of the problem. Based on what you\'re describing, it sounds like you might have a refrigerant issue or a clogged filter. I can come out this afternoon to take a look.',
      },
      {
        start: 48.5,
        end: 50.5,
        speaker: 'customer' as SpeakerLabel,
        text: 'That would be great, thank you.',
      },
      {
        start: 51.0,
        end: 60.0,
        speaker: 'tech' as SpeakerLabel,
        text: 'Perfect. While I\'m there, I\'d also recommend setting up a preventive maintenance plan. Regular servicing can prevent issues like this and extend the life of your system. Would you be interested in hearing more about that?',
      },
      {
        start: 60.5,
        end: 63.0,
        speaker: 'customer' as SpeakerLabel,
        text: 'Sure, that sounds good.',
      },
      {
        start: 63.5,
        end: 70.0,
        speaker: 'tech' as SpeakerLabel,
        text: 'Excellent. I\'ll bring information about our maintenance plans when I come by. Do you have any other questions for me right now?',
      },
      {
        start: 70.5,
        end: 72.0,
        speaker: 'customer' as SpeakerLabel,
        text: 'No, I think that covers it.',
      },
      {
        start: 72.5,
        end: 77.0,
        speaker: 'tech' as SpeakerLabel,
        text: 'Great! I\'ll see you this afternoon between 2 and 4 PM. Thanks for choosing ABC Service!',
      },
      {
        start: 77.5,
        end: 79.0,
        speaker: 'customer' as SpeakerLabel,
        text: 'Thank you, see you then.',
      },
    ];

    return {
      text: mockSegments.map(s => s.text).join(' '),
      segments: mockSegments,
      provider: 'other',
      confidence: 0.92,
    };
  }

  /**
   * Helper to generate a valid webhook signature for testing
   */
  generateWebhookSignature(payload: string): string {
    return crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');
  }
}
