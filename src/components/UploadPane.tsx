'use client';

/**
 * UploadPane Component
 *
 * Left panel for audio file upload with drag-and-drop functionality.
 * Displays upload progress and current processing status.
 */

import React, { useState, useCallback } from 'react';
import { Upload, History } from 'lucide-react';
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

export function UploadPane({
  onFileSelected,
  status,
  progress,
  durationSec,
  onHistoryToggle,
  showingHistory = false
}: UploadPaneProps) {
  const [isDragging, setIsDragging] = useState(false);

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

  return (
    <div className="flex h-full flex-col bg-zinc-900 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          {showingHistory ? 'Call History' : 'Upload Audio'}
        </h2>
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

      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative flex flex-1 flex-col items-center justify-center rounded-lg border-2 border-dashed
          transition-all
          ${isDragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-700 bg-zinc-800/50'}
          ${isProcessing ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:border-zinc-600'}
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

      {/* Status Display */}
      {status !== 'created' && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Status:</span>
            <span className={`text-sm font-medium ${statusColors[status]}`}>
              {statusLabels[status]}
            </span>
          </div>

          {/* Progress Bar */}
          {isProcessing && (
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Duration */}
          {durationSec && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Duration:</span>
              <span className="text-sm text-white">
                {Math.floor(durationSec / 60)}:{String(Math.floor(durationSec % 60)).padStart(2, '0')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
