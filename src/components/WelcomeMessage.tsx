import React from 'react';
import { MatchData } from '../types';
import { coachingRules } from '../config/coachingRules';

interface WelcomeMessageProps {
  matchData: MatchData[];
  columnKeys: string[];
  onQuestionClick: (question: string) => void;
}

export const WelcomeMessage: React.FC<WelcomeMessageProps> = ({ 
  onQuestionClick 
}) => {
  const { examplePrompts } = coachingRules;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          🤖 Welcome to JOGA Analytics AI
        </h1>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          I can help you analyze match data for your team or groups of teams. Try asking:
        </h2>
      </div>

      {/* Clickable Example Questions */}
      <div className="flex justify-center">
        <div className="space-y-2 w-full max-w-2xl">
          {examplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => onQuestionClick(prompt.question)}
              className="w-full text-left group"
            >
              <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-base font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      "{prompt.question}"
                    </div>
                    <div className="text-sm text-gray-500 mt-1">{prompt.description}</div>
                  </div>
                  <svg
                    className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0 ml-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-gray-200 space-y-2">
        <p className="text-gray-600">
          <span className="font-semibold">Ready to explore?</span> Ask me anything about your team's matches or click any question above to get started. 
          You can also ask me to summarize the season for your team, a group of teams, or the entire club.
        </p>
        <p className="text-sm text-gray-500">
          💡 <span className="font-medium">Tip:</span> You can also click the Analytics button at the top to explore your data with interactive charts and filters.
        </p>
      </div>
    </div>
  );
};

