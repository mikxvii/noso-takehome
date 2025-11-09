'use client';

import { useState } from 'react';
import { UploadPane } from '@/components/UploadPane';
import { TranscriptPane } from '@/components/TranscriptPane';
import { AnalysisPane } from '@/components/AnalysisPane';
import { useCall } from '@/hooks/useCall';

export default function Home() {
  const [currentCallId, setCurrentCallId] = useState<string | undefined>();
  const { call, uploadFile, progress } = useCall(currentCallId);

  const handleFileSelected = async (file: File) => {
    const callId = await uploadFile(file);
    if (callId) setCurrentCallId(callId);
  };

  return (
    <div className="flex h-screen bg-black">
      <div className="w-1/4 border-r border-zinc-800/50">
        <UploadPane
          onFileSelected={handleFileSelected}
          status={call?.status || 'created'}
          progress={progress}
          durationSec={call?.durationSec}
        />
      </div>

      <div className="w-1/2 border-r border-zinc-800/50">
        <TranscriptPane
          segments={call?.transcript?.segments || []}
          isLoading={call?.status === 'transcribing'}
        />
      </div>

      <div className="w-1/4">
        <AnalysisPane
          analysis={call?.analysis || null}
          isLoading={call?.status === 'analyzing'}
        />
      </div>
    </div>
  );
}
