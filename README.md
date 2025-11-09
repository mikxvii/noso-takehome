# Service Call Recording Analysis System

AI-powered quality assurance platform for field service phone calls with automatic transcription, speaker diarization, and comprehensive compliance analysis.

## Features

- **Audio Upload**: Drag-and-drop interface for `.mp3`, `.wav`, `.m4a` files
- **Automatic Transcription**: Speaker diarization with tech/customer labeling
- **AI Analysis**: Compliance scoring, stage evaluation, sales insights, and quality checklist
- **Real-time Updates**: Live UI updates via Firestore subscriptions
- **Interactive Transcript**: Search, filter by speaker, click-to-seek audio playback

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Firebase Firestore
- **Storage**: Firebase Cloud Storage
- **AI**: OpenAI GPT-4o-mini (analysis), AssemblyAI (transcription)

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase project (Firestore + Storage)
- OpenAI API key
- AssemblyAI API key (optional, uses mock if not set)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env.local`:

```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin (use service account file or env var)
# Option 1: Save as firebase-service-account.json in project root
# Option 2: Format JSON and set as:
FIREBASE_SERVICE_ACCOUNT_KEY={...}

# AI Services
OPENAI_API_KEY=sk-...
ASSEMBLYAI_API_KEY=...  # Optional
```

3. Run development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

### Firebase Setup

1. Create Firestore composite index on `calls` collection:
   - Fields: `userId` (Ascending), `createdAt` (Descending)
   - Or use `firestore.indexes.json`

2. Configure Storage CORS:
```bash
npm run setup-cors
```

## Project Structure

```
src/
├── app/
│   ├── api/                    # API routes
│   │   ├── calls/             # Call management
│   │   ├── analysis/           # AI analysis
│   │   └── webhooks/          # Transcription webhooks
│   └── page.tsx               # Main UI
├── components/                 # React components
├── hooks/                      # Custom hooks
├── lib/
│   ├── adapters/              # Provider implementations
│   ├── ports/                 # Interface definitions
│   ├── firebase/              # Firebase config
│   └── validators/            # Zod schemas
└── types/                     # TypeScript types
```

## API Endpoints

- `POST /api/calls` - Create call and get upload URL
- `GET /api/calls?userId=xxx` - Get call history
- `POST /api/calls/[callId]/start-transcription` - Start transcription
- `POST /api/analysis/run` - Run AI analysis
- `POST /api/webhooks/transcription` - Receive transcription webhook

## Architecture

Uses port/adapter pattern for swappable providers:
- **Ports** (`src/lib/ports/`): Interface definitions
- **Adapters** (`src/lib/adapters/`): Provider implementations

Call status flow: `created → uploading → transcribing → transcribed → analyzing → complete`

## License

MIT
