import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SetupWizardData } from '../types/auth';
import { JOGA_COLORS } from '../utils/colors';
import { resetAuthDatabase } from '../services/authService';

export const SetupWizard: React.FC = () => {
  const { setupAdmin } = useAuth();
  const [formData, setFormData] = useState<SetupWizardData>({
    email: '',
    password: '',
    name: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.email || !formData.password || !formData.name) {
      setError('All fields are required');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setIsLoading(true);
      await setupAdmin(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create admin account');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to JOGA Analytics</h1>
            <p className="text-gray-600">Let's set up your admin account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="John Doe"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="admin@joga.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
                minLength={8}
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
                disabled={isLoading}
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
              {isLoading ? 'Setting up...' : 'Create Admin Account'}
            </button>
          </form>

          <p className="mt-4 text-xs text-gray-500 text-center">
            This will create the first administrator account for your system.
          </p>
          
          <div className="mt-6 pt-4 border-t-2 border-gray-300">
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
  );
};

