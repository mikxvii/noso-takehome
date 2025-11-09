'use client';

/**
 * TranscriptPane Component
 *
 * Middle panel displaying the transcript with speaker diarization.
 * Includes search and speaker filtering capabilities.
 * Enhanced with detailed loading states.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Loader2, FileText, Mic, Hash } from 'lucide-react';
import { TranscriptSegment, SpeakerLabel, Analysis } from '@/types/models';

interface TranscriptPaneProps {
  segments: TranscriptSegment[];
  analysis: Analysis | null;
  isLoading?: boolean;
  highlightTimestamp?: number | null;
  onSegmentClick?: (timestamp: number) => void;
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

export function TranscriptPane({ segments, analysis, isLoading, highlightTimestamp, onSegmentClick }: TranscriptPaneProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [speakerFilter, setSpeakerFilter] = useState<SpeakerLabel | 'all'>('all');
  const segmentRefs = useRef<(HTMLElement | null)[]>([]);

  // Count how many analysis annotations reference each segment
  const getAnnotationCount = (segment: TranscriptSegment): number => {
    if (!analysis) return 0;

    let count = 0;
    const segmentStart = segment.start;
    const segmentEnd = segment.end;

    // Helper to check if timestamp falls within segment
    const isInSegment = (timestamp: number | null | undefined): boolean => {
      if (timestamp === null || timestamp === undefined) return false;
      return timestamp >= segmentStart && timestamp <= segmentEnd;
    };

    // Check stage evidence
    Object.values(analysis.stages).forEach(stage => {
      if (stage.evidence) {
        stage.evidence.forEach(ev => {
          if (isInSegment(ev.timestamp)) count++;
        });
      }
    });

    // Check sales insights
    analysis.salesInsights.forEach(insight => {
      if (isInSegment(insight.timestamp)) count++;
    });

    // Check missed opportunities
    analysis.missedOpportunities.forEach(opp => {
      if (isInSegment(opp.timestamp)) count++;
    });

    // Check checklist items
    analysis.checklist.forEach(item => {
      if (isInSegment(item.timestamp)) count++;
    });

    return count;
  };

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

  // Scroll to and highlight segment when timestamp is clicked
  useEffect(() => {
    if (highlightTimestamp === null || highlightTimestamp === undefined) return;

    // Find the segment that contains this timestamp
    const targetIndex = segments.findIndex(
      seg => seg.start <= highlightTimestamp && seg.end >= highlightTimestamp
    );

    if (targetIndex !== -1 && segmentRefs.current[targetIndex]) {
      segmentRefs.current[targetIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [highlightTimestamp, segments]);

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
      {/* Header */}
      <div className="flex-shrink-0 border-b border-zinc-800 bg-zinc-900 px-6 py-4">
        <h1 className="text-2xl font-bold text-white">Transcript</h1>
      </div>

      {/* Search and Filters */}
      <div className="border-b border-zinc-800 p-4 space-y-3">

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
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
              <Mic className="h-6 w-6 text-blue-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center space-y-2">
              <div className="text-base font-semibold text-white">Transcribing Audio</div>
              <div className="text-sm text-zinc-400 max-w-sm">
                Our AI is converting speech to text and identifying speakers. This usually takes 30-60 seconds.
              </div>
              <div className="flex items-center gap-2 justify-center mt-4">
                <div className="flex gap-1">
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        ) : filteredSegments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <FileText className="h-12 w-12 text-zinc-600" />
            <div className="text-sm text-zinc-500 text-center">
              {searchQuery || speakerFilter !== 'all'
                ? 'No matching segments found'
                : 'No transcript available'}
            </div>
            {(searchQuery || speakerFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSpeakerFilter('all');
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="text-xs text-zinc-500 mb-2">
              {filteredSegments.length} {filteredSegments.length === 1 ? 'segment' : 'segments'}
              {searchQuery && ` matching "${searchQuery}"`}
            </div>
            {filteredSegments.map((segment, index) => {
              // Find the original index in the full segments array
              const originalIndex = segments.findIndex(
                seg => seg.start === segment.start && seg.text === segment.text
              );
              const isHighlighted =
                highlightTimestamp !== null &&
                highlightTimestamp !== undefined &&
                segment.start <= highlightTimestamp &&
                segment.end >= highlightTimestamp;

              const annotationCount = getAnnotationCount(segment);

              return (
                <button
                  key={index}
                  ref={(el) => {
                    if (originalIndex !== -1) {
                      segmentRefs.current[originalIndex] = el;
                    }
                  }}
                  onClick={() => {
                    if (onSegmentClick) {
                      onSegmentClick(segment.start);
                    }
                  }}
                  className={`w-full text-left rounded-lg border-l-4 p-3 transition-all cursor-pointer ${
                    speakerColors[segment.speaker]
                  } ${
                    isHighlighted
                      ? 'ring-2 ring-emerald-500 bg-emerald-500/20 scale-[1.02]'
                      : 'hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium text-emerald-400">
                      {speakerLabels[segment.speaker]}
                    </span>
                    <div className="flex items-center gap-2">
                      {annotationCount > 0 && (
                        <div className="flex items-center gap-1 bg-purple-500/20 border border-purple-500/30 rounded-full px-2 py-0.5">
                          <Hash className="h-3 w-3 text-purple-400" />
                          <span className="text-xs font-medium text-purple-400">{annotationCount}</span>
                        </div>
                      )}
                      <span className="text-xs text-zinc-500">
                        {formatTimestamp(segment.start)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-zinc-200">
                    {highlightText(segment.text, searchQuery)}
                  </p>
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
