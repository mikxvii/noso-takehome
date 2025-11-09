'use client';

/**
 * AnalysisPane Component
 *
 * Right panel displaying comprehensive call analysis with:
 * - Sidebar navigation for quick section access
 * - Visual progress bars for performance metrics
 * - Enhanced readability for feedback items
 */

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronUp, BarChart3, ListChecks, Lightbulb, Target, MessageSquare, TrendingUp } from 'lucide-react';
import { Analysis, StageEvaluation } from '@/types/models';

interface AnalysisPaneProps {
  analysis: Analysis | null;
  isLoading?: boolean;
  onTimestampClick?: (timestamp: number) => void;
  highlightSegmentRange?: { start: number; end: number } | null;
}

const STAGE_NAMES: Record<string, string> = {
  introduction: 'Introduction',
  diagnosis: 'Problem Diagnosis',
  solutionExplanation: 'Solution Explanation',
  upsell: 'Upsell Attempt',
  maintenancePlan: 'Maintenance Plan',
  closing: 'Closing & Thank You',
};

const formatTimestamp = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

// Progress Bar Score Badge Component with visual grading
const ScoreBadge = ({ value, label, color }: { value: number; label: string; color: string }) => {
  const percentage = Math.round(value);

  // Grade based on percentage
  const getGrade = (score: number) => {
    if (score >= 90) return { letter: 'A', textColor: 'text-emerald-400', barColor: 'bg-emerald-500', borderColor: 'border-emerald-500/30', bgColor: 'bg-emerald-500/10' };
    if (score >= 80) return { letter: 'B', textColor: 'text-blue-400', barColor: 'bg-blue-500', borderColor: 'border-blue-500/30', bgColor: 'bg-blue-500/10' };
    if (score >= 70) return { letter: 'C', textColor: 'text-yellow-400', barColor: 'bg-yellow-500', borderColor: 'border-yellow-500/30', bgColor: 'bg-yellow-500/10' };
    if (score >= 60) return { letter: 'D', textColor: 'text-orange-400', barColor: 'bg-orange-500', borderColor: 'border-orange-500/30', bgColor: 'bg-orange-500/10' };
    return { letter: 'F', textColor: 'text-red-400', barColor: 'bg-red-500', borderColor: 'border-red-500/30', bgColor: 'bg-red-500/10' };
  };

  const grade = getGrade(percentage);

  return (
    <div className={`rounded-lg border ${grade.borderColor} ${grade.bgColor} p-3 overflow-hidden`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-base font-bold ${grade.textColor}`}>{label}</span>
        <span className={`text-2xl font-bold ${grade.textColor}`}>{grade.letter}</span>
      </div>
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${grade.barColor} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Sidebar Navigation Component
const SidebarNav = ({ sections, activeSection, onSectionClick }: {
  sections: Array<{ id: string; label: string; icon: React.ReactNode }>;
  activeSection: string;
  onSectionClick: (id: string) => void;
}) => {
  return (
    <div className="w-48 flex-shrink-0 border-r border-zinc-800 bg-zinc-900/50 p-4 space-y-1">
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => onSectionClick(section.id)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-sm ${
            activeSection === section.id
              ? 'bg-zinc-800 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
          }`}
        >
          {section.icon}
          <span>{section.label}</span>
        </button>
      ))}
    </div>
  );
};

