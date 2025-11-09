/**
 * Test script for AssemblyAI integration
 * Run with: npx tsx scripts/test-assemblyai.ts
 */

import { AssemblyAI } from 'assemblyai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const apiKey = process.env.ASSEMBLYAI_API_KEY;

if (!apiKey) {
  console.error('❌ ASSEMBLYAI_API_KEY not found in .env.local');
  process.exit(1);
}

console.log('✓ API Key found');
console.log('Testing AssemblyAI integration...\n');

const client = new AssemblyAI({
  apiKey,
});

// Test with AssemblyAI's sample audio file
const audioFile = 'https://assembly.ai/wildfires.mp3';

const params = {
  audio: audioFile,
  speech_model: 'universal' as const,
  speaker_labels: true, // Enable speaker diarization
};

const run = async () => {
  try {
    console.log('Submitting transcription job...');
    console.log('Audio URL:', audioFile);
    console.log('Speaker labels enabled:', params.speaker_labels);
    console.log('');

    // Submit the job (async)
    const transcript = await client.transcripts.submit(params);

    console.log('✓ Job submitted successfully!');
    console.log('Job ID:', transcript.id);
    console.log('Status:', transcript.status);
    console.log('');

    // Wait for completion (polling)
    console.log('Waiting for transcription to complete...');
    const pollingResult = await client.transcripts.waitUntilReady(transcript.id);

    if (pollingResult.status === 'completed') {
      console.log('✓ Transcription completed!');
      console.log('');
      console.log('Full text:');
      console.log(pollingResult.text);
      console.log('');

      if (pollingResult.utterances && pollingResult.utterances.length > 0) {
        console.log('Speaker diarization results:');
        console.log(`Found ${pollingResult.utterances.length} utterances`);
        console.log('');
        console.log('First 3 utterances:');
        pollingResult.utterances.slice(0, 3).forEach((utterance, i) => {
          console.log(`${i + 1}. Speaker ${utterance.speaker}:`);
          console.log(`   "${utterance.text}"`);
          console.log(`   [${utterance.start}ms - ${utterance.end}ms]`);
          console.log('');
        });
      }
    } else if (pollingResult.status === 'error') {
      console.error('❌ Transcription failed:', pollingResult.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

run();
