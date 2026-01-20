import React, { useState } from 'react';

type ViewType = 'dashboard' | 'chat' | 'team-data' | 'club-data' | 'game-data' | 'upload-game-data' | 'data-at-a-glance' | 'settings';

interface SidebarProps {
  currentView: 'dashboard' | 'chat' | 'game-data' | 'club-data' | 'upload-game-data' | 'data-at-a-glance' | 'settings';
  onNavigate: (view: ViewType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMouseEnter = () => {
    // Don't expand if walkthrough is active
    if (document.body.classList.contains('walkthrough-active') || document.querySelector('.react-joyride__overlay')) {
      return;
    }
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    setIsExpanded(false);
  };

  return (
    <div
      data-tour="sidebar"
      className={`fixed left-0 top-0 h-full bg-gray-800 text-white transition-all duration-300 z-50 ${
        isExpanded ? 'w-64' : 'w-16'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Logo/Brand Section */}
      <div className="flex items-center justify-center pt-6 pb-4">
        <img
          src="/joga-logo.png"
          alt="JOGA"
          data-tour="sidebar-logo"
          className="h-10 w-10 flex-shrink-0 object-contain"
          style={{ 
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
          }}
          onError={(e) => {
            // Fallback if image doesn't load - show text instead
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      </div>

      {/* Navigation Sections */}
      <nav className="mt-4">
        {/* Reporting Section */}
        <div className="mb-6" data-tour="reporting-section">
          <div 
            className={`px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap transition-all duration-300 ease-in-out ${
              isExpanded 
                ? 'opacity-100 max-h-8' 
                : 'opacity-0 max-h-0 overflow-hidden py-0'
            }`}
          >
            Reporting
          </div>
          <div className="space-y-1">
            <button
              data-tour="team-data-nav"
              onClick={() => onNavigate('team-data')}
              className={`w-full flex items-center py-3 text-sm transition-colors ${
                isExpanded ? 'px-4 justify-start' : 'justify-center'
              } ${
                currentView === 'dashboard' && !isExpanded
                  ? 'bg-gray-700 text-white'
                  : currentView === 'dashboard'
                  ? 'hover:bg-gray-700 text-white'
                  : 'hover:bg-gray-700 text-gray-300'
              }`}
              title={!isExpanded ? 'Team Data' : undefined}
            >
              <svg
                data-tour="team-data-nav-icon"
                className={`w-5 h-5 flex-shrink-0 ${!isExpanded ? 'mx-auto' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span 
                className={`ml-3 whitespace-nowrap transition-all duration-300 ease-in-out ${
                  isExpanded 
                    ? 'opacity-100 max-w-[200px]' 
                    : 'opacity-0 max-w-0 overflow-hidden'
                }`}
              >
                Team Data
              </span>
            </button>
            <button
              data-tour="club-data-nav"
              onClick={() => onNavigate('club-data')}
              className={`w-full flex items-center py-3 text-sm transition-colors ${
                isExpanded ? 'px-4 justify-start' : 'justify-center'
              } hover:bg-gray-700 text-gray-300`}
              title={!isExpanded ? 'Club Data' : undefined}
            >
              <svg
                data-tour="club-data-nav-icon"
                className={`w-5 h-5 flex-shrink-0 ${!isExpanded ? 'mx-auto' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <span 
                className={`ml-3 whitespace-nowrap transition-all duration-300 ease-in-out ${
                  isExpanded 
                    ? 'opacity-100 max-w-[200px]' 
                    : 'opacity-0 max-w-0 overflow-hidden'
                }`}
              >
                Club Data
              </span>
            </button>
            <button
              data-tour="game-data-nav"
              onClick={() => onNavigate('game-data')}
              className={`w-full flex items-center py-3 text-sm transition-colors ${
                isExpanded ? 'px-4 justify-start' : 'justify-center'
              } hover:bg-gray-700 text-gray-300`}
              title={!isExpanded ? 'Game Data' : undefined}
            >
              <svg
                data-tour="game-data-nav-icon"
                className={`w-5 h-5 flex-shrink-0 ${!isExpanded ? 'mx-auto' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <span 
                className={`ml-3 whitespace-nowrap transition-all duration-300 ease-in-out ${
                  isExpanded 
                    ? 'opacity-100 max-w-[200px]' 
                    : 'opacity-0 max-w-0 overflow-hidden'
                }`}
              >
                Game Data
              </span>
            </button>
          </div>
        </div>

        {/* Tools Section */}
        <div className="mb-6">
          <div 
            data-tour="sidebar-tools-section"
            className={`px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap transition-all duration-300 ease-in-out ${
              isExpanded 
                ? 'opacity-100 max-h-8' 
                : 'opacity-0 max-h-0 overflow-hidden py-0'
            }`}
          >
            Tools
          </div>
          <div className="space-y-1">
            <button
              data-tour="chat-nav"
              onClick={() => onNavigate('chat')}
              className={`w-full flex items-center py-3 text-sm transition-colors ${
                isExpanded ? 'px-4 justify-start' : 'justify-center'
              } ${
                currentView === 'chat'
                  ? 'bg-gray-700 text-white'
                  : 'hover:bg-gray-700 text-gray-300'
              }`}
              title={!isExpanded ? 'JOGA AI Chat' : undefined}
            >
              <svg
                data-tour="chat-nav-icon"
                className={`w-5 h-5 flex-shrink-0 ${!isExpanded ? 'mx-auto' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span 
                className={`ml-3 whitespace-nowrap transition-all duration-300 ease-in-out ${
                  isExpanded 
                    ? 'opacity-100 max-w-[200px]' 
                    : 'opacity-0 max-w-0 overflow-hidden'
                }`}
              >
                JOGA AI Chat
              </span>
            </button>
            <button
              onClick={() => onNavigate('upload-game-data')}
              className={`w-full flex items-center py-3 text-sm transition-colors ${
                isExpanded ? 'px-4 justify-start' : 'justify-center'
              } ${
                currentView === 'upload-game-data'
                  ? 'bg-gray-700 text-white'
                  : 'hover:bg-gray-700 text-gray-300'
              }`}
              title={!isExpanded ? 'Upload Game Data' : undefined}
            >
              <svg
                className={`w-5 h-5 flex-shrink-0 ${!isExpanded ? 'mx-auto' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span 
                className={`ml-3 whitespace-nowrap transition-all duration-300 ease-in-out ${
                  isExpanded 
                    ? 'opacity-100 max-w-[200px]' 
                    : 'opacity-0 max-w-0 overflow-hidden'
                }`}
              >
                Upload Game Data
              </span>
            </button>
            <button
              onClick={() => onNavigate('data-at-a-glance')}
              className={`w-full flex items-center py-3 text-sm transition-colors ${
                isExpanded ? 'px-4 justify-start' : 'justify-center'
              } ${
                currentView === 'data-at-a-glance'
                  ? 'bg-gray-700 text-white'
                  : 'hover:bg-gray-700 text-gray-300'
              }`}
              title={!isExpanded ? 'Data at a Glance' : undefined}
            >
              <svg
                className={`w-5 h-5 flex-shrink-0 ${!isExpanded ? 'mx-auto' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span 
                className={`ml-3 whitespace-nowrap transition-all duration-300 ease-in-out ${
                  isExpanded 
                    ? 'opacity-100 max-w-[200px]' 
                    : 'opacity-0 max-w-0 overflow-hidden'
                }`}
              >
                Data at a Glance
              </span>
            </button>
          </div>
        </div>

        {/* Admin Section */}
        <div className="mb-6">
          <div 
            className={`px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap transition-all duration-300 ease-in-out ${
              isExpanded 
                ? 'opacity-100 max-h-8' 
                : 'opacity-0 max-h-0 overflow-hidden py-0'
            }`}
          >
            Admin
          </div>
          <div className="space-y-1">
            <button
              onClick={() => onNavigate('settings' as any)}
              className={`w-full flex items-center py-3 text-sm transition-colors ${
                isExpanded ? 'px-4 justify-start' : 'justify-center'
              } hover:bg-gray-700 text-gray-300`}
              title={!isExpanded ? 'Settings' : undefined}
            >
              <svg
                className={`w-5 h-5 flex-shrink-0 ${!isExpanded ? 'mx-auto' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span 
                className={`ml-3 whitespace-nowrap transition-all duration-300 ease-in-out ${
                  isExpanded 
                    ? 'opacity-100 max-w-[200px]' 
                    : 'opacity-0 max-w-0 overflow-hidden'
                }`}
              >
                Settings
              </span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

