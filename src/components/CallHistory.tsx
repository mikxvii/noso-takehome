'use client';

/**
 * CallHistory Component
 *
 * Displays a list of past call transcriptions with their status and metadata.
 * Allows users to click on any past call to view its transcript and analysis.
 */

import React, { useEffect, useState } from 'react';
import { Clock, FileAudio, CheckCircle, AlertCircle, XCircle, Trash2 } from 'lucide-react';
import { Call, CallStatus } from '@/types/models';

interface CallHistoryProps {
  userId: string;
  onCallSelected: (callId: string) => void;
  currentCallId?: string;
  onCallDeleted?: (callId: string) => void;
}

const statusIcons: Record<CallStatus, React.ReactNode> = {
  created: <Clock className="h-4 w-4 text-zinc-400" />,
  uploading: <Clock className="h-4 w-4 text-blue-500 animate-pulse" />,
  transcribing: <Clock className="h-4 w-4 text-blue-500 animate-pulse" />,
  transcribed: <CheckCircle className="h-4 w-4 text-green-500" />,
  analyzing: <Clock className="h-4 w-4 text-purple-500 animate-pulse" />,
  complete: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
};

const statusLabels: Record<CallStatus, string> = {
  created: 'Created',
  uploading: 'Uploading',
  transcribing: 'Transcribing',
  transcribed: 'Transcribed',
  analyzing: 'Analyzing',
  complete: 'Complete',
  failed: 'Failed',
};

export function CallHistory({ userId, onCallSelected, currentCallId, onCallDeleted }: CallHistoryProps) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingCallId, setDeletingCallId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/calls?userId=${encodeURIComponent(userId)}`);

        if (!response.ok) {
          throw new Error('Failed to fetch call history');
        }

        const data = await response.json();
        setCalls(data.calls || []);
      } catch (err) {
        console.error('Error fetching call history:', err);
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalls();

    // Refresh every 10 seconds to pick up new calls
    const interval = setInterval(fetchCalls, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const handleDelete = async (callId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering the call selection

    if (!confirm('Are you sure you want to delete this call? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingCallId(callId);

      const response = await fetch(`/api/calls/${callId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete call');
      }

      // Remove from local state
      setCalls(prevCalls => prevCalls.filter(call => call.id !== callId));

      // Notify parent component
      if (onCallDeleted) {
        onCallDeleted(callId);
      }

      console.log(`Call ${callId} deleted successfully`);
    } catch (err) {
      console.error('Error deleting call:', err);
      alert('Failed to delete call. Please try again.');
    } finally {
      setDeletingCallId(null);
    }
  };

  if (isLoading && calls.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <Clock className="mx-auto mb-2 h-8 w-8 animate-spin text-zinc-600" />
          <p className="text-sm text-zinc-400">Loading history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <FileAudio className="mx-auto mb-2 h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-400">No calls yet</p>
          <p className="mt-1 text-xs text-zinc-500">Upload an audio file to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="divide-y divide-zinc-800/50">
        {calls.map((call) => {
          const isSelected = call.id === currentCallId;
          const isComplete = call.status === 'complete';

          return (
            <div
              key={call.id}
              className={`
                relative w-full px-4 py-3 transition-colors
                ${isSelected
                  ? 'bg-emerald-500/10 border-l-2 border-emerald-500'
                  : 'hover:bg-zinc-800/50 border-l-2 border-transparent'
                }
              `}
            >
              <button
                onClick={() => onCallSelected(call.id)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {statusIcons[call.status]}
                    <span className="text-xs text-zinc-400">
                      {statusLabels[call.status]}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-sm text-white font-medium truncate">
                      Call {call.id.split('-').pop()}
                    </span>
                    {isComplete && call.analysis?.callTypePrediction && (
                      <span className="text-xs text-zinc-500">
                        • {call.analysis.callTypePrediction}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-zinc-500">
                      {formatDate(call.createdAt)}
                    </span>
                    {call.durationSec && (
                      <span className="text-xs text-zinc-500">
                        {formatDuration(call.durationSec)}
                      </span>
                    )}
                  </div>

                  {isComplete && call.analysis && (
                    <div className="mt-2 flex gap-2 text-xs">
                      <span className="text-emerald-400">
                        Score: {call.analysis.scores.complianceOverall}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </button>

            {/* Delete button */}
            <button
              onClick={(e) => handleDelete(call.id, e)}
              disabled={deletingCallId === call.id}
              className={`
                absolute top-3 right-3 p-1.5 rounded-md transition-colors
                ${deletingCallId === call.id
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-red-500/10 text-zinc-500 hover:text-red-500'
                }
              `}
              title="Delete call"
            >
              {deletingCallId === call.id ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
          </div>
          );
        })}
      </div>
    </div>
  );
}
