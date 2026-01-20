import React, { useState, useEffect, useCallback, useRef } from 'react';
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from 'react-joyride';
import { useAuth } from '../contexts/AuthContext';
import { updateUserPreferences } from '../services/authService';
import { JOGA_COLORS } from '../utils/colors';

type ViewType = 'dashboard' | 'chat' | 'game-data' | 'club-data';

interface WalkthroughProps {
  onNavigate: (view: 'dashboard' | 'chat' | 'team-data' | 'club-data' | 'game-data' | 'upload-game-data' | 'data-at-a-glance' | 'settings') => void;
  currentView: string;
}

// Define the tour steps
const tourSteps: Step[] = [
  // Welcome - Larger and more attention-grabbing
  {
    target: 'body',
    content: (
      <div className="text-center" style={{ padding: '40px 20px' }}>
        <h2 className="text-3xl font-bold mb-4" style={{ fontSize: '32px', lineHeight: '1.2' }}>Welcome to JOGA Analytics!</h2>
        <p className="text-gray-700 mb-3" style={{ fontSize: '18px', lineHeight: '1.6' }}>
          Let's take a quick tour of your analytics dashboard.
        </p>
        <p className="text-gray-600" style={{ fontSize: '16px' }}>
          This interactive walkthrough will show you how to explore your match data, view performance charts, and use AI-powered insights.
        </p>
        <p className="text-gray-500 mt-4 text-sm">
          This will only take a minute or two.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  // Sidebar Navigation
  {
    target: '[data-tour="sidebar-logo"]',
    content: (
      <div>
        <h3 className="font-bold mb-2">Navigation Sidebar</h3>
        <p className="text-gray-600">
          This is your navigation sidebar. Hover over it to expand and see all navigation options. 
          The sidebar contains three main sections: Reporting, Tools, and Admin.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  // Three Reporting Views
  {
    target: '[data-tour="reporting-section"]',
    content: (
      <div>
        <h3 className="font-bold mb-2">Three Ways to Report on Your Data</h3>
        <p className="text-gray-600">
          There are three different ways to view and analyze your match data:
        </p>
        <ul className="list-disc list-inside text-gray-600 text-sm mt-2">
          <li>Team Data - Individual team statistics</li>
          <li>Club Data - Compare across all teams</li>
          <li>Game Data - Match-by-match details</li>
        </ul>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  // Team Data View - Combined introduction and description
  {
    target: '[data-tour="team-data-nav-icon"]',
    content: (
      <div>
        <h3 className="font-bold mb-3" style={{ fontSize: '20px' }}>Team Data - The First Way to Report</h3>
        <p className="text-gray-700 mb-3" style={{ fontSize: '15px', lineHeight: '1.6' }}>
          Team Data is the first way to report on your data. View detailed statistics for individual teams with interactive charts.
        </p>
        <p className="text-gray-600 mb-2" style={{ fontSize: '14px' }}>
          <strong>What you can do:</strong>
        </p>
        <ul className="list-disc list-inside text-gray-600 text-sm mb-3 space-y-1">
          <li>Filter by team, opponent, and date range</li>
          <li>View shots, goals, xG, possession, and passing metrics</li>
          <li>Customize which charts you see with chart groups</li>
          <li>Expand charts to focus on specific metrics</li>
        </ul>
        <p className="text-gray-600 text-sm italic">
          Let's explore by selecting a team and chart group.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
    data: { navigateTo: 'dashboard' },
  },
  // Interactive: Select Team and Chart Group - Combined
  {
    target: '[data-tour="team-selector"]',
    content: (
      <div>
        <h3 className="font-bold mb-3" style={{ fontSize: '18px' }}>Select a Team</h3>
        <p className="text-gray-700 mb-3" style={{ fontSize: '14px', lineHeight: '1.6' }}>
          Choose a team from the dropdown to view their statistics. The charts will update automatically once you make a selection.
        </p>
        <p className="text-gray-500 text-sm mt-2 italic font-medium">
          Please select a team to continue.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
    data: { waitForAction: 'team-selected', disableNext: true },
  },
  // Interactive: Select Chart Group
  {
    target: '[data-tour="chart-group-selector"]',
    content: (
      <div>
        <h3 className="font-bold mb-3" style={{ fontSize: '18px' }}>Select a Chart Group</h3>
        <p className="text-gray-700 mb-2" style={{ fontSize: '14px', lineHeight: '1.6' }}>
          Choose a chart group (like Shooting, Possession, or Passing) to see related charts. This will display multiple charts for that category.
        </p>
        <p className="text-gray-500 text-sm mt-2 italic font-medium">
          Please select a chart group to continue.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
    data: { waitForAction: 'chart-group-selected', disableNext: true },
  },
  // Charts Display - First Chart
  {
    target: '[data-tour="first-chart"]',
    content: (
      <div>
        <h3 className="font-bold mb-3" style={{ fontSize: '18px' }}>Interactive Charts</h3>
        <p className="text-gray-700 mb-3" style={{ fontSize: '14px', lineHeight: '1.6' }}>
          Here are your performance charts! Each chart is interactive and customizable.
        </p>
        <p className="text-gray-600 mb-2 text-sm font-medium">You can:</p>
        <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
          <li>Click the gear icon to customize which metrics are shown</li>
          <li>Expand or collapse charts to focus on what matters</li>
          <li>Hover over data points to see exact values</li>
          <li>Use the chart group selector to switch between different metric categories</li>
        </ul>
      </div>
    ),
    placement: 'auto',
    disableBeacon: true,
    data: { waitForAction: 'chart-visible' },
  },
  // Club Data View - Combined introduction and description
  {
    target: '[data-tour="club-data-nav-icon"]',
    content: (
      <div>
        <h3 className="font-bold mb-3" style={{ fontSize: '20px' }}>Club Data - The Second Way to Report</h3>
        <p className="text-gray-700 mb-3" style={{ fontSize: '15px', lineHeight: '1.6' }}>
          Club Data is the second way to interact with your data. Compare performance across all teams in the club to identify trends and patterns.
        </p>
        <p className="text-gray-600 mb-2 text-sm font-medium">This view allows you to:</p>
        <ul className="list-disc list-inside text-gray-600 text-sm mb-3 space-y-1">
          <li>Compare team performance side-by-side</li>
          <li>Filter by boys/girls programs</li>
          <li>Identify club-wide trends and patterns</li>
          <li>View aggregate statistics across multiple teams</li>
        </ul>
        <p className="text-gray-600 text-sm italic">
          Use the filters at the top to select teams and chart groups.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
    data: { navigateTo: 'club-data' },
  },
  // Game Data View - Combined introduction and description
  {
    target: '[data-tour="game-data-nav-icon"]',
    content: (
      <div>
        <h3 className="font-bold mb-3" style={{ fontSize: '20px' }}>Game Data - The Third Way to Report</h3>
        <p className="text-gray-700 mb-3" style={{ fontSize: '15px', lineHeight: '1.6' }}>
          Game Data shows match-by-match statistics in a detailed table format. Perfect for reviewing specific games and drilling down into individual match details.
        </p>
        <p className="text-gray-600 mb-2 text-sm font-medium">Features:</p>
        <ul className="list-disc list-inside text-gray-600 text-sm mb-3 space-y-1">
          <li>View all match data in a spreadsheet-like table</li>
          <li>Sort by any column to find patterns</li>
          <li>Filter by teams, opponents, and date ranges</li>
          <li>See all metrics for each game in one place</li>
        </ul>
        <p className="text-gray-600 text-sm italic">
          Use the filters above to narrow down to specific games.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
    data: { navigateTo: 'game-data' },
  },
  // AI Chat - Combined introduction and description
  {
    target: '[data-tour="chat-nav-icon"]',
    content: (
      <div>
        <h3 className="font-bold mb-3" style={{ fontSize: '20px' }}>JOGA AI Chat - Your Intelligent Assistant</h3>
        <p className="text-gray-700 mb-3" style={{ fontSize: '15px', lineHeight: '1.6' }}>
          Ask questions about your data in plain English! The AI assistant analyzes your match data and provides insights, answers questions, and can even generate visualizations.
        </p>
        <p className="text-gray-600 mb-2 text-sm font-medium">Try asking questions like:</p>
        <ul className="list-disc list-inside text-gray-600 text-sm mb-3 space-y-1">
          <li>"Show me possession stats from the last 5 games"</li>
          <li>"Compare shots for vs shots against by team"</li>
          <li>"What's the average xG for recent matches?"</li>
          <li>"Which team has the best conversion rate?"</li>
        </ul>
        <p className="text-gray-600 text-sm italic">
          The AI understands your data structure and can provide detailed analysis!
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
    data: { navigateTo: 'chat' },
  },
  // Completion
  {
    target: 'body',
    content: (
      <div className="text-center" style={{ padding: '30px 20px' }}>
        <h2 className="text-2xl font-bold mb-4" style={{ fontSize: '28px' }}>You're All Set! 🎉</h2>
        <p className="text-gray-700 mb-3" style={{ fontSize: '16px', lineHeight: '1.6' }}>
          That's the basics of JOGA Analytics. You now know how to:
        </p>
        <ul className="list-disc list-inside text-gray-600 text-sm mb-4 space-y-1" style={{ display: 'inline-block', textAlign: 'left' }}>
          <li>View team-specific analytics with interactive charts</li>
          <li>Compare performance across teams with Club Data</li>
          <li>Review individual games in the Game Data table</li>
          <li>Ask questions and get insights from the AI assistant</li>
        </ul>
        <p className="text-gray-600 mb-2" style={{ fontSize: '15px' }}>
          Start exploring your data or ask the AI assistant for insights!
        </p>
        <p className="text-sm text-gray-500">
          You can restart this tour anytime from Settings.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
];

export const Walkthrough: React.FC<WalkthroughProps> = ({ onNavigate, currentView }) => {
  const { user, refreshSession } = useAuth();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Add/remove class to body when walkthrough is running to disable sidebar hover
  useEffect(() => {
    if (run) {
      document.body.classList.add('walkthrough-active');
    } else {
      document.body.classList.remove('walkthrough-active');
    }
    return () => {
      document.body.classList.remove('walkthrough-active');
    };
  }, [run]);

  // Check if user needs onboarding
  useEffect(() => {
    if (user && !user.preferences?.onboardingCompleted) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setRun(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Auto-advance for interactive steps
  useEffect(() => {
    if (!run) return;

    const currentStep = tourSteps[stepIndex];
    if (!currentStep?.data?.waitForAction) return;

    const waitFor = currentStep.data.waitForAction;
    
    // Clear any existing interval
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }

    // Check periodically for the required action
    checkIntervalRef.current = setInterval(() => {
      let shouldAdvance = false;

      if (waitFor === 'team-selected') {
        // Check if team is selected (check URL or DOM)
        const teamSelect = document.querySelector('[data-tour="team-selector"]') as HTMLSelectElement;
        if (teamSelect && teamSelect.value) {
          shouldAdvance = true;
        }
      } else if (waitFor === 'chart-group-selected') {
        // Check if chart group is selected
        const chartGroupSelect = document.querySelector('[data-tour="chart-group-selector"]') as HTMLSelectElement;
        if (chartGroupSelect && chartGroupSelect.value) {
          shouldAdvance = true;
        }
      } else if (waitFor === 'chart-visible') {
        // Check if first chart is visible and fully rendered
        const firstChart = document.querySelector('[data-tour="first-chart"]');
        if (firstChart && firstChart.offsetParent !== null) {
          // Check if chart has actual content (not just empty container)
          const chartContent = firstChart.querySelector('svg, canvas, .recharts-wrapper');
          if (chartContent) {
            // Wait a bit more to ensure chart is fully rendered
            if (checkIntervalRef.current) {
              clearInterval(checkIntervalRef.current);
              checkIntervalRef.current = null;
            }
            setTimeout(() => {
              if (stepIndex < tourSteps.length - 1) {
                setStepIndex(stepIndex + 1);
              }
            }, 1000); // Wait 1 second for chart to fully render and stabilize
            return;
          }
        }
      } else if (waitFor === 'club-explore' || waitFor === 'game-explore') {
        // For club/game explore, wait a short moment for user to see the message, then advance
        // Use a one-time timeout instead of interval checking
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
        setTimeout(() => {
          if (stepIndex < tourSteps.length - 1) {
            setStepIndex(stepIndex + 1);
          }
        }, 3000); // Wait 3 seconds then advance (increased for better UX)
        return;
      }

      if (shouldAdvance) {
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
        // Longer delay before advancing to ensure UI is stable
        setTimeout(() => {
          if (stepIndex < tourSteps.length - 1) {
            setStepIndex(stepIndex + 1);
          }
        }, 700); // Increased delay for smoother transitions
      }
    }, 500); // Check every 500ms (reduced frequency for smoother experience)

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [run, stepIndex]);

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { action, index, status, type, step } = data;
    
    // Handle back button - go to previous step
    if (action === ACTIONS.PREV) {
      // Clear any auto-advance intervals
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      
      if (index > 0) {
        const newIndex = index - 1;
        const prevStep = tourSteps[newIndex];
        if (prevStep?.data?.navigateTo) {
          // Map 'dashboard' to 'team-data' for navigation
          const navTarget = prevStep.data.navigateTo === 'dashboard' ? 'team-data' : prevStep.data.navigateTo;
          onNavigate(navTarget as any);
          // Longer delay to let the view fully render before showing tooltip
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        // Update step index - this must happen after navigation
        setStepIndex(newIndex);
      }
      return;
    }
    
    // Handle step changes - navigate to the appropriate view
    if (type === EVENTS.STEP_AFTER && action === ACTIONS.NEXT) {
      const currentStep = tourSteps[index];
      
      // Check if this step requires an action and disableNext is set
      if (currentStep?.data?.disableNext && currentStep?.data?.waitForAction) {
        const waitFor = currentStep.data.waitForAction;
        let canAdvance = false;
        
        if (waitFor === 'team-selected') {
          const teamSelect = document.querySelector('[data-tour="team-selector"]') as HTMLSelectElement;
          canAdvance = teamSelect && !!teamSelect.value;
        } else if (waitFor === 'chart-group-selected') {
          const chartGroupSelect = document.querySelector('[data-tour="chart-group-selector"]') as HTMLSelectElement;
          canAdvance = chartGroupSelect && !!chartGroupSelect.value;
        }
        
        // If required action not completed, prevent advancement
        if (!canAdvance) {
          return;
        }
      }
      
      const nextStep = tourSteps[index + 1];
      if (nextStep?.data?.navigateTo) {
        // Map 'dashboard' to 'team-data' for navigation
        const navTarget = nextStep.data.navigateTo === 'dashboard' ? 'team-data' : nextStep.data.navigateTo;
        onNavigate(navTarget as any);
        // Longer delay to let the view fully render before showing tooltip
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      // Clear any auto-advance intervals when manually advancing
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      setStepIndex(index + 1);
    }

    if (type === EVENTS.STEP_BEFORE) {
      // Ensure we're on the right view for the current step
      const currentStep = tourSteps[index];
      if (currentStep?.data?.navigateTo) {
        // Map 'dashboard' to 'team-data' for navigation
        const navTarget = currentStep.data.navigateTo === 'dashboard' ? 'team-data' : currentStep.data.navigateTo;
        // Check if we need to navigate (currentView could be 'dashboard' or 'team-data' for the same view)
        const needsNavigation = currentView !== navTarget && 
                                !(currentView === 'dashboard' && navTarget === 'team-data') &&
                                !(currentView === 'team-data' && navTarget === 'team-data');
        if (needsNavigation) {
          onNavigate(navTarget as any);
          // Wait for navigation to complete
          await new Promise(resolve => setTimeout(resolve, 400));
        }
      }
    }

    // Handle completion or skip
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      setRun(false);
      setStepIndex(0);
      
      // Clear intervals
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      
      // Mark onboarding as completed
      if (user) {
        try {
          await updateUserPreferences(user.id, {
            ...user.preferences,
            onboardingCompleted: true,
            onboardingCompletedAt: new Date().toISOString(),
          });
          // Refresh user to update preferences
          if (refreshSession) {
            await refreshSession();
          }
        } catch (err) {
          console.error('Failed to save onboarding status:', err);
        }
      }
      
      // Navigate back to team data after tour completes
      onNavigate('team-data');
    }

    // Handle close button
    if (action === ACTIONS.CLOSE) {
      setRun(false);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    }
  };

  // Allow manually starting the tour
  const startTour = useCallback(() => {
    setStepIndex(0);
    onNavigate('team-data'); // Navigate to team-data which maps to dashboard view
    // Small delay to ensure navigation completes before starting tour
    setTimeout(() => {
      setRun(true);
    }, 100);
  }, [onNavigate]);

  // Expose startTour function globally for Settings to use
  useEffect(() => {
    (window as any).startWalkthrough = startTour;
    return () => {
      delete (window as any).startWalkthrough;
    };
  }, [startTour]);

  return (
    <Joyride
      steps={tourSteps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      disableOverlayClose
      spotlightClicks
      spotlightPadding={0}
      scrollToFirstStep
      disableScrolling={false}
      floaterProps={{
        disableAnimation: false,
        styles: {
          arrow: {
            length: 8,
            spread: 8,
          },
        },
      }}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: JOGA_COLORS.valorBlue,
          zIndex: 10000,
          arrowColor: '#fff',
          backgroundColor: '#fff',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          textColor: '#333',
        },
        buttonNext: {
          backgroundColor: JOGA_COLORS.voltYellow,
          color: '#000',
          fontWeight: 500,
          borderRadius: '6px',
          padding: '8px 16px',
        },
        buttonBack: {
          color: JOGA_COLORS.valorBlue,
          marginRight: 10,
        },
        buttonSkip: {
          color: '#6b7280',
        },
        tooltip: {
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '450px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipTitle: {
          fontSize: '20px',
          fontWeight: 700,
          marginBottom: '12px',
        },
        tooltipContent: {
          fontSize: '15px',
          lineHeight: 1.7,
        },
        spotlight: {
          borderRadius: '8px',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  );
};

// Export a function to trigger the walkthrough programmatically
export const triggerWalkthrough = () => {
  if ((window as any).startWalkthrough) {
    (window as any).startWalkthrough();
  }
};
