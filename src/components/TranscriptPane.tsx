'use client';

/**
 * TranscriptPane Component
 *
 * Middle panel displaying the transcript with speaker diarization.
 * Includes search and speaker filtering capabilities.
 */

import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { TranscriptSegment, SpeakerLabel } from '@/types/models';

interface TranscriptPaneProps {
  segments: TranscriptSegment[];
  isLoading?: boolean;
}

const speakerColors: Record<SpeakerLabel, string> = {
  tech: 'border-l-teal-500 bg-teal-500/5',
  customer: 'border-l-amber-500 bg-amber-500/5',
  unknown: 'border-l-zinc-600 bg-zinc-800/30',
};

const speakerLabels: Record<SpeakerLabel, string> = {
  tech: 'Tech',
  customer: 'Customer',
  unknown: 'Unknown',
};

export function TranscriptPane({ segments, isLoading }: TranscriptPaneProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [speakerFilter, setSpeakerFilter] = useState<SpeakerLabel | 'all'>('all');

  // Filter and search segments
  const filteredSegments = useMemo(() => {
    let filtered = segments;

    // Filter by speaker
    if (speakerFilter !== 'all') {
      filtered = filtered.filter(seg => seg.speaker === speakerFilter);
    }

    // Search in text
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(seg =>
        seg.text.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [segments, speakerFilter, searchQuery]);

  // Format timestamp as mm:ss
  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Highlight search matches
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-yellow-500/30 text-white">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="flex h-full flex-col bg-zinc-900">
      {/* Header with Search and Filters */}
      <div className="border-b border-zinc-800 p-4 space-y-3">
        <h2 className="text-lg font-semibold text-white">Transcript</h2>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-10 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Speaker Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setSpeakerFilter('all')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              speakerFilter === 'all'
                ? 'bg-emerald-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSpeakerFilter('tech')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              speakerFilter === 'tech'
                ? 'bg-teal-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Tech
          </button>
          <button
            onClick={() => setSpeakerFilter('customer')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              speakerFilter === 'customer'
                ? 'bg-amber-500 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Customer
          </button>
        </div>
      </div>

      {/* Transcript List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-zinc-500">Loading transcript...</div>
          </div>
        ) : filteredSegments.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-zinc-500">
              {searchQuery || speakerFilter !== 'all'
                ? 'No matching segments found'
                : 'No transcript available'}
            </div>
          </div>
        ) : (
          filteredSegments.map((segment, index) => (
            <div
              key={index}
              className={`rounded-lg border-l-4 p-3 ${speakerColors[segment.speaker]}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-400">
                  {speakerLabels[segment.speaker]}
                </span>
                <span className="text-xs text-zinc-500">
                  {formatTimestamp(segment.start)}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-zinc-200">
                {highlightText(segment.text, searchQuery)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
