import React, { useState } from 'react';
import { JOGA_COLORS } from '../utils/colors';
import { Recommendation, parseActionItems, parseTrainingPlan, getPriorityColor, getPriorityBadge } from '../services/recommendationService';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onAccept?: (recommendationId: number) => void;
  onSkip?: (recommendationId: number) => void;
  onViewDetail?: (recommendationId: number) => void;
  showLinkedInsight?: boolean;
  linkedInsightTitle?: string;
  linkedInsightNarrative?: string;
  className?: string;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onAccept,
  onSkip,
  onViewDetail,
  showLinkedInsight = false,
  linkedInsightTitle,
  linkedInsightNarrative,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLinkedInsightDetails, setShowLinkedInsightDetails] = useState(false);

  const priorityColor = getPriorityColor(recommendation.priority);
  const priorityBadge = getPriorityBadge(recommendation.priority);
  const actionItems = parseActionItems(recommendation.action_items);
  const trainingPlan = parseTrainingPlan(recommendation.training_plan_json);

  const priorityColorClasses: Record<string, string> = {
    red: 'bg-red-100 border-red-300 text-red-900',
    orange: 'bg-orange-100 border-orange-300 text-orange-900',
    blue: 'bg-blue-100 border-blue-300 text-blue-900',
    gray: 'bg-gray-100 border-gray-300 text-gray-900',
  };

  const badgeColorClasses: Record<string, string> = {
    red: 'bg-red-500 text-white',
    orange: 'bg-orange-500 text-white',
    blue: 'bg-blue-500 text-white',
    gray: 'bg-gray-500 text-white',
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className={`bg-white rounded-lg border-2 shadow-md overflow-hidden ${className}`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b ${priorityColorClasses[priorityColor]}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold">{recommendation.title}</h3>
              <span className={`px-2 py-1 text-xs font-semibold rounded ${badgeColorClasses[priorityColor]}`}>
                {priorityBadge}
              </span>
              {recommendation.is_applied && (
                <span className="px-2 py-1 text-xs font-semibold rounded bg-green-500 text-white">
                  Applied
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm opacity-75">
              <span className="capitalize">{recommendation.category}</span>
              <span>•</span>
              <span className="capitalize">{recommendation.recommendation_type}</span>
              <span>•</span>
              <span>{formatDate(recommendation.created_at)}</span>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-4">
        <div className="prose prose-sm max-w-none">
          <p className="text-gray-700 leading-relaxed">{recommendation.description}</p>
        </div>

        {/* Linked Insight */}
        {showLinkedInsight && linkedInsightTitle && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowLinkedInsightDetails(!showLinkedInsightDetails)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showLinkedInsightDetails ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-medium">Linked Insight: {linkedInsightTitle}</span>
            </button>
            {showLinkedInsightDetails && linkedInsightNarrative && (
              <div className="mt-2 ml-6 text-sm text-gray-600 bg-gray-50 rounded p-3">
                {linkedInsightNarrative}
              </div>
            )}
          </div>
        )}

        {/* Action Items */}
        {actionItems.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Action Items:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              {actionItems.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
            {/* Training Plan */}
            {trainingPlan && (
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Training Plan:</h4>
                <div className="bg-gray-50 rounded p-4 space-y-3">
                  {trainingPlan.sessionType && (
                    <div>
                      <span className="font-medium">Session Type:</span> {trainingPlan.sessionType}
                    </div>
                  )}
                  {trainingPlan.duration && (
                    <div>
                      <span className="font-medium">Duration:</span> {trainingPlan.duration} minutes
                    </div>
                  )}
                  {trainingPlan.focus && (
                    <div>
                      <span className="font-medium">Focus:</span> {trainingPlan.focus}
                    </div>
                  )}
                  {trainingPlan.drills && Array.isArray(trainingPlan.drills) && trainingPlan.drills.length > 0 && (
                    <div>
                      <span className="font-medium">Drills:</span>
                      <ul className="list-disc list-inside ml-4 mt-1">
                        {trainingPlan.drills.map((drill: string, index: number) => (
                          <li key={index}>{drill}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Framework Alignment */}
            {recommendation.framework_alignment && (
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">US Soccer Framework Alignment:</h4>
                <p className="text-sm text-gray-700 bg-blue-50 rounded p-3">{recommendation.framework_alignment}</p>
              </div>
            )}

            {/* Club Philosophy Alignment */}
            {recommendation.club_philosophy_alignment && (
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">JOGA Philosophy Alignment:</h4>
                <p className="text-sm text-gray-700 bg-yellow-50 rounded p-3">{recommendation.club_philosophy_alignment}</p>
              </div>
            )}

            {/* Applied Date */}
            {recommendation.is_applied && recommendation.applied_at && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Applied on:</span> {formatDate(recommendation.applied_at)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onViewDetail && (
            <button
              onClick={() => onViewDetail(recommendation.id)}
              className="px-3 py-1.5 text-sm font-medium rounded transition-colors"
              style={{
                color: JOGA_COLORS.valorBlue,
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgb(103 135 170 / 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              View Details
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!recommendation.is_applied && onAccept && (
            <button
              onClick={() => onAccept(recommendation.id)}
              className="px-4 py-2 text-sm font-medium text-black rounded transition-colors"
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
              Accept & Log Training
            </button>
          )}
          {!recommendation.is_applied && onSkip && (
            <button
              onClick={() => onSkip(recommendation.id)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
