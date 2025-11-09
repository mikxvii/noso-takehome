'use client';

/**
 * AnalysisPane Component
 *
 * Right panel displaying comprehensive call analysis:
 * - KPI scores
 * - Stage compliance charts
 * - Quality distribution charts
 * - Requirements checklist
 */

import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { Analysis, StageEvaluation } from '@/types/models';

interface AnalysisPaneProps {
  analysis: Analysis | null;
  isLoading?: boolean;
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

const StageDetail = ({ stageName, stage }: { stageName: string; stage: StageEvaluation }) => {
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
          <span className="text-sm font-medium text-white">{STAGE_NAMES[stageName]}</span>
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
          {/* Notes */}
          {stage.notes && (
            <div className="text-xs text-zinc-300 leading-relaxed">
              {stage.notes}
            </div>
          )}

          {/* Evidence */}
          {stage.evidence && stage.evidence.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-zinc-400">Evidence:</div>
              {stage.evidence.map((ev, idx) => (
                <div key={idx} className="bg-zinc-900/50 rounded p-2 border border-zinc-700/30">
                  <div className="flex items-start gap-2 mb-1">
                    <Clock className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-emerald-400 font-mono">
                      {formatTimestamp(ev.timestamp || 0)}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-300 italic pl-5">
                    "{ev.quote}"
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export function AnalysisPane({ analysis, isLoading }: AnalysisPaneProps) {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-900 p-6">
        <div className="text-sm text-zinc-500">Running analysis...</div>
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
    <div className="flex h-full flex-col overflow-y-auto bg-zinc-900 p-6">
      <h2 className="mb-6 text-xl font-bold text-white">Call Analysis</h2>

      {/* AI Summary */}
      <div className="mb-6 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-blue-300">AI Summary</h3>
        </div>
        <p className="text-sm text-zinc-200 leading-relaxed">
          {analysis.summary}
        </p>
      </div>

      {/* KPI Scores */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-zinc-300 mb-3">Performance Metrics</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border border-emerald-500/30 p-4">
            <div className="text-xs text-emerald-300/70 uppercase tracking-wide font-medium">Compliance</div>
            <div className="mt-2 flex items-baseline gap-1">
              <div className="text-3xl font-bold text-emerald-400">
                {Math.round(analysis.scores.complianceOverall)}
              </div>
              <span className="text-sm text-emerald-400/60">%</span>
            </div>
          </div>
          <div className="rounded-lg bg-gradient-to-br from-blue-500/5 to-blue-500/10 border border-blue-500/30 p-4">
            <div className="text-xs text-blue-300/70 uppercase tracking-wide font-medium">Clarity</div>
            <div className="mt-2 flex items-baseline gap-1">
              <div className="text-3xl font-bold text-blue-400">
                {Math.round(analysis.scores.clarity)}
              </div>
              <span className="text-sm text-blue-400/60">%</span>
            </div>
          </div>
          <div className="rounded-lg bg-gradient-to-br from-purple-500/5 to-purple-500/10 border border-purple-500/30 p-4">
            <div className="text-xs text-purple-300/70 uppercase tracking-wide font-medium">Empathy</div>
            <div className="mt-2 flex items-baseline gap-1">
              <div className="text-3xl font-bold text-purple-400">
                {Math.round(analysis.scores.empathy)}
              </div>
              <span className="text-sm text-purple-400/60">%</span>
            </div>
          </div>
          <div className="rounded-lg bg-gradient-to-br from-teal-500/5 to-teal-500/10 border border-teal-500/30 p-4">
            <div className="text-xs text-teal-300/70 uppercase tracking-wide font-medium">Professionalism</div>
            <div className="mt-2 flex items-baseline gap-1">
              <div className="text-3xl font-bold text-teal-400">
                {Math.round(analysis.scores.professionalism)}
              </div>
              <span className="text-sm text-teal-400/60">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Call Type */}
      <div className="mb-6 rounded-lg bg-gradient-to-r from-zinc-800/50 to-zinc-700/50 border border-zinc-700/50 p-4">
        <div className="text-xs text-zinc-400 uppercase tracking-wide font-medium mb-2">Call Type</div>
        <div className="text-base font-semibold text-white capitalize flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-400" />
          {analysis.callTypePrediction}
        </div>
      </div>

      {/* Stage Analysis */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-zinc-300">Conversation Stages</h3>
        <div className="space-y-2">
          {Object.entries(analysis.stages).map(([key, stage]) => {
            if (!stage.present) {
              return (
                <div key={key} className="rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-zinc-600" />
                    <span className="text-sm font-medium text-zinc-500">{STAGE_NAMES[key]}</span>
                    <span className="text-xs text-zinc-600">Not Present</span>
                  </div>
                  {stage.notes && (
                    <div className="mt-2 text-xs text-zinc-500 pl-5">{stage.notes}</div>
                  )}
                </div>
              );
            }
            return <StageDetail key={key} stageName={key} stage={stage} />;
          })}
        </div>
      </div>

      {/* Checklist */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-zinc-300">Requirements Checklist</h3>
        <div className="space-y-2">
          {analysis.checklist.map((item) => (
            <div
              key={item.id}
              className={`rounded-lg border p-3 ${
                item.passed
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-amber-500/30 bg-amber-500/5'
              }`}
            >
              <div className="flex items-start gap-2">
                {item.passed ? (
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-500" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-medium text-white">{item.label}</div>
                    {item.timestamp !== null && item.timestamp !== undefined && (
                      <span className="text-xs text-emerald-400 font-mono">
                        {formatTimestamp(item.timestamp)}
                      </span>
                    )}
                  </div>
                  {item.evidence && (
                    <div className="mt-1 text-xs text-zinc-400 italic">"{item.evidence}"</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      {analysis.salesInsights.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-zinc-300">Sales Insights</h3>
          <div className="space-y-3">
            {analysis.salesInsights.map((insight, index) => (
              <div key={index} className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`px-2 py-0.5 rounded text-xs font-medium ${
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
                <div className="text-xs text-blue-300 mb-2">{insight.note}</div>
                {insight.snippet && (
                  <div className="mt-2 bg-zinc-900/50 rounded p-2 border border-blue-500/20">
                    <div className="text-xs italic text-zinc-300">"{insight.snippet}"</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missed Opportunities */}
      {analysis.missedOpportunities.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-300">Missed Opportunities</h3>
          <div className="space-y-3">
            {analysis.missedOpportunities.map((opportunity, index) => (
              <div key={index} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  {opportunity.timestamp !== undefined && opportunity.timestamp !== null && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-amber-400" />
                      <span className="text-xs text-amber-400 font-mono">
                        {formatTimestamp(opportunity.timestamp)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-xs font-medium text-amber-300 mb-2">{opportunity.recommendation}</div>
                {opportunity.snippet && (
                  <div className="mt-2 bg-zinc-900/50 rounded p-2 border border-amber-500/20">
                    <div className="text-xs italic text-zinc-300">"{opportunity.snippet}"</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
