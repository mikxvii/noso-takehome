'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { UploadPane } from '@/components/UploadPane';
import { CallHistory } from '@/components/CallHistory';
import { TranscriptPane } from '@/components/TranscriptPane';
import { AnalysisPane } from '@/components/AnalysisPane';
import { useCall } from '@/hooks/useCall';

export default function Home() {
  const [currentCallId, setCurrentCallId] = useState<string | undefined>();
  const [showHistory, setShowHistory] = useState(false);
  const { call, uploadFile, progress } = useCall(currentCallId);

  const handleFileSelected = async (file: File) => {
    const callId = await uploadFile(file);
    if (callId) {
      setCurrentCallId(callId);
      setShowHistory(false); // Switch back to upload view when new file is uploaded
    }
  };

  const handleCallSelected = (callId: string) => {
    setCurrentCallId(callId);
    setShowHistory(false); // Close history and show the selected call
  };

  const handleCallDeleted = (deletedCallId: string) => {
    // If the deleted call is currently selected, clear the selection
    if (currentCallId === deletedCallId) {
      setCurrentCallId(undefined);
    }
  };

  const handleHistoryToggle = () => {
    setShowHistory(!showHistory);
  };

  return (
    <div className="flex h-screen bg-black">
      <div className="w-1/4 border-r border-zinc-800/50">
        {showHistory ? (
          <div className="h-full flex flex-col bg-zinc-900">
            <div className="p-6 border-b border-zinc-800/50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Call History</h2>
                <button
                  onClick={handleHistoryToggle}
                  className="rounded-lg p-2 bg-emerald-500/10 text-emerald-500 transition-colors"
                  title="Back to Upload"
                >
                  <Upload className="h-5 w-5" />
                </button>
              </div>
            </div>
            <CallHistory
              userId="anonymous-user"
              onCallSelected={handleCallSelected}
              currentCallId={currentCallId}
              onCallDeleted={handleCallDeleted}
            />
          </div>
        ) : (
          <UploadPane
            onFileSelected={handleFileSelected}
            status={call?.status || 'created'}
            progress={progress}
            durationSec={call?.durationSec}
            onHistoryToggle={handleHistoryToggle}
            showingHistory={false}
          />
        )}
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
