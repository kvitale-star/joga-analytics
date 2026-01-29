import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChangePassword } from './ChangePassword';
import { UserPreferences } from './UserPreferences';
import { UserManagement } from './UserManagement';
import { TeamManagement } from './TeamManagement';
import { UserMenu } from './UserMenu';
import { CustomChartsManagement } from './CustomChartsManagement';
import { AllCustomChartsManagement } from './AllCustomChartsManagement';
import { UserTeamsDisplay } from './UserTeamsDisplay';
import { DataAtAGlanceView } from './DataAtAGlanceView';
import { Modal } from './Modal';
import { CustomChartBuilder } from './CustomChartBuilder';
import { JOGA_COLORS } from '../utils/colors';
import type { CustomChart } from '../types/customCharts';
import { sheetConfig } from '../config';
import { fetchSheetData } from '../services/sheetsService';
import { getAllTeams } from '../services/teamService';
import { createTeamSlugMap } from '../utils/teamMapping';
import type { MatchData } from '../types';
import type { Team } from '../types/auth';

export const SettingsView: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'preferences' | 'custom-charts' | 'data-at-a-glance' | 'users' | 'teams'>('account');
  const [isChartBuilderOpen, setIsChartBuilderOpen] = useState(false);
  const [editingChart, setEditingChart] = useState<CustomChart | null>(null);
  const [matchData, setMatchData] = useState<MatchData[]>([]);
  const [columnKeys, setColumnKeys] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [chartsRefreshKey, setChartsRefreshKey] = useState(0);
  const [teams, setTeams] = useState<Team[]>([]);
  const [dataAtAGlanceLoading, setDataAtAGlanceLoading] = useState(false);

  // Load match data when chart builder opens
  useEffect(() => {
    if (isChartBuilderOpen && matchData.length === 0) {
      const loadData = async () => {
        try {
          setDataLoading(true);
          const data = await fetchSheetData(sheetConfig);
          if (Array.isArray(data) && data.length > 0) {
            setMatchData(data);
            setColumnKeys(Object.keys(data[0]));
          } else {
            setMatchData([]);
            setColumnKeys([]);
          }
        } catch (err) {
          console.error('Failed to load match data:', err);
          setMatchData([]);
          setColumnKeys([]);
        } finally {
          setDataLoading(false);
        }
      };
      loadData();
    }
  }, [isChartBuilderOpen]);

  // Load teams and match data when Data at a Glance tab is active
  useEffect(() => {
    if (activeTab === 'data-at-a-glance') {
      const loadData = async () => {
        try {
          setDataAtAGlanceLoading(true);
          // Load teams
          const loadedTeams = await getAllTeams();
          setTeams(loadedTeams);
          
          // Load match data
          const data = await fetchSheetData(sheetConfig);
          if (Array.isArray(data) && data.length > 0) {
            setMatchData(data);
            setColumnKeys(Object.keys(data[0]));
          } else {
            setMatchData([]);
            setColumnKeys([]);
          }
        } catch (err) {
          console.error('Failed to load data for Data at a Glance:', err);
          setMatchData([]);
          setColumnKeys([]);
          setTeams([]);
        } finally {
          setDataAtAGlanceLoading(false);
        }
      };
      loadData();
    }
  }, [activeTab]);

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
            <button
              onClick={() => setActiveTab('custom-charts')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'custom-charts'
                  ? 'border-[#6787aa] text-[#6787aa]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Custom Charts
            </button>
            <button
              onClick={() => setActiveTab('data-at-a-glance')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'data-at-a-glance'
                  ? 'border-[#6787aa] text-[#6787aa]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Data at a Glance
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
                  Users
                </button>
                <button
                  onClick={() => setActiveTab('teams')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'teams'
                      ? 'border-[#6787aa] text-[#6787aa]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Teams
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'account' && (
            <div className="space-y-6">
              {/* Account Information - First */}
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

              {/* Team Access - Second */}
              <UserTeamsDisplay userId={user.id} />

              {/* Tutorial Section - Third */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Tutorial</h2>
                <p className="text-gray-600 mb-4">
                  Take a guided tour of JOGA Analytics to learn about all the features and views.
                </p>
                <button
                  onClick={() => {
                    // Try to call the window function, or dispatch a custom event
                    if ((window as any).startWalkthrough) {
                      (window as any).startWalkthrough();
                    } else {
                      // Fallback: dispatch custom event
                      window.dispatchEvent(new CustomEvent('startWalkthrough'));
                    }
                  }}
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

              {/* Change Password - Fourth */}
              <ChangePassword />
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <UserPreferences />
            </div>
          )}

          {activeTab === 'custom-charts' && (
            <div className="space-y-6">
              {/* User's Custom Charts */}
              <CustomChartsManagement
                key={`user-charts-${chartsRefreshKey}`}
                onEditChart={(chart) => {
                  setEditingChart(chart);
                  setIsChartBuilderOpen(true);
                }}
              />

              {/* All Custom Charts (Admin Only) */}
              {isAdmin && (
                <AllCustomChartsManagement
                  key={`all-charts-${chartsRefreshKey}`}
                  onEditChart={(chart) => {
                    setEditingChart(chart);
                    setIsChartBuilderOpen(true);
                  }}
                />
              )}
            </div>
          )}

          {activeTab === 'data-at-a-glance' && (
            <div>
              {dataAtAGlanceLoading ? (
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <p className="text-gray-600">Loading data...</p>
                </div>
              ) : (
                <DataAtAGlanceView
                  matchData={matchData}
                  columnKeys={columnKeys}
                  teamSlugMap={createTeamSlugMap(teams)}
                />
              )}
            </div>
          )}

          {activeTab === 'users' && isAdmin && <UserManagement />}

          {activeTab === 'teams' && isAdmin && <TeamManagement />}
        </div>
        </div>
      </div>

      {/* Chart Builder Modal */}
      <Modal
        isOpen={isChartBuilderOpen}
        onClose={() => {
          setIsChartBuilderOpen(false);
          setEditingChart(null);
          // Refresh charts list when modal closes (chart may have been saved)
          setChartsRefreshKey(prev => prev + 1);
        }}
        maxWidth="2xl"
      >
        {dataLoading ? (
          <div className="p-6 text-center">
            <p className="text-gray-600">Loading chart data...</p>
          </div>
        ) : (
          <CustomChartBuilder
            chart={editingChart}
            sheetConfig={sheetConfig}
            columnKeys={columnKeys}
            matchData={matchData}
            onClose={() => {
              setIsChartBuilderOpen(false);
              setEditingChart(null);
              // Refresh charts list when modal closes (chart may have been saved)
              setChartsRefreshKey(prev => prev + 1);
            }}
          />
        )}
      </Modal>
    </div>
  );
};
