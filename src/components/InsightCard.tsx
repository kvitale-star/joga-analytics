import React, { useState } from 'react';
import type { Insight } from '../services/insightsService';
import { JOGA_COLORS } from '../utils/colors';

interface InsightCardProps {
  insight: Insight;
  teamDisplayName?: string;
  onLogTraining?: (insightId: number, category: string) => void;
  onGetRecommendation?: (insightId: number) => void;
  onDismiss?: (insightId: number) => void;
  showLinkedChart?: boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
  high: 'bg-amber-100 border-amber-400 text-amber-800',
  medium: 'bg-blue-100 border-blue-400 text-blue-800',
  low: 'bg-gray-100 border-gray-400 text-gray-700',
};

const CATEGORY_LABELS: Record<string, string> = {
  shooting: 'Shooting',
  possession: 'Possession',
  passing: 'Passing',
  defending: 'Defending',
  general: 'General',
};

const TYPE_LABELS: Record<string, string> = {
  anomaly: 'Anomaly',
  trend: 'Trend',
  half_split: 'Half Split',
  correlation: 'Correlation',
  benchmark: 'Benchmark',
};

function getSeverityLevel(severity: number): 'high' | 'medium' | 'low' {
  if (severity >= 0.6) return 'high';
  if (severity >= 0.3) return 'medium';
  return 'low';
}

export const InsightCard: React.FC<InsightCardProps> = ({
  insight,
  teamDisplayName,
  onLogTraining,
  onGetRecommendation,
  onDismiss,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const severityLevel = getSeverityLevel(insight.severity);
  const severityColor = SEVERITY_COLORS[severityLevel];
  const narrative = insight.narrative || insight.title;
  const categoryLabel = CATEGORY_LABELS[insight.category] || insight.category;
  const typeLabel = TYPE_LABELS[insight.insight_type] || insight.insight_type;

  let detailData: Record<string, unknown> = {};
  try {
    detailData = JSON.parse(insight.detail_json || '{}');
  } catch {
    // Ignore parse errors
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4">
        {/* Header: severity badge, category, type */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${severityColor}`}
            title={`Severity: ${(insight.severity * 100).toFixed(0)}%`}
          >
            {severityLevel === 'high' ? '⚠️' : severityLevel === 'medium' ? '📊' : 'ℹ️'}{' '}
            {severityLevel.charAt(0).toUpperCase() + severityLevel.slice(1)}
          </span>
          <span className="text-xs text-gray-500">{categoryLabel}</span>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-500">{typeLabel}</span>
          {teamDisplayName && (
            <>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-600">{teamDisplayName}</span>
            </>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 mb-1">{insight.title}</h3>

        {/* Narrative / description */}
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{narrative}</p>

        {/* Expand/collapse for detail */}
        {Object.keys(detailData).length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {isExpanded ? 'Hide details' : 'Show details'}
            </button>
            {isExpanded && (
              <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                {JSON.stringify(detailData, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {onLogTraining && (
            <button
              onClick={() => onLogTraining(insight.id, insight.category)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-black rounded-md transition-colors"
              style={{
                backgroundColor: JOGA_COLORS.voltYellow,
                border: `2px solid ${JOGA_COLORS.voltYellow}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#b8e600';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = JOGA_COLORS.voltYellow;
              }}
            >
              Log Training
            </button>
          )}
          {onGetRecommendation && (
            <button
              onClick={() => onGetRecommendation(insight.id)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white rounded-md transition-colors"
              style={{
                backgroundColor: JOGA_COLORS.valorBlue,
                border: `2px solid ${JOGA_COLORS.valorBlue}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#5a7590';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = JOGA_COLORS.valorBlue;
              }}
            >
              Get Recommendation
            </button>
          )}
          {onDismiss && (
            <button
              onClick={() => onDismiss(insight.id)}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
