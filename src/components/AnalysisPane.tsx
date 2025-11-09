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
}

const QUALITY_COLORS = {
  excellent: '#10b981',
  good: '#3b82f6',
  ok: '#f59e0b',
  poor: '#ef4444',
};

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

// Progress Bar Component
const ProgressBar = ({ value, label, color }: { value: number; label: string; color: string }) => {
  const percentage = Math.round(value);
  const colorClasses = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    teal: 'bg-teal-500',
  };
  const bgColorClasses = {
    emerald: 'bg-emerald-500/10 border-emerald-500/30',
    blue: 'bg-blue-500/10 border-blue-500/30',
    purple: 'bg-purple-500/10 border-purple-500/30',
    teal: 'bg-teal-500/10 border-teal-500/30',
  };
  const textColorClasses = {
    emerald: 'text-emerald-300',
    blue: 'text-blue-300',
    purple: 'text-purple-300',
    teal: 'text-teal-300',
  };

  const colorKey = color as keyof typeof colorClasses;
  const bgClass = bgColorClasses[colorKey] || bgColorClasses.emerald;
  const textClass = textColorClasses[colorKey] || textColorClasses.emerald;
  const barClass = colorClasses[colorKey] || colorClasses.emerald;

  return (
    <div className={`rounded-lg border ${bgClass} p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-semibold ${textClass}`}>{label}</span>
        <span className={`text-xl font-bold ${textClass}`}>{percentage}%</span>
      </div>
      <div className="w-full bg-zinc-800/50 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full ${barClass} transition-all duration-500 ease-out rounded-full`}
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
  onTimestampClick
}: {
  stageName: string;
  stage: StageEvaluation;
  onTimestampClick?: (timestamp: number) => void;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const qualityColor = QUALITY_COLORS[stage.quality];
  const qualityText = stage.quality.charAt(0).toUpperCase() + stage.quality.slice(1);

  return (
    <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/30">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-800/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: qualityColor }}
          />
          <span className="text-base font-semibold text-white">{STAGE_NAMES[stageName]}</span>
          <span className="text-xs text-zinc-500">{qualityText}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-zinc-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Notes - Make this more prominent */}
          {stage.notes && (
            <div className="text-sm text-zinc-200 leading-relaxed bg-zinc-900/50 rounded-lg p-3 border border-zinc-700/30">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">Feedback</div>
              <p className="text-base text-white">{stage.notes}</p>
            </div>
          )}

          {/* Evidence */}
          {stage.evidence && stage.evidence.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-zinc-400">Evidence:</div>
              {stage.evidence.map((ev, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (ev.timestamp !== null && ev.timestamp !== undefined && onTimestampClick) {
                      onTimestampClick(ev.timestamp);
                    }
                  }}
                  disabled={ev.timestamp === null || ev.timestamp === undefined}
                  className={`w-full text-left bg-zinc-900/50 rounded p-2 border border-zinc-700/30 transition-all ${
                    ev.timestamp !== null && ev.timestamp !== undefined
                      ? 'hover:bg-zinc-800/70 hover:border-emerald-500/50 cursor-pointer'
                      : 'cursor-default'
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
              ))}
            </div>
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

export function AnalysisPane({ analysis, isLoading, onTimestampClick }: AnalysisPaneProps) {
  const [activeSection, setActiveSection] = useState('summary');
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
          <div className="p-6 space-y-8">
          {/* AI Summary */}
          <div
            ref={(el) => { sectionRefs.current.summary = el; }}
            className="scroll-mt-6"
          >
            <div className="mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Call Summary</h2>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 p-5">
              <p className="text-base text-zinc-200 leading-relaxed">
                {analysis.summary}
              </p>
            </div>
          </div>

          {/* Performance Metrics */}
          <div
            ref={(el) => { sectionRefs.current.metrics = el; }}
            className="scroll-mt-6"
          >
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Performance Metrics</h2>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <ProgressBar
                value={analysis.scores.complianceOverall}
                label="Compliance"
                color="emerald"
              />
              <ProgressBar
                value={analysis.scores.clarity}
                label="Clarity"
                color="blue"
              />
              <ProgressBar
                value={analysis.scores.empathy}
                label="Empathy"
                color="purple"
              />
              <ProgressBar
                value={analysis.scores.professionalism}
                label="Professionalism"
                color="teal"
              />
            </div>

            {/* Call Type */}
            <div className="mt-4 rounded-lg bg-gradient-to-r from-zinc-800/50 to-zinc-700/50 border border-zinc-700/50 p-4">
              <div className="text-xs text-zinc-400 uppercase tracking-wide font-medium mb-2">Call Type</div>
              <div className="text-lg font-semibold text-white flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                {analysis.callTypePrediction}
              </div>
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
              {Object.entries(analysis.stages).map(([key, stage]) => {
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
                return <StageDetail key={key} stageName={key} stage={stage} onTimestampClick={onTimestampClick} />;
              })}
            </div>
          </div>

          {/* Checklist */}
          <div
            ref={(el) => { sectionRefs.current.checklist = el; }}
            className="scroll-mt-6"
          >
            <div className="mb-4 flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Call Quality Checklist</h2>
            </div>
            <div className="space-y-3">
              {analysis.checklist.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.timestamp !== null && item.timestamp !== undefined && onTimestampClick) {
                      onTimestampClick(item.timestamp);
                    }
                  }}
                  disabled={item.timestamp === null && item.timestamp === undefined}
                  className={`w-full text-left rounded-lg border p-4 transition-all ${
                    item.passed
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-amber-500/30 bg-amber-500/5'
                  } ${
                    item.timestamp !== null && item.timestamp !== undefined
                      ? 'hover:scale-[1.01] hover:shadow-lg cursor-pointer'
                      : 'cursor-default'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {item.passed ? (
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-500 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-sm font-semibold text-white">{item.label}</div>
                        {item.timestamp !== null && item.timestamp !== undefined && (
                          <span className="text-xs text-emerald-400 font-mono">
                            {formatTimestamp(item.timestamp)}
                          </span>
                        )}
                      </div>
                      {item.evidence && (
                        <div className="mt-2 text-sm text-zinc-300 bg-zinc-900/50 rounded p-3 border border-zinc-700/30">
                          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Evidence</div>
                          <p className="text-base text-white italic">"{item.evidence}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
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
              <div className="space-y-4">
                {analysis.salesInsights.map((insight, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (insight.timestamp !== null && insight.timestamp !== undefined && onTimestampClick) {
                        onTimestampClick(insight.timestamp);
                      }
                    }}
                    disabled={insight.timestamp === null && insight.timestamp === undefined}
                    className={`w-full text-left rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 transition-all ${
                      insight.timestamp !== null && insight.timestamp !== undefined
                        ? 'hover:bg-blue-500/10 hover:border-blue-500/50 cursor-pointer'
                        : 'cursor-default'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        insight.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                        insight.severity === 'med' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {insight.severity?.toUpperCase() || 'INFO'}
                      </div>
                      {insight.timestamp !== undefined && insight.timestamp !== null && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-blue-400" />
                          <span className="text-xs text-blue-400 font-mono">
                            {formatTimestamp(insight.timestamp)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-base text-blue-200 mb-3 font-medium">{insight.note}</div>
                    {insight.snippet && (
                      <div className="mt-3 bg-zinc-900/50 rounded p-3 border border-blue-500/20">
                        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Quote</div>
                        <div className="text-sm italic text-zinc-300">"{insight.snippet}"</div>
                      </div>
                    )}
                  </button>
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
              <div className="space-y-4">
                {analysis.missedOpportunities.map((opportunity, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (opportunity.timestamp !== null && opportunity.timestamp !== undefined && onTimestampClick) {
                        onTimestampClick(opportunity.timestamp);
                      }
                    }}
                    disabled={opportunity.timestamp === null && opportunity.timestamp === undefined}
                    className={`w-full text-left rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 transition-all ${
                      opportunity.timestamp !== null && opportunity.timestamp !== undefined
                        ? 'hover:bg-amber-500/10 hover:border-amber-500/50 cursor-pointer'
                        : 'cursor-default'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="h-5 w-5 text-amber-400" />
                      {opportunity.timestamp !== undefined && opportunity.timestamp !== null && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-amber-400" />
                          <span className="text-xs text-amber-400 font-mono">
                            {formatTimestamp(opportunity.timestamp)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-base font-semibold text-amber-200 mb-3">{opportunity.recommendation}</div>
                    {opportunity.snippet && (
                      <div className="mt-3 bg-zinc-900/50 rounded p-3 border border-amber-500/20">
                        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">Quote</div>
                        <div className="text-sm italic text-zinc-300">"{opportunity.snippet}"</div>
                      </div>
                    )}
                  </button>
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
