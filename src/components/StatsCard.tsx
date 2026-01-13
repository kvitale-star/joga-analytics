import React from 'react';
import { MissingDataInfo } from '../utils/missingDataUtils';
import { MissingDataTooltip } from './MissingDataTooltip';
import { JOGA_COLORS } from '../utils/colors';

interface StatsCardProps {
  title: string;
  value?: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'cyan' | 'indigo' | 'pink' | 'yellow' | 'teal' | 'amber' | 'joga-blue' | 'joga-yellow';
  // Support for dual values (e.g., "For" and "Against")
  value2?: string | number;
  label1?: string; // Label for first value (e.g., "For")
  label2?: string; // Label for second value (e.g., "Against")
  valueSuffix1?: string; // Optional smaller text to display next to first value
  valueSuffix2?: string; // Optional smaller text to display next to second value
  // Support for multiple values (3 or 4)
  values?: Array<{ label: string; value: string | number; isIncomplete?: boolean; tooltip?: string }>;
  // Indicate if data is incomplete
  isIncomplete?: boolean;
  incompleteTooltip?: string; // Tooltip text explaining what's missing (basic)
  missingDataInfo?: MissingDataInfo; // Detailed missing data information
  titleTooltip?: string; // Optional tooltip text to show next to the title
  titleSize?: 'sm' | 'md' | 'lg'; // Optional title size override
  compactTitle?: boolean; // If true, reduces top padding to place title higher
  narrowCard?: boolean; // If true, makes the card narrower (useful for 2-value cards)
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  value2,
  label1,
  label2,
  valueSuffix1,
  valueSuffix2,
  values,
  subtitle,
  trend,
  color = 'blue',
  isIncomplete = false,
  incompleteTooltip,
  missingDataInfo,
  titleTooltip,
  titleSize = 'sm',
  compactTitle = false,
  narrowCard = false,
}) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    green: 'bg-green-50 border-green-200 text-green-900',
    red: 'bg-red-50 border-red-200 text-red-900',
    purple: 'bg-purple-50 border-purple-200 text-purple-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-900',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-900',
    pink: 'bg-pink-50 border-pink-200 text-pink-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    teal: 'bg-teal-50 border-teal-200 text-teal-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    'joga-blue': '', // Custom styling with inline styles
    'joga-yellow': '', // Custom styling with inline styles
  };
  
  // Get custom styles for JOGA colors
  const getJogaStyles = (colorName: string) => {
    if (colorName === 'joga-blue') {
      return {
        backgroundColor: 'rgba(103, 135, 170, 0.1)',
        borderColor: JOGA_COLORS.valorBlue,
        color: '#1f2937',
      };
    }
    if (colorName === 'joga-yellow') {
      return {
        backgroundColor: 'rgba(206, 255, 0, 0.1)',
        borderColor: JOGA_COLORS.voltYellow,
        color: '#000000',
      };
    }
    return {};
  };
  
  const customStyles = color === 'joga-blue' || color === 'joga-yellow' ? getJogaStyles(color) : {};
  // Standardized padding - all cards have consistent top padding for title alignment
  const paddingClass = compactTitle ? 'pt-2 pb-6 px-6' : 'pt-4 pb-6 px-6';
  const cardClassName = color === 'joga-blue' || color === 'joga-yellow' 
    ? `rounded-lg border-2 ${paddingClass} relative`
    : `rounded-lg border-2 ${paddingClass} ${colorClasses[color]} relative`;

  const trendIcon = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  // Helper function to render value with smaller % sign if present
  const renderValue = (val: string | number | undefined) => {
    if (val === undefined || val === null) return null;
    const strValue = String(val);
    if (strValue.endsWith('%')) {
      const numValue = strValue.slice(0, -1);
      return (
        <>
          {numValue}
          <span className="text-lg">{'%'}</span>
        </>
      );
    }
    return strValue;
  };

  // If we have multiple values (3 or 4), display them in a grid
  if (values && values.length > 0) {
    const gridCols = values.length === 3 ? 'grid-cols-3' : 'grid-cols-4';
    // Check if any values are incomplete for the top-right asterisk tooltip
    const hasIncompleteValues = values.some(v => v.isIncomplete) || isIncomplete;
    const asteriskElement = hasIncompleteValues ? (
      missingDataInfo ? (
        <div className="absolute top-2 right-2">
          <MissingDataTooltip info={missingDataInfo}>
            <div className="text-lg font-bold text-yellow-600 cursor-pointer hover:text-yellow-700">
              *
            </div>
          </MissingDataTooltip>
        </div>
      ) : (
        <div 
          className="absolute top-2 right-2 text-lg font-bold text-yellow-600 cursor-help"
          title={incompleteTooltip || 'Some data is missing'}
        >
          *
        </div>
      )
    ) : null;

    const infoIconElement = titleTooltip ? (
      <div className={`absolute top-2 group ${hasIncompleteValues ? 'right-8' : 'right-2'}`}>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Card information"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-10 pointer-events-none">
          <div className="bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 w-64 border border-gray-700 whitespace-normal">
            {titleTooltip}
          </div>
        </div>
      </div>
    ) : null;

    return (
      <div className={cardClassName} style={customStyles}>
        {asteriskElement}
        {infoIconElement}
        <div className={`${titleSize === 'lg' ? 'text-base' : titleSize === 'md' ? 'text-sm' : 'text-sm'} font-medium opacity-75 mb-3`}>
          {title}
        </div>
        <div className={`grid ${gridCols} gap-3`}>
          {values.map((item, index) => (
            <div key={index} className="text-center">
              <div className="text-xs opacity-75 mb-1.5 h-4 flex items-center justify-center whitespace-nowrap">
                {item.label}
                {item.isIncomplete && (
                  item.tooltip ? (
                    <div className="relative group ml-1">
                      <span className="text-yellow-600 cursor-pointer">*</span>
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 pointer-events-none">
                        <div className="bg-gray-900 text-white text-xs rounded-lg shadow-xl p-2 w-48 border border-gray-700 whitespace-normal">
                          {item.tooltip}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span className="ml-1 text-yellow-600">*</span>
                  )
                )}
              </div>
              <div className="text-2xl font-bold leading-none flex items-baseline justify-center gap-0.5">{renderValue(item.value)}</div>
            </div>
          ))}
        </div>
        {subtitle && (
          <div className="mt-3 text-sm opacity-75">
            {trend && <span className="mr-1">{trendIcon[trend]}</span>}
            {subtitle}
          </div>
        )}
      </div>
    );
  }

  // If we have two values, display them side by side
  if (value2 !== undefined) {
    const asteriskElement = isIncomplete ? (
      missingDataInfo ? (
        <div className="absolute top-2 right-2">
          <MissingDataTooltip info={missingDataInfo}>
            <div className="text-lg font-bold text-yellow-600 cursor-pointer hover:text-yellow-700">
              *
            </div>
          </MissingDataTooltip>
        </div>
      ) : (
        <div 
          className="absolute top-2 right-2 text-lg font-bold text-yellow-600 cursor-help"
          title={incompleteTooltip || 'Some data is missing'}
        >
          *
        </div>
      )
    ) : null;

    const infoIconElement = titleTooltip ? (
      <div className={`absolute top-2 group ${isIncomplete ? 'right-8' : 'right-2'}`}>
        <button
          type="button"
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Card information"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-10 pointer-events-none">
          <div className="bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 w-64 border border-gray-700 whitespace-normal">
            {titleTooltip}
          </div>
        </div>
      </div>
    ) : null;

    return (
      <div className={cardClassName} style={customStyles}>
        {asteriskElement}
        {infoIconElement}
        <div className={`${titleSize === 'lg' ? 'text-base' : titleSize === 'md' ? 'text-sm' : 'text-sm'} font-medium opacity-75 mb-3`}>
          {title}
          {isIncomplete && <span className="ml-1 text-yellow-600">*</span>}
        </div>
        <div className={`grid grid-cols-2 gap-4 ${narrowCard ? 'max-w-[80%] mx-auto' : ''}`}>
          <div className="text-center">
            <div className="text-xs opacity-75 mb-1.5 h-4 flex items-center justify-center whitespace-nowrap">
              {label1 || '\u00A0'}
            </div>
            <div className="text-2xl font-bold leading-none flex items-baseline justify-center gap-0.5">
              {renderValue(value)}
              {valueSuffix1 && <span className="text-sm font-normal opacity-75">{valueSuffix1}</span>}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs opacity-75 mb-1.5 h-4 flex items-center justify-center whitespace-nowrap">
              {label2 || '\u00A0'}
            </div>
            <div className="text-2xl font-bold leading-none flex items-baseline justify-center gap-0.5">
              {renderValue(value2)}
              {valueSuffix2 && <span className="text-sm font-normal opacity-75">{valueSuffix2}</span>}
            </div>
          </div>
        </div>
        {subtitle && (
          <div className="mt-2 text-sm opacity-75">
            {trend && <span className="mr-1">{trendIcon[trend]}</span>}
            {subtitle}
          </div>
        )}
      </div>
    );
  }

  // Single value display (original behavior)
  const asteriskElement = isIncomplete ? (
    missingDataInfo ? (
      <div className="absolute top-2 right-2">
        <MissingDataTooltip info={missingDataInfo}>
          <div className="text-lg font-bold text-yellow-600 cursor-pointer hover:text-yellow-700">
            *
          </div>
        </MissingDataTooltip>
      </div>
    ) : (
      <div 
        className="absolute top-2 right-2 text-lg font-bold text-yellow-600 cursor-help"
        title={incompleteTooltip || 'Some data is missing'}
      >
        *
      </div>
    )
  ) : null;

  const infoIconElement = titleTooltip ? (
    <div className={`absolute top-2 group ${isIncomplete ? 'right-8' : 'right-2'}`}>
      <button
        type="button"
        className="text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Card information"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-10 pointer-events-none">
        <div className="bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 w-64 border border-gray-700 whitespace-normal">
          {titleTooltip}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className={`rounded-lg border-2 pt-4 pb-6 px-6 ${colorClasses[color]} relative`}>
      {asteriskElement}
      {infoIconElement}
      <div className={`${titleSize === 'lg' ? 'text-base' : titleSize === 'md' ? 'text-sm' : 'text-sm'} font-medium opacity-75 mb-3`}>
        {title}
        {isIncomplete && <span className="ml-1 text-yellow-600">*</span>}
      </div>
      <div className="text-2xl font-bold leading-none flex items-baseline gap-0.5">{renderValue(value)}</div>
      {subtitle && (
        <div className="mt-1 text-sm opacity-75">
          {trend && <span className="mr-1">{trendIcon[trend]}</span>}
          {subtitle}
        </div>
      )}
    </div>
  );
};

