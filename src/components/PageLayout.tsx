import React, { ReactNode } from 'react';
import { UserMenu } from './UserMenu';

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  children: ReactNode;
  maxWidth?: '4xl' | '6xl' | '7xl' | 'full';
  className?: string;
  contentClassName?: string;
  footer?: ReactNode;
  headerBgColor?: string;
}

export const PageLayout: React.FC<PageLayoutProps> = ({
  title,
  subtitle,
  headerActions,
  children,
  maxWidth = '6xl',
  className = '',
  contentClassName = '',
  footer,
  headerBgColor,
}) => {
  const maxWidthClass = {
    '4xl': 'max-w-4xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    'full': 'max-w-full',
  }[maxWidth];

  const headerStyle = headerBgColor ? { backgroundColor: headerBgColor } : {};
  const headerClassName = headerBgColor 
    ? 'shadow-sm border-b border-gray-200' 
    : 'bg-white shadow-sm border-b border-gray-200';
  const titleTextColor = headerBgColor === '#ceff00' ? 'text-gray-900' : 'text-gray-900';
  const subtitleTextColor = headerBgColor === '#ceff00' ? 'text-gray-700' : 'text-gray-600';

  return (
    <div className={`flex flex-col h-screen bg-gray-50 ${className}`}>
      {/* Standard Header */}
      <header className={headerClassName} style={headerStyle}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold ${titleTextColor}`}>{title}</h1>
              {subtitle && (
                <p className={`text-sm ${subtitleTextColor} mt-1`}>{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {headerActions}
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className={`flex-1 overflow-y-auto p-6 ${contentClassName}`}>
        <div className={`${maxWidthClass} mx-auto w-full`}>
          {children}
        </div>
      </div>

      {/* Footer (optional) */}
      {footer && (
        <div className="bg-white border-t border-gray-200">
          {footer}
        </div>
      )}
    </div>
  );
};
