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

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Analysis } from '@/types/models';

interface AnalysisPaneProps {
  analysis: Analysis | null;
  isLoading?: boolean;
}

const STAGE_COLORS = ['#10b981', '#ef4444']; // Green for present, red for missing
const QUALITY_COLORS = {
  excellent: '#10b981',
  good: '#3b82f6',
  ok: '#f59e0b',
  poor: '#ef4444',
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

  // Prepare chart data
  const stageData = Object.values(analysis.stages);
  const stagesPresent = stageData.filter(s => s.present).length;
  const stagesMissing = stageData.length - stagesPresent;

  const stagePieData = [
    { name: 'Present', value: stagesPresent },
    { name: 'Missing', value: stagesMissing },
  ];

  // Quality distribution
  const qualityCounts = stageData.reduce((acc, stage) => {
    if (stage.present) {
      acc[stage.quality] = (acc[stage.quality] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const qualityPieData = Object.entries(qualityCounts).map(([quality, count]) => ({
    name: quality.charAt(0).toUpperCase() + quality.slice(1),
    value: count,
  }));

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-zinc-900 p-6">
      <h2 className="mb-6 text-lg font-semibold text-white">Analysis</h2>

      {/* KPI Scores */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-zinc-800/50 p-4">
          <div className="text-xs text-zinc-400">Compliance</div>
          <div className="mt-1 text-2xl font-bold text-emerald-400">
            {Math.round(analysis.scores.complianceOverall)}%
          </div>
        </div>
        <div className="rounded-lg bg-zinc-800/50 p-4">
          <div className="text-xs text-zinc-400">Clarity</div>
          <div className="mt-1 text-2xl font-bold text-blue-400">
            {Math.round(analysis.scores.clarity)}%
          </div>
        </div>
        <div className="rounded-lg bg-zinc-800/50 p-4">
          <div className="text-xs text-zinc-400">Empathy</div>
          <div className="mt-1 text-2xl font-bold text-purple-400">
            {Math.round(analysis.scores.empathy)}%
          </div>
        </div>
        <div className="rounded-lg bg-zinc-800/50 p-4">
          <div className="text-xs text-zinc-400">Professionalism</div>
          <div className="mt-1 text-2xl font-bold text-teal-400">
            {Math.round(analysis.scores.professionalism)}%
          </div>
        </div>
      </div>

      {/* Call Type */}
      <div className="mb-6 rounded-lg bg-zinc-800/50 p-4">
        <div className="text-xs text-zinc-400">Call Type</div>
        <div className="mt-1 text-sm font-medium text-white capitalize">
          {analysis.callTypePrediction}
        </div>
      </div>

      {/* Charts */}
      <div className="mb-6 space-y-6">
        {/* Stages Present vs Missing */}
        <div className="rounded-lg bg-zinc-800/50 p-4">
          <h3 className="mb-3 text-sm font-medium text-white">Stage Coverage</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={stagePieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
              >
                {stagePieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STAGE_COLORS[index]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #3f3f46',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Quality Mix */}
        {qualityPieData.length > 0 && (
          <div className="rounded-lg bg-zinc-800/50 p-4">
            <h3 className="mb-3 text-sm font-medium text-white">Quality Distribution</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={qualityPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {qualityPieData.map((entry) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={QUALITY_COLORS[entry.name.toLowerCase() as keyof typeof QUALITY_COLORS]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #3f3f46',
                    borderRadius: '0.5rem',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Checklist */}
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-medium text-white">Requirements Checklist</h3>
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
                  <div className="text-xs font-medium text-white">{item.label}</div>
                  {item.evidence && (
                    <div className="mt-1 text-xs text-zinc-400">{item.evidence}</div>
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
          <h3 className="mb-3 text-sm font-medium text-white">Sales Insights</h3>
          <div className="space-y-2">
            {analysis.salesInsights.map((insight, index) => (
              <div key={index} className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
                <div className="text-xs text-blue-300">{insight.note}</div>
                {insight.snippet && (
                  <div className="mt-1 text-xs italic text-zinc-400">"{insight.snippet}"</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missed Opportunities */}
      {analysis.missedOpportunities.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-white">Missed Opportunities</h3>
          <div className="space-y-2">
            {analysis.missedOpportunities.map((opportunity, index) => (
              <div key={index} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="text-xs text-amber-300">{opportunity.recommendation}</div>
                {opportunity.snippet && (
                  <div className="mt-1 text-xs italic text-zinc-400">"{opportunity.snippet}"</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
