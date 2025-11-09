'use client';

/**
 * UploadPane Component
 *
 * Left panel for audio file upload with drag-and-drop functionality.
 * Displays detailed upload progress and current processing status.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Upload, History, CheckCircle2, Loader2, Clock, FileAudio } from 'lucide-react';
import { CallStatus } from '@/types/models';

interface UploadPaneProps {
  onFileSelected: (file: File) => Promise<void>;
  status: CallStatus;
  progress: number;
  durationSec?: number;
  onHistoryToggle?: () => void;
  showingHistory?: boolean;
}

const statusLabels: Record<CallStatus, string> = {
  created: 'Created',
  uploading: 'Uploading...',
  transcribing: 'Transcribing...',
  transcribed: 'Transcribed',
  analyzing: 'Analyzing...',
  complete: 'Complete',
  failed: 'Failed',
};

const statusColors: Record<CallStatus, string> = {
  created: 'text-zinc-400',
  uploading: 'text-blue-500',
  transcribing: 'text-blue-500',
  transcribed: 'text-green-500',
  analyzing: 'text-purple-500',
  complete: 'text-emerald-500',
  failed: 'text-red-500',
};

const processingSteps = [
  { id: 'upload', label: 'Uploading audio file', status: 'uploading' as CallStatus },
  { id: 'transcribe', label: 'Transcribing audio', status: 'transcribing' as CallStatus },
  { id: 'analyze', label: 'Analyzing call quality', status: 'analyzing' as CallStatus },
  { id: 'complete', label: 'Processing complete', status: 'complete' as CallStatus },
];

export function UploadPane({
  onFileSelected,
  status,
  progress,
  durationSec,
  onHistoryToggle,
  showingHistory = false
}: UploadPaneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Track elapsed time during processing
  useEffect(() => {
    const isProcessing = ['uploading', 'transcribing', 'analyzing'].includes(status);
    
    if (isProcessing && startTime === null) {
      setStartTime(Date.now());
    } else if (!isProcessing && startTime !== null) {
      setStartTime(null);
      setElapsedTime(0);
    }

    if (isProcessing && startTime) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status, startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const audioFile = files.find(f =>
        f.type.startsWith('audio/') || f.name.match(/\.(mp3|wav|m4a|ogg)$/i)
      );

      if (audioFile) {
        await onFileSelected(audioFile);
      } else {
        alert('Please drop an audio file (.mp3, .wav, .m4a)');
      }
    },
    [onFileSelected]
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await onFileSelected(file);
      }
    },
    [onFileSelected]
  );

  const isProcessing = ['uploading', 'transcribing', 'analyzing'].includes(status);
  const currentStepIndex = processingSteps.findIndex(step => step.status === status);

  return (
    <div className="flex h-full flex-col bg-zinc-900">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-zinc-800 bg-zinc-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">
            {showingHistory ? 'Call History' : 'Upload Audio'}
          </h1>
          {onHistoryToggle && (
            <button
              onClick={onHistoryToggle}
              className={`
                rounded-lg p-2 transition-colors
                ${showingHistory
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }
              `}
              title={showingHistory ? 'Back to Upload' : 'View History'}
            >
              <History className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">

      {/* Drag and Drop Zone */}
      {!isProcessing && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative flex flex-1 flex-col items-center justify-center rounded-lg border-2 border-dashed
            transition-all
            ${isDragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-700 bg-zinc-800/50'}
            cursor-pointer hover:border-zinc-600
          `}
        >
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg"
            onChange={handleFileInput}
            disabled={isProcessing}
            className="absolute inset-0 cursor-pointer opacity-0"
            id="audio-upload"
          />

          <Upload className="mb-4 h-12 w-12 text-zinc-500" />
          <p className="mb-2 text-sm font-medium text-white">
            Drop audio file here
          </p>
          <p className="text-xs text-zinc-400">
            or click to browse
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Supports .mp3, .wav, .m4a
          </p>
        </div>
      )}

      {/* Detailed Processing Status */}
      {isProcessing && (
        <div className="flex flex-1 flex-col space-y-6">
          {/* Current Status Card */}
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-5">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0">
                <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-white mb-1">
                  {statusLabels[status]}
                </div>
                <div className="text-xs text-zinc-400">
                  {elapsedTime > 0 && `Processing for ${formatTime(elapsedTime)}`}
                </div>
              </div>
            </div>

            {/* Progress Bar - Separated */}
            <div className="mt-4 pt-4 border-t border-zinc-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-400">Progress</span>
                <span className="text-xs text-zinc-400 font-medium">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Step-by-Step Progress */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">
              Processing Steps
            </div>
            {processingSteps.map((step, index) => {
              const isActive = step.status === status;
              const isCompleted = currentStepIndex > index || status === 'complete';
              const isPending = currentStepIndex < index;

              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${
                    isActive
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : isCompleted
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-zinc-700/30 bg-zinc-800/20 opacity-50'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : isActive ? (
                      <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-zinc-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${
                      isActive ? 'text-white' : isCompleted ? 'text-emerald-400' : 'text-zinc-500'
                    }`}>
                      {step.label}
                    </div>
                    {isActive && (
                      <div className="mt-1 text-xs text-zinc-400">
                        {step.status === 'uploading' && 'Uploading your audio file to secure storage...'}
                        {step.status === 'transcribing' && 'Converting speech to text with AI transcription...'}
                        {step.status === 'analyzing' && 'Analyzing call quality, stages, and sales opportunities...'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Duration Display */}
          {durationSec && (
            <div className="flex items-center gap-2 rounded-lg border border-zinc-700/50 bg-zinc-800/30 p-3">
              <FileAudio className="h-4 w-4 text-zinc-400" />
              <div className="flex-1">
                <div className="text-xs text-zinc-400">Audio Duration</div>
                <div className="text-sm font-medium text-white">
                  {formatTime(durationSec)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Completed Status */}
      {status === 'complete' && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            <div className="text-sm font-semibold text-emerald-400">
              Processing Complete
            </div>
          </div>
          <div className="text-xs text-zinc-400">
            Your call has been transcribed and analyzed. View the results in the panels to the right.
          </div>
        </div>
      )}

      {/* Failed Status */}
      {status === 'failed' && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-5">
          <div className="text-sm font-semibold text-red-400">
            Processing Failed
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            Please try uploading again or contact support if the issue persists.
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
