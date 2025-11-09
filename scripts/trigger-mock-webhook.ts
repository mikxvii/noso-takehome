/**
 * Test Helper Script: Trigger Mock Transcription Webhook
 *
 * Usage:
 *   ts-node scripts/trigger-mock-webhook.ts <jobId>
 *
 * This script simulates a transcription provider webhook by:
 * 1. Generating mock transcript data with speaker diarization
 * 2. POSTing to the local webhook endpoint
 * 3. Triggering the analysis flow
 */

import { MockTranscriptionAdapter } from '../src/lib/adapters/mock-transcription.adapter';

async function triggerMockWebhook(jobId: string, baseUrl: string = 'http://localhost:3000') {
  console.log(`Triggering mock webhook for job: ${jobId}`);

  // Generate mock transcript
  const mockTranscript = MockTranscriptionAdapter.generateMockTranscript('mock-audio-url');

  const payload = {
    jobId,
    status: 'completed',
    transcript: mockTranscript,
  };

  // Generate signature
  const adapter = new MockTranscriptionAdapter();
  const payloadString = JSON.stringify(payload);
  const signature = adapter.generateWebhookSignature(payloadString);

  // POST to webhook endpoint
  const response = await fetch(`${baseUrl}/api/webhooks/transcription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-signature': signature,
    },
    body: payloadString,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Webhook failed: ${response.status}`, error);
    process.exit(1);
  }

  const result = await response.json();
  console.log('Webhook triggered successfully:', result);
  console.log('\nTranscript has been saved. Analysis should start automatically.');
}

// CLI usage
const jobId = process.argv[2];
const baseUrl = process.argv[3] || 'http://localhost:3000';

if (!jobId) {
  console.error('Usage: ts-node scripts/trigger-mock-webhook.ts <jobId> [baseUrl]');
  console.error('Example: ts-node scripts/trigger-mock-webhook.ts mock-job-abc123');
  process.exit(1);
}

triggerMockWebhook(jobId, baseUrl).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
