import React, { Component, ErrorInfo, ReactNode } from 'react';
import { JOGA_COLORS } from '../utils/colors';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
            <p className="text-gray-700 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="font-medium py-2 px-4 rounded-lg transition-colors text-black"
              style={{
                backgroundColor: JOGA_COLORS.voltYellow,
                border: `2px solid ${JOGA_COLORS.voltYellow}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#b8e600'; // Darker volt yellow
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = JOGA_COLORS.voltYellow;
              }}
            >
              Reload Page
            </button>
            <details className="mt-4">
              <summary className="text-sm text-gray-600 cursor-pointer">Error Details</summary>
              <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                {this.state.error?.stack}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

