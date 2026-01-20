import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChangePassword } from './ChangePassword';
import { UserPreferences } from './UserPreferences';
import { UserManagement } from './UserManagement';
import { TeamAssignment } from './TeamAssignment';
import { UserMenu } from './UserMenu';
import { triggerWalkthrough } from './Walkthrough';
import { JOGA_COLORS } from '../utils/colors';

export const SettingsView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'preferences' | 'users' | 'teams'>('account');

  if (!user) {
    return null;
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 relative">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-sm text-gray-600 mt-1">Manage your account and preferences</p>
            </div>
            <div className="relative">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('account')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'account'
                  ? 'border-[#6787aa] text-[#6787aa]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Account
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'preferences'
                  ? 'border-[#6787aa] text-[#6787aa]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Preferences
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('users')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'users'
                      ? 'border-[#6787aa] text-[#6787aa]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  User Management
                </button>
                <button
                  onClick={() => setActiveTab('teams')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'teams'
                      ? 'border-[#6787aa] text-[#6787aa]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Team Assignments
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'account' && (
            <div className="space-y-6">
              <ChangePassword />
              
              {/* Tutorial Section */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Tutorial</h2>
                <p className="text-gray-600 mb-4">
                  Take a guided tour of JOGA Analytics to learn about all the features and views.
                </p>
                <button
                  onClick={() => triggerWalkthrough()}
                  className="font-medium py-2 px-6 rounded-lg transition-colors text-black"
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
                  Start Tutorial
                </button>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Role</dt>
                    <dd className="mt-1 text-sm text-gray-900 capitalize">{user.role}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email Verified</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {user.emailVerified ? (
                        <span className="text-green-600">✓ Verified</span>
                      ) : (
                        <span className="text-yellow-600">⚠ Not Verified</span>
                      )}
                    </dd>
                  </div>
                  {user.lastLoginAt && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Login</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(user.lastLoginAt).toLocaleString()}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && <UserPreferences />}

          {activeTab === 'users' && isAdmin && <UserManagement />}

          {activeTab === 'teams' && isAdmin && <TeamAssignment />}
        </div>
        </div>
      </div>
    </div>
  );
};
