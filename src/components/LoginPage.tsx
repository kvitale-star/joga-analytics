import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoginCredentials } from '../types/auth';
import { JOGA_COLORS } from '../utils/colors';
import { resetAuthDatabase } from '../services/authService';
import { PasswordResetRequest } from './PasswordResetRequest';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(credentials);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
      setIsLoading(false);
    }
  };

  if (showPasswordReset) {
    return (
      <PasswordResetRequest
        onBack={() => setShowPasswordReset(false)}
        onSuccess={() => setShowPasswordReset(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">JOGA Analytics</h1>
            <p className="text-gray-600">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-black"
              style={{
                backgroundColor: isLoading ? '#9ca3af' : JOGA_COLORS.voltYellow,
                border: `2px solid ${JOGA_COLORS.voltYellow}`,
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#b8e600'; // Darker volt yellow
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = JOGA_COLORS.voltYellow;
                }
              }}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="text-center">
              <a
                href="#"
                className="text-sm text-blue-600 hover:text-blue-800"
                onClick={(e) => {
                  e.preventDefault();
                  setShowPasswordReset(true);
                }}
              >
                Forgot your password?
              </a>
            </div>
            
            <div className="pt-4 border-t-2 border-gray-300">
              <p className="text-xs text-gray-500 text-center mb-3">Testing & Development</p>
              <button
                type="button"
                onClick={async () => {
                  if (confirm('This will reset all user accounts and sessions. You will need to set up a new admin account. Continue?')) {
                    try {
                      await resetAuthDatabase();
                      alert('Auth database reset. Please refresh the page.');
                      window.location.reload();
                    } catch (error) {
                      alert('Failed to reset: ' + (error instanceof Error ? error.message : 'Unknown error'));
                    }
                  }
                }}
                className="w-full text-sm font-medium px-4 py-3 border-2 border-gray-400 rounded-lg bg-gray-50 hover:bg-gray-100 focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] text-gray-800 transition-colors shadow-sm"
              >
                🔄 Reset Admin Setup (Testing Only)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

