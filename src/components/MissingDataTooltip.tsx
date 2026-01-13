import React, { useState, useRef, useEffect } from 'react';
import { MissingDataInfo } from '../utils/missingDataUtils';

interface MissingDataTooltipProps {
  info: MissingDataInfo;
  children: React.ReactNode;
}

export const MissingDataTooltip: React.FC<MissingDataTooltipProps> = ({ info, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleMouseEnter = () => {
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
  };

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        containerRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const tooltipContent = (
    <div 
      ref={tooltipRef}
      className="bg-gray-900 text-white text-xs rounded-lg shadow-xl p-3 max-w-xs z-[100] border border-gray-700"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="font-semibold mb-2 text-sm">Missing Data Details</div>
      
      {info.missingColumns.length > 0 && (
        <div className="mb-2">
          <div className="font-medium mb-1 text-yellow-400">Missing Columns:</div>
          <div className="text-gray-300 text-xs">{info.missingColumns.join(', ')}</div>
        </div>
      )}
      
      <div className="mb-2">
        <div className="font-medium mb-1">Affected:</div>
        <div className="text-gray-300">
          {info.affectedMatches} match{info.affectedMatches !== 1 ? 'es' : ''}
        </div>
      </div>
      
      {info.affectedOpponents.length > 0 && info.affectedOpponents.length <= 5 && (
        <div className="mb-2">
          <div className="font-medium mb-1">Opponents:</div>
          <div className="text-gray-300 text-xs">{info.affectedOpponents.join(', ')}</div>
        </div>
      )}
      
      {info.affectedOpponents.length > 5 && (
        <div className="mb-2">
          <div className="font-medium mb-1">Opponents:</div>
          <div className="text-gray-300 text-xs">
            {info.affectedOpponents.slice(0, 3).join(', ')} and {info.affectedOpponents.length - 3} more
          </div>
        </div>
      )}
      
      <div className="pt-2 border-t border-gray-700">
        <div className="text-gray-300">
          Data Completeness: <span className="font-semibold text-yellow-400">{info.completenessPercentage}%</span>
        </div>
      </div>
    </div>
  );

  return (
    <div 
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 z-[100]">
          {tooltipContent}
        </div>
      )}
    </div>
  );
};

