import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../contexts/AuthContext';
import { updateUserPreferences } from '../services/authService';
import { JOGA_COLORS } from '../utils/colors';
import { walkthroughScreens } from '../config/walkthrough';

interface WalkthroughOverlayProps {
  onClose: () => void;
}

// Preload the logo image once when module loads to ensure browser caching
const LOGO_PATH = '/joga-logo-bw.png';
const preloadedLogo = new Image();
preloadedLogo.src = LOGO_PATH;

/**
 * Component that loads GIF with PNG fallback
 * Tries to load the GIF first, then falls back to PNG if GIF fails
 */
const WalkthroughImage: React.FC<{ gifPath: string; alt: string }> = ({ gifPath, alt }) => {
  const [imageSrc, setImageSrc] = useState<string>(gifPath);
  const [hasError, setHasError] = useState(false);
  const logoLoadedRef = useRef(false);

  // Convert GIF path to PNG path (e.g., /walkthrough/welcome.gif -> /walkthrough/welcome.png)
  const pngPath = gifPath.replace(/\.gif$/i, '.png');

  // Reset state when gifPath changes (screen changes)
  useEffect(() => {
    setImageSrc(gifPath);
    setHasError(false);
  }, [gifPath]);

  const handleError = () => {
    // If we're currently trying the GIF and it fails, try PNG
    if (imageSrc === gifPath) {
      setImageSrc(pngPath);
    } else {
      // Both GIF and PNG failed, show placeholder
      setHasError(true);
      // Mark logo as loaded to prevent re-downloading
      logoLoadedRef.current = true;
    }
  };

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <img
          src={LOGO_PATH}
          alt="JOGA Logo"
          className="max-w-[200px] max-h-[200px] object-contain opacity-50"
          // Add key to prevent React from recreating the img element unnecessarily
          key="logo-placeholder"
        />
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className="w-full h-full object-contain"
      onError={handleError}
      // Use key based on imageSrc to help browser cache properly
      key={imageSrc}
    />
  );
};

export const WalkthroughOverlay: React.FC<WalkthroughOverlayProps> = ({ onClose }) => {
  const { user, refreshSession } = useAuth();
  const [currentScreenIndex, setCurrentScreenIndex] = useState(0);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const currentScreen = walkthroughScreens[currentScreenIndex];
  const isFirstScreen = currentScreenIndex === 0;
  const isLastScreen = currentScreenIndex === walkthroughScreens.length - 1;
  const textColor = currentScreen.headerColor === JOGA_COLORS.voltYellow ? 'text-gray-900' : 'text-white';

  const handleNext = () => {
    if (isLastScreen) {
      handleFinish();
    } else {
      setCurrentScreenIndex(currentScreenIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstScreen) {
      setCurrentScreenIndex(currentScreenIndex - 1);
    }
  };

  const handleFinish = async () => {
    // Mark onboarding as completed
    if (user) {
      try {
        await updateUserPreferences(user.id, {
          ...user.preferences,
          onboardingCompleted: true,
          onboardingCompletedAt: new Date().toISOString(),
        });
        if (refreshSession) {
          await refreshSession();
        }
      } catch (err) {
        console.error('Failed to save onboarding status:', err);
      }
    }
    onClose();
  };

  const handleCloseClick = () => {
    setShowConfirmClose(true);
  };

  const handleConfirmClose = () => {
    handleFinish();
  };

  const handleCancelClose = () => {
    setShowConfirmClose(false);
  };

  const handleDotClick = (index: number) => {
    setCurrentScreenIndex(index);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-3/4 max-w-6xl bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Colored Header */}
        <div
          className="px-8 py-6 border-b border-gray-200 relative"
          style={{ backgroundColor: currentScreen.headerColor }}
        >
          <div className="flex items-center justify-between">
            <h2 className={`text-2xl font-bold ${textColor}`}>
              {currentScreen.title}
            </h2>
            <button
              onClick={handleCloseClick}
              className={`p-2 rounded-lg transition-colors ${
                currentScreen.headerColor === JOGA_COLORS.voltYellow
                  ? 'text-gray-900 hover:bg-white/90'
                  : 'text-white hover:bg-white/20'
              }`}
              aria-label="Close walkthrough"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Confirmation Dialog */}
        {showConfirmClose && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Skip Tour?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to skip the walkthrough? You can restart it anytime from Settings.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCancelClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmClose}
                  className="px-4 py-2 rounded-lg font-medium text-black transition-colors"
                  style={{
                    backgroundColor: JOGA_COLORS.voltYellow,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#b8e600';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = JOGA_COLORS.voltYellow;
                  }}
                >
                  Skip Tour
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex">
            {/* Text Content Section */}
            <div className="w-[45%] p-8 flex items-center">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="text-gray-700 text-base leading-relaxed mb-4">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-outside text-gray-600 space-y-2 mb-4 ml-6 pl-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-outside text-gray-600 space-y-2 mb-4 ml-6 pl-2">{children}</ol>,
                    li: ({ children }) => <li className="text-sm leading-relaxed pl-1">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    code: ({ children }) => <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">{children}</code>,
                    h1: ({ children }) => <h1 className="text-xl font-bold text-gray-900 mb-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-semibold text-gray-900 mb-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-semibold text-gray-900 mb-2">{children}</h3>,
                  }}
                >
                  {currentScreen.description}
                </ReactMarkdown>
              </div>
            </div>

            {/* Video/GIF Section */}
            <div className="w-[55%] p-6 bg-gray-50 border-l border-gray-200 flex items-center justify-center">
              <div className="w-full aspect-[4/3] bg-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
                <WalkthroughImage
                  gifPath={currentScreen.gifPath}
                  alt={currentScreen.title}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer with Navigation */}
        <div className="px-8 py-6 bg-gray-50 border-t border-gray-200">
          {/* Progress Dots */}
          <div className="flex justify-center items-center gap-2 mb-4">
            {walkthroughScreens.map((_, index) => (
              <button
                key={index}
                onClick={() => handleDotClick(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentScreenIndex
                    ? 'bg-gray-900 w-8'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to screen ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={isFirstScreen}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                isFirstScreen
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-gray-700 bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              {currentScreenIndex + 1} of {walkthroughScreens.length}
            </span>
            <button
              onClick={handleNext}
              className="px-6 py-2 rounded-lg font-medium text-black transition-colors"
              style={{
                backgroundColor: JOGA_COLORS.voltYellow,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#b8e600';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = JOGA_COLORS.voltYellow;
              }}
            >
              {isLastScreen ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
