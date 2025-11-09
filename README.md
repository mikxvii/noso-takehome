# Service Call Recording Analysis System

AI-powered quality assurance platform for field service phone calls with automatic transcription, speaker diarization, and comprehensive compliance analysis.

## Features

- **Drag-and-Drop Upload**: Simple audio file upload (.mp3, .wav, .m4a)
- **Automatic Transcription**: Speaker diarization with tech/customer labeling
- **Real-time Updates**: Live UI updates as calls progress through processing stages
- **AI Analysis**: OpenAI-powered quality assessment including:
  - Compliance scoring (clarity, empathy, professionalism)
  - Stage-by-stage evaluation (introduction, diagnosis, solution, upsell, etc.)
  - Requirements checklist validation
  - Sales insights and missed opportunities
- **Interactive Transcript**: Search, filter by speaker, with timestamp references
- **Visual Analytics**: Pie charts for stage coverage and quality distribution

## Architecture

### Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (serverless)
- **Database**: Firebase Firestore (real-time)
- **Storage**: Firebase Cloud Storage
- **AI**: OpenAI GPT-4o-mini
- **Charts**: Recharts
- **Validation**: Zod schemas

### Design Patterns
- **Clean Architecture**: Port/Adapter pattern for swappable providers
- **Bottom-Up Build**: Data models → Ports → Adapters → API → UI
- **State Machine**: Call status flow (created → transcribing → transcribed → analyzing → complete)
- **Real-time Subscriptions**: Firestore onSnapshot for live UI updates

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Firebase project with Firestore and Storage enabled
- OpenAI API key

### Installation

1. Clone and install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

3. Configure `.env.local` with your credentials:
   - Firebase client config (get from Firebase Console > Project Settings)
   - Firebase Admin service account JSON (Project Settings > Service Accounts > Generate Private Key)
   - OpenAI API key

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

### Testing the Flow

Since this uses a mock transcription adapter for development:

1. Upload an audio file through the UI
2. The file will be uploaded to Firebase Storage
3. A Call document will be created in Firestore
4. To simulate transcription completion, you'll need to manually trigger the webhook (see below)

#### Simulating Transcription Webhook

Create a script or use a tool like Postman to POST to `/api/webhooks/transcription`:

```json
{
  "jobId": "YOUR_JOB_ID_FROM_FIRESTORE",
  "status": "completed",
  "transcript": {
    "text": "Full transcript text...",
    "segments": [
      {
        "start": 0,
        "end": 5,
        "speaker": "tech",
        "text": "Hello, this is the technician..."
      }
    ],
    "provider": "other",
    "confidence": 0.95
  }
}
```

Or use the MockTranscriptionAdapter helper method to generate sample data.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── calls/route.ts              # Create call & upload
│   │   ├── webhooks/
│   │   │   └── transcription/route.ts  # Receive transcript
│   │   └── analysis/
│   │       └── run/route.ts            # Run AI analysis
│   ├── layout.tsx
│   └── page.tsx                        # Main 3-pane UI
├── components/
│   ├── UploadPane.tsx                  # File upload UI
│   ├── TranscriptPane.tsx              # Transcript viewer
│   └── AnalysisPane.tsx                # Analysis results
├── hooks/
│   └── useCall.ts                      # Real-time call state
├── lib/
│   ├── adapters/                       # Concrete implementations
│   │   ├── openai-llm.adapter.ts
│   │   ├── mock-transcription.adapter.ts
│   │   └── firebase-storage.adapter.ts
│   ├── firebase/
│   │   ├── config.ts                   # Client SDK
│   │   └── admin.ts                    # Admin SDK
│   ├── ports/                          # Interface definitions
│   │   ├── llm-analysis.port.ts
│   │   ├── transcription.port.ts
│   │   └── storage.port.ts
│   └── validators/
│       └── schemas.ts                  # Zod validation
└── types/
    └── models.ts                       # TypeScript interfaces
```

## Deployment

### Vercel

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy!

### Environment Variables for Production
Ensure all env vars from `.env.example` are set in Vercel:
- Firebase config (NEXT_PUBLIC_*)
- FIREBASE_SERVICE_ACCOUNT_KEY (paste full JSON as string)
- OPENAI_API_KEY

## Swapping Providers

The port/adapter pattern makes it easy to swap services:

### Replace Mock Transcription with AssemblyAI
1. Create `src/lib/adapters/assemblyai.adapter.ts` implementing `TranscriptionPort`
2. Update `/api/calls/route.ts` to use `AssemblyAIAdapter` instead of `MockTranscriptionAdapter`
3. Add AssemblyAI API key to environment variables

### Use Gemini Instead of OpenAI
1. Create `src/lib/adapters/gemini-llm.adapter.ts` implementing `LLMAnalysisPort`
2. Update `/api/analysis/run/route.ts` to use new adapter
3. Ensure the adapter returns data matching the `analysisSchema` Zod schema

## License

MIT
