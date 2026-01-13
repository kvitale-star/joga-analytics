import React, { useState, useEffect } from 'react';
import { verifyEmail } from '../services/authService';
import { JOGA_COLORS } from '../utils/colors';

export const EmailVerification: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Get token from URL parameters
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    setToken(urlToken);

    const verify = async () => {
      if (!urlToken) {
        setError('Invalid or missing verification token');
        setIsLoading(false);
        return;
      }

      try {
        const success = await verifyEmail(urlToken);
        if (success) {
          setIsSuccess(true);
          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
        } else {
          setError('Invalid or expired verification token');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to verify email');
      } finally {
        setIsLoading(false);
      }
    };

    verify();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Verifying your email...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified</h2>
            <p className="text-gray-600 mb-6">
              Your email has been successfully verified. You can now log in.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="font-medium py-2 px-6 rounded-lg text-black transition-colors"
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
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <svg
              className="w-16 h-16 mx-auto text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
          <p className="text-gray-600 mb-6">
            {error || 'This verification link is invalid or has expired.'}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
};
