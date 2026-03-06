import React, { useState } from 'react';
import { Modal } from './Modal';
import { JOGA_COLORS } from '../utils/colors';
import { generateRecommendations, GenerateRecommendationRequest, Recommendation } from '../services/recommendationService';
import { RecommendationCard } from './RecommendationCard';

interface GenerateRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: number;
  insightId?: number | null;
  onRecommendationsGenerated?: (recommendations: Recommendation[]) => void;
}

export const GenerateRecommendationModal: React.FC<GenerateRecommendationModalProps> = ({
  isOpen,
  onClose,
  teamId,
  insightId = null,
  onRecommendationsGenerated,
}) => {
  const [category, setCategory] = useState<'shooting' | 'possession' | 'passing' | 'defending' | 'general' | 'all'>('all');
  const [recommendationType, setRecommendationType] = useState<'tactical' | 'training' | 'general' | 'all'>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedRecommendations, setGeneratedRecommendations] = useState<Recommendation[]>([]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setGeneratedRecommendations([]);

      const request: GenerateRecommendationRequest = {
        teamId,
        insightId: insightId || null,
        category: category === 'all' ? undefined : category,
        recommendationType: recommendationType === 'all' ? undefined : recommendationType,
      };

      const recommendations = await generateRecommendations(request);
      setGeneratedRecommendations(recommendations);
      
      if (onRecommendationsGenerated) {
        onRecommendationsGenerated(recommendations);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate recommendations');
      console.error('Error generating recommendations:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setCategory('all');
    setRecommendationType('all');
    setError(null);
    setGeneratedRecommendations([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Generate Recommendations">
      <div className="space-y-6">
        {/* Options */}
        {generatedRecommendations.length === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category (Optional)
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa]"
                disabled={isGenerating}
              >
                <option value="all">All Categories</option>
                <option value="shooting">Shooting</option>
                <option value="possession">Possession</option>
                <option value="passing">Passing</option>
                <option value="defending">Defending</option>
                <option value="general">General</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recommendation Type (Optional)
              </label>
              <select
                value={recommendationType}
                onChange={(e) => setRecommendationType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa]"
                disabled={isGenerating}
              >
                <option value="all">All Types</option>
                <option value="tactical">Tactical</option>
                <option value="training">Training</option>
                <option value="general">General</option>
              </select>
            </div>

            {insightId && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Recommendations will be generated based on the selected insight.
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Generate Button */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-4 py-2 text-sm font-medium text-black rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                style={{
                  backgroundColor: isGenerating ? '#9ca3af' : JOGA_COLORS.voltYellow,
                  border: `2px solid ${isGenerating ? '#9ca3af' : JOGA_COLORS.voltYellow}`,
                }}
                onMouseEnter={(e) => {
                  if (!isGenerating) e.currentTarget.style.backgroundColor = '#b8e600';
                }}
                onMouseLeave={(e) => {
                  if (!isGenerating) e.currentTarget.style.backgroundColor = JOGA_COLORS.voltYellow;
                }}
              >
                {isGenerating && (
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-800"></div>
                )}
                {isGenerating ? 'Generating...' : 'Generate Recommendations'}
              </button>
            </div>
          </div>
        )}

        {/* Generated Recommendations */}
        {generatedRecommendations.length > 0 && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm text-green-800 font-medium">
                Successfully generated {generatedRecommendations.length} recommendation(s)!
              </p>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {generatedRecommendations.map((recommendation) => (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                />
              ))}
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-gray-200">
              <button
                onClick={handleClose}
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
                Close
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isGenerating && generatedRecommendations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Generating recommendations...</p>
            <p className="text-sm text-gray-500 mt-2">This may take 10-30 seconds</p>
          </div>
        )}
      </div>
    </Modal>
  );
};