const StageDetail = ({
  stageName,
  stage,
  onTimestampClick,
  isInHighlightedSegment
}: {
  stageName: string;
  stage: StageEvaluation;
  onTimestampClick?: (timestamp: number) => void;
  isInHighlightedSegment?: (timestamp: number | null | undefined) => boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showEvidence, setShowEvidence] = useState(false);

  const qualityText = stage.quality.charAt(0).toUpperCase() + stage.quality.slice(1);

  // Get quality badge style
  const getQualityBadge = (quality: string) => {
    const badges = {
      excellent: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
      good: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
      ok: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
      poor: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    };
    return badges[quality as keyof typeof badges] || badges.ok;
  };

  const badge = getQualityBadge(stage.quality);

  return (
    <div className={`rounded-lg border ${badge.border} bg-zinc-800/30`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-800/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3 flex-1">
          <div className={`px-3 py-1 rounded-md ${badge.bg} ${badge.text} border ${badge.border}`}>
            <span className="text-xs font-bold uppercase">{qualityText}</span>
          </div>
          <span className="text-sm font-semibold text-white">{STAGE_NAMES[stageName]}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-zinc-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Feedback with strengths/weaknesses if structured */}
          {stage.notes && (
            <div className="text-sm text-zinc-200 leading-relaxed">
              {stage.notes.split('\n').map((line, idx) => {
                // Check if line starts with **text**: to make it bold
                if (line.trim().startsWith('**') && line.includes('**')) {
                  const boldText = line.match(/\*\*(.*?)\*\*/)?.[1] || '';
                  const restText = line.replace(/\*\*.*?\*\*/, '');
                  return (
                    <div key={idx} className="font-bold text-white mt-3 first:mt-0">
                      {boldText}{restText}
                    </div>
                  );
                }
                // Check if line starts with - for bullet points
                if (line.trim().startsWith('-')) {
                  return (
                    <div key={idx} className="ml-4 text-zinc-300">
                      • {line.trim().substring(1).trim()}
                    </div>
                  );
                }
                // Empty lines for spacing
                if (line.trim() === '') {
                  return <div key={idx} className="h-2" />;
                }
                // Regular text
                return <div key={idx} className="text-zinc-300">{line}</div>;
              })}
            </div>
          )}

          {/* Collapsible Evidence */}
          {stage.evidence && stage.evidence.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setShowEvidence(!showEvidence)}
                className="flex items-center gap-2 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {showEvidence ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                <span>{showEvidence ? 'Hide' : 'Show'} Evidence ({stage.evidence.length})</span>
              </button>
              {showEvidence && (
                <div className="space-y-2 pl-2">
                  {stage.evidence.map((ev, idx) => {
                    const isHighlighted = isInHighlightedSegment ? isInHighlightedSegment(ev.timestamp) : false;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          if (ev.timestamp !== null && ev.timestamp !== undefined && onTimestampClick) {
                            onTimestampClick(ev.timestamp);
                          }
                        }}
                        disabled={ev.timestamp === null || ev.timestamp === undefined}
                        className={`w-full text-left bg-zinc-900/50 rounded p-2 border transition-all ${
                          ev.timestamp !== null && ev.timestamp !== undefined
                            ? 'hover:bg-zinc-800/70 hover:border-emerald-500/50 cursor-pointer'
                            : 'cursor-default'
                        } ${
                          isHighlighted
                            ? 'ring-2 ring-purple-500 bg-purple-500/20 border-purple-500/50'
                            : 'border-zinc-700/30'
                        }`}
                      >
                      <div className="flex items-start gap-2 mb-1">
                        <Clock className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-emerald-400 font-mono">
                          {formatTimestamp(ev.timestamp || 0)}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-300 italic pl-5">
                        "{ev.quote}"
                      </div>
                    </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Checklist Item Component (to avoid hook violations)
const ChecklistItem = ({
  item,
  onTimestampClick,
  isHighlighted
}: {
  item: { id: string; label: string; passed: boolean; evidence?: string; timestamp?: number | null };
  onTimestampClick?: (timestamp: number) => void;
  isHighlighted?: boolean;
}) => {
  const [showEvidence, setShowEvidence] = useState(false);

  return (
    <div className="group">
      <div
        onClick={() => {
          if (item.timestamp !== null && item.timestamp !== undefined && onTimestampClick) {
            onTimestampClick(item.timestamp);
          }
        }}
        className={`w-full text-left py-2 px-2 rounded transition-colors ${
          item.timestamp !== null && item.timestamp !== undefined
            ? 'hover:bg-zinc-700/30 cursor-pointer'
            : 'cursor-default'
        } ${isHighlighted ? 'ring-2 ring-purple-500 bg-purple-500/20' : ''}`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
            item.passed
              ? 'bg-emerald-500 border-emerald-500'
              : 'bg-zinc-800 border-amber-500'
          }`}>
            {item.passed && (
              <CheckCircle2 className="h-3 w-3 text-white" strokeWidth={3} />
            )}
          </div>
          <span className={`text-sm flex-1 ${item.passed ? 'text-zinc-300' : 'text-amber-300'}`}>
            {item.label}
          </span>
          {item.timestamp !== null && item.timestamp !== undefined && (
            <span className="text-xs text-emerald-400 font-mono">
              {formatTimestamp(item.timestamp)}
            </span>
          )}
          {item.evidence && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowEvidence(!showEvidence);
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 ml-1"
            >
              {showEvidence ? '▼' : '▶'}
            </button>
          )}
        </div>
      </div>
      {item.evidence && showEvidence && (
        <div className="ml-6 mt-1 mb-2 text-xs text-zinc-400 italic bg-zinc-900/50 rounded p-2 border border-zinc-700/30">
          "{item.evidence}"
        </div>
      )}
    </div>
  );
};

// Sales Insight Item Component with collapsible evidence
const SalesInsightItem = ({
  insight,
  onTimestampClick,
  isHighlighted
}: {
  insight: { snippet?: string; timestamp?: number | null; note: string; severity?: string };
  onTimestampClick?: (timestamp: number) => void;
  isHighlighted?: boolean;
}) => {
  const [showEvidence, setShowEvidence] = useState(false);

  const severityStyle = insight.severity === 'high'
    ? { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badgeBg: 'bg-emerald-500/20' }
    : insight.severity === 'med'
    ? { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', badgeBg: 'bg-yellow-500/20' }
    : { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badgeBg: 'bg-red-500/20' };

  return (
    <div className={`rounded-lg border ${severityStyle.border} ${severityStyle.bg} p-4 transition-all ${
      isHighlighted ? 'ring-2 ring-purple-500 bg-purple-500/20 scale-[1.02]' : ''
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`px-3 py-1 rounded-md text-xs font-bold ${severityStyle.badgeBg} ${severityStyle.text}`}>
          {insight.severity?.toUpperCase() || 'INFO'}
        </div>
        {insight.timestamp !== undefined && insight.timestamp !== null && (
          <button
            onClick={() => {
              if (onTimestampClick) {
                onTimestampClick(insight.timestamp!);
              }
            }}
            className="flex items-center gap-1 hover:opacity-80 transition-opacity"
          >
            <Clock className={`h-3 w-3 ${severityStyle.text}`} />
            <span className={`text-xs font-mono ${severityStyle.text}`}>
              {formatTimestamp(insight.timestamp)}
            </span>
          </button>
        )}
      </div>
      <div className={`text-sm font-medium mb-2 ${severityStyle.text}`}>{insight.note}</div>

      {/* Collapsible Evidence */}
      {insight.snippet && (
        <div className="space-y-2">
          <button
            onClick={() => setShowEvidence(!showEvidence)}
            className={`flex items-center gap-2 text-xs font-medium ${severityStyle.text} hover:opacity-80 transition-opacity`}
          >
            {showEvidence ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <span>{showEvidence ? 'Hide' : 'Show'} Evidence</span>
          </button>
          {showEvidence && (
            <button
              onClick={() => {
                if (insight.timestamp !== null && insight.timestamp !== undefined && onTimestampClick) {
                  onTimestampClick(insight.timestamp);
                }
              }}
              disabled={insight.timestamp === null || insight.timestamp === undefined}
              className={`w-full text-left bg-zinc-900/50 rounded p-2 border border-zinc-700/30 transition-all ${
                insight.timestamp !== null && insight.timestamp !== undefined
                  ? 'hover:bg-zinc-800/70 hover:border-emerald-500/50 cursor-pointer'
                  : 'cursor-default'
              }`}
            >
              <div className="text-xs italic text-zinc-300">"{insight.snippet}"</div>
              {insight.timestamp !== null && insight.timestamp !== undefined && (
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-zinc-500" />
                  <span className="text-xs text-zinc-500">Click to view in transcript</span>
                </div>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Missed Opportunity Item Component with collapsible evidence
const MissedOpportunityItem = ({
  opportunity,
  onTimestampClick,
  isHighlighted
}: {
  opportunity: { recommendation: string; snippet?: string; timestamp?: number | null };
  onTimestampClick?: (timestamp: number) => void;
  isHighlighted?: boolean;
}) => {
  const [showEvidence, setShowEvidence] = useState(false);

  return (
    <div className={`rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 transition-all ${
      isHighlighted ? 'ring-2 ring-purple-500 bg-purple-500/20 scale-[1.02]' : ''
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-bold text-amber-400 uppercase">Opportunity</span>
        </div>
        {opportunity.timestamp !== undefined && opportunity.timestamp !== null && (
          <button
            onClick={() => {
              if (onTimestampClick) {
                onTimestampClick(opportunity.timestamp!);
              }
            }}
            className="flex items-center gap-1 hover:opacity-80 transition-opacity"
          >
            <Clock className="h-3 w-3 text-amber-400" />
            <span className="text-xs text-amber-400 font-mono">
              {formatTimestamp(opportunity.timestamp)}
            </span>
          </button>
        )}
      </div>
      <div className="text-sm font-medium text-amber-300 mb-2">{opportunity.recommendation}</div>

      {/* Collapsible Evidence */}
      {opportunity.snippet && (
        <div className="space-y-2">
          <button
            onClick={() => setShowEvidence(!showEvidence)}
            className="flex items-center gap-2 text-xs font-medium text-amber-400 hover:opacity-80 transition-opacity"
          >
            {showEvidence ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <span>{showEvidence ? 'Hide' : 'Show'} Evidence</span>
          </button>
          {showEvidence && (
            <button
              onClick={() => {
                if (opportunity.timestamp !== null && opportunity.timestamp !== undefined && onTimestampClick) {
                  onTimestampClick(opportunity.timestamp);
                }
              }}
              disabled={opportunity.timestamp === null || opportunity.timestamp === undefined}
              className={`w-full text-left bg-zinc-900/50 rounded p-2 border border-zinc-700/30 transition-all ${
                opportunity.timestamp !== null && opportunity.timestamp !== undefined
                  ? 'hover:bg-zinc-800/70 hover:border-amber-500/50 cursor-pointer'
                  : 'cursor-default'
              }`}
            >
              <div className="text-xs italic text-zinc-300">"{opportunity.snippet}"</div>
              {opportunity.timestamp !== null && opportunity.timestamp !== undefined && (
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-zinc-500" />
                  <span className="text-xs text-zinc-500">Click to view in transcript</span>
                </div>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const NAV_SECTIONS = [
  { id: 'summary', label: 'Summary', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'metrics', label: 'Metrics', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'stages', label: 'Stages', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'checklist', label: 'Checklist', icon: <ListChecks className="h-4 w-4" /> },
  { id: 'insights', label: 'Insights', icon: <Lightbulb className="h-4 w-4" /> },
  { id: 'opportunities', label: 'Opportunities', icon: <Target className="h-4 w-4" /> },
];

export function AnalysisPane({ analysis, isLoading, onTimestampClick, highlightSegmentRange }: AnalysisPaneProps) {
  const [activeSection, setActiveSection] = useState('summary');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Helper to check if a timestamp falls within the highlighted segment range
  const isInHighlightedSegment = (timestamp: number | null | undefined): boolean => {
    if (!highlightSegmentRange || timestamp === null || timestamp === undefined) {
      return false;
    }
    return timestamp >= highlightSegmentRange.start && timestamp <= highlightSegmentRange.end;
  };

  const scrollToSection = (sectionId: string) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  };

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const container = document.querySelector('.analysis-content');
      if (!container) return;
      
      const scrollPosition = container.scrollTop + 100;
      for (const section of NAV_SECTIONS) {
        const element = sectionRefs.current[section.id];
        if (element) {
          const containerRect = container.getBoundingClientRect();
          const elementRect = element.getBoundingClientRect();
          const relativeTop = elementRect.top - containerRect.top + container.scrollTop;
          
          if (scrollPosition >= relativeTop && scrollPosition < relativeTop + elementRect.height) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    const container = document.querySelector('.analysis-content');
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [analysis]);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col bg-zinc-900">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-zinc-800 bg-zinc-900 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Analysis</h1>
        </div>

        {/* Loading Content */}
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md space-y-6 text-center">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-purple-500/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full bg-purple-500 animate-pulse"></div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Analyzing Call Quality</h3>
              <p className="text-sm text-zinc-400">
                Our AI is analyzing conversation stages, identifying sales opportunities, and evaluating performance metrics.
              </p>
            </div>

            {/* Analysis Steps */}
            <div className="space-y-3 text-left">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                Analysis Progress
              </div>
              {[
                { label: 'Evaluating conversation stages', icon: '✓' },
                { label: 'Analyzing sales insights', icon: '✓' },
                { label: 'Calculating performance metrics', icon: '⏳' },
                { label: 'Generating recommendations', icon: '○' },
              ].map((step, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                    step.icon === '✓' ? 'bg-emerald-500/20 text-emerald-400' :
                    step.icon === '⏳' ? 'bg-purple-500/20 text-purple-400 animate-pulse' :
                    'bg-zinc-800 text-zinc-600'
                  }`}>
                    {step.icon === '⏳' ? (
                      <div className="h-2 w-2 rounded-full bg-purple-400 animate-pulse"></div>
                    ) : (
                      step.icon
                    )}
                  </div>
                  <span className={step.icon === '✓' ? 'text-emerald-400' : step.icon === '⏳' ? 'text-white' : 'text-zinc-500'}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-500">
                This typically takes 10-30 seconds depending on call length
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-900 p-6">
        <div className="text-center">
          <p className="text-sm text-zinc-500">No analysis available yet</p>
          <p className="mt-2 text-xs text-zinc-600">
            Upload and transcribe a call to see analysis
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-zinc-900">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-zinc-800 bg-zinc-900 px-6 py-4">
        <h1 className="text-2xl font-bold text-white">Analysis</h1>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <SidebarNav
          sections={NAV_SECTIONS}
          activeSection={activeSection}
          onSectionClick={scrollToSection}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto analysis-content">
          <div className="p-6 space-y-6">
          {/* Call Type - Moved to top */}
          <div
            ref={(el) => { sectionRefs.current.summary = el; }}
            className="scroll-mt-6"
          >
            <div className="rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 p-4">
              <div className="text-xs text-amber-300/70 uppercase tracking-wide font-medium mb-2">Call Type</div>
              <div className="text-xl font-bold text-white flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                {analysis.callTypePrediction}
              </div>
            </div>
          </div>

          {/* AI Summary */}
          <div className="scroll-mt-6">
            <div className="mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Summary</h3>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 p-4">
              <p className="text-sm text-zinc-200 leading-relaxed">
                {analysis.summary}
              </p>
            </div>
          </div>

          {/* General Feedback */}
          <div className="scroll-mt-6">
            <div className="mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide">General Feedback</h3>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 p-4 space-y-3">
              {analysis.generalFeedback.split('\n\n').map((paragraph: string, idx: number) => (
                <p key={idx} className="text-sm text-zinc-200 leading-relaxed">
                  {paragraph.trim()}
                </p>
              ))}
            </div>
          </div>

          {/* Performance Metrics - Compressed */}
          <div
            ref={(el) => { sectionRefs.current.metrics = el; }}
            className="scroll-mt-6"
          >
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Performance</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ScoreBadge
                value={analysis.scores.complianceOverall}
                label="Compliance"
                color="emerald"
              />
              <ScoreBadge
                value={analysis.scores.clarity}
                label="Clarity"
                color="blue"
              />
              <ScoreBadge
                value={analysis.scores.empathy}
                label="Empathy"
                color="purple"
              />
              <ScoreBadge
                value={analysis.scores.professionalism}
                label="Professionalism"
                color="teal"
              />
            </div>
          </div>

          {/* Stage Analysis */}
          <div
            ref={(el) => { sectionRefs.current.stages = el; }}
            className="scroll-mt-6"
          >
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Conversation Stages</h2>
            </div>
            <div className="space-y-3">
              {/* Sort stages chronologically */}
              {(['introduction', 'diagnosis', 'solutionExplanation', 'upsell', 'maintenancePlan', 'closing'] as const)
                .map(key => [key, analysis.stages[key]] as const)
                .map(([key, stage]) => {
                if (!stage.present) {
                  return (
                    <div key={key} className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-zinc-600" />
                        <span className="text-base font-semibold text-zinc-400">{STAGE_NAMES[key]}</span>
                        <span className="text-xs text-zinc-600">Not Present</span>
                      </div>
                      {stage.notes && (
                        <div className="mt-2 text-xs text-zinc-500 pl-5">{stage.notes}</div>
                      )}
                    </div>
                  );
                }
                return <StageDetail key={key} stageName={key} stage={stage} onTimestampClick={onTimestampClick} isInHighlightedSegment={isInHighlightedSegment} />;
              })}
            </div>
          </div>

          {/* Checklist - Actual checklist style */}
          <div
            ref={(el) => { sectionRefs.current.checklist = el; }}
            className="scroll-mt-6"
          >
            <div className="mb-3 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wide">Quality Checklist</h3>
            </div>
            <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/20 p-3">
              <div className="space-y-1">
                {analysis.checklist.map((item) => (
                  <ChecklistItem
                    key={item.id}
                    item={item}
                    onTimestampClick={onTimestampClick}
                    isHighlighted={isInHighlightedSegment(item.timestamp)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Insights */}
          {analysis.salesInsights.length > 0 && (
            <div
              ref={(el) => { sectionRefs.current.insights = el; }}
              className="scroll-mt-6"
            >
              <div className="mb-4 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Sales Insights</h2>
              </div>
              <div className="space-y-3">
                {analysis.salesInsights.map((insight, index) => (
                  <SalesInsightItem
                    key={index}
                    insight={insight}
                    onTimestampClick={onTimestampClick}
                    isHighlighted={isInHighlightedSegment(insight.timestamp)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Missed Opportunities */}
          {analysis.missedOpportunities.length > 0 && (
            <div
              ref={(el) => { sectionRefs.current.opportunities = el; }}
              className="scroll-mt-6"
            >
              <div className="mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-white">Missed Opportunities</h2>
              </div>
              <div className="space-y-3">
                {analysis.missedOpportunities.map((opportunity, index) => (
                  <MissedOpportunityItem
                    key={index}
                    opportunity={opportunity}
                    onTimestampClick={onTimestampClick}
                    isHighlighted={isInHighlightedSegment(opportunity.timestamp)}
                  />
                ))}
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
