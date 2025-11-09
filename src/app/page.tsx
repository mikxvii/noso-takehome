'use client';

import { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import { UploadPane } from '@/components/UploadPane';
import { CallHistory } from '@/components/CallHistory';
import { TranscriptPane } from '@/components/TranscriptPane';
import { AnalysisPane } from '@/components/AnalysisPane';
import { AudioPlayer } from '@/components/AudioPlayer';
import { useCall } from '@/hooks/useCall';
import { storage, ensureInitialized } from '@/lib/firebase/config';

// Prevent static generation - this page requires client-side Firebase
export const dynamic = 'force-dynamic';

export default function Home() {
  const [currentCallId, setCurrentCallId] = useState<string | undefined>();
  const [showHistory, setShowHistory] = useState(false);
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioSeekTime, setAudioSeekTime] = useState<number | null>(null);
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

  const handleTimestampClick = (timestamp: number) => {
    setSelectedTimestamp(timestamp);
    setAudioSeekTime(timestamp);
  };

  const handleAudioTimeUpdate = (currentTime: number) => {
    setSelectedTimestamp(currentTime);
  };

  // Initialize Firebase on mount
  useEffect(() => {
    ensureInitialized().catch(console.error);
  }, []);

  // Fetch audio URL when call changes
  useEffect(() => {
    const fetchAudioUrl = async () => {
      if (!call?.audioPath) {
        setAudioUrl(null);
        return;
      }

      try {
        // Ensure Firebase is initialized
        await ensureInitialized();
        
        // Check if audioPath is already an HTTPS URL
        if (call.audioPath.startsWith('https://')) {
          setAudioUrl(call.audioPath);
        } else {
          // It's a storage path, get download URL
          if (!storage) {
            console.error('Firebase Storage is not initialized');
            setAudioUrl(null);
            return;
          }
          // Dynamic import to avoid build-time execution
          const { ref, getDownloadURL } = await import('firebase/storage');
          const storageRef = ref(storage, call.audioPath);
          const url = await getDownloadURL(storageRef);
          setAudioUrl(url);
        }
      } catch (error) {
        console.error('Error fetching audio URL:', error);
        setAudioUrl(null);
      }
    };

    fetchAudioUrl();
  }, [call?.audioPath]);

  return (
    <div className="flex h-screen flex-col bg-black">
      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/5 border-r border-zinc-800/50">
          {showHistory ? (
            <div className="h-full flex flex-col bg-zinc-900">
              <div className="flex-shrink-0 border-b border-zinc-800 bg-zinc-900 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-white">Call History</h1>
                  <button
                    onClick={handleHistoryToggle}
                    className="rounded-lg p-2 bg-emerald-500/10 text-emerald-500 transition-colors hover:bg-emerald-500/20"
                    title="Back to Upload"
                  >
                    <Upload className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <CallHistory
                  userId="anonymous-user"
                  onCallSelected={handleCallSelected}
                  currentCallId={currentCallId}
                  onCallDeleted={handleCallDeleted}
                />
              </div>
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

        <div className="w-2/5 border-r border-zinc-800/50">
          <TranscriptPane
            segments={call?.transcript?.segments || []}
            isLoading={call?.status === 'transcribing'}
            highlightTimestamp={selectedTimestamp}
            onSegmentClick={handleTimestampClick}
          />
        </div>

        <div className="w-2/5">
          <AnalysisPane
            analysis={call?.analysis || null}
            isLoading={call?.status === 'analyzing'}
            onTimestampClick={handleTimestampClick}
          />
        </div>
      </div>

      {/* Audio Player at bottom */}
      <AudioPlayer
        audioUrl={audioUrl}
        onTimeUpdate={handleAudioTimeUpdate}
        seekToTime={audioSeekTime}
      />
    </div>
  );
}
