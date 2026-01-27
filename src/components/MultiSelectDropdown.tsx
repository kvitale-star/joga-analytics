import { useState, useRef, useEffect } from 'react';

interface MultiSelectDropdownProps {
  options: { value: string; label: string }[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  isTeamDropdown?: boolean;
  customAction?: {
    label: string;
    onClick: () => void;
  };
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedValues,
  onSelectionChange,
  placeholder = 'Select...',
  className = '',
  isTeamDropdown = false,
  customAction,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  const toggleOption = (value: string) => {
    if (selectedValues.includes(value)) {
      onSelectionChange(selectedValues.filter(v => v !== value));
    } else {
      onSelectionChange([...selectedValues, value]);
    }
  };

  const displayText = selectedValues.length > 0 
    ? `${selectedValues.length} selected`
    : placeholder;

  return (
    <div className={`relative z-[200] ${className}`} ref={dropdownRef} style={{ width: 'auto', minWidth: 'fit-content' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`pl-3 pr-2 py-1.5 text-sm rounded-lg bg-white focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] text-left flex items-center justify-between whitespace-nowrap ${className} ${
          isTeamDropdown ? 'border-2 border-[#ceff00]' : 'border border-gray-300'
        }`}
        style={isTeamDropdown ? { borderColor: '#ceff00', width: 'auto', minWidth: 'fit-content' } : { width: 'auto', minWidth: 'fit-content' }}
      >
        <span className={`${selectedValues.length === 0 ? 'text-gray-500' : 'text-gray-900'} whitespace-nowrap`}>
          {displayText}
        </span>
        <svg
          className={`w-4 h-4 text-gray-900 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'transform rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-[200] mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto" style={{ minWidth: '100%', width: 'max-content' }}>
          {options.map((option) => {
            const isSelected = selectedValues.includes(option.value);
            return (
              <label
                key={option.value}
                className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer whitespace-nowrap"
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOption(option.value)}
                  className="mr-2 h-4 w-4 text-[#6787aa] focus:ring-[#6787aa] border-gray-300 rounded flex-shrink-0"
                />
                <span className="text-sm text-gray-700 whitespace-nowrap">{option.label}</span>
              </label>
            );
          })}
          {customAction && (
            <>
              <div className="border-t border-gray-200 my-1"></div>
              <button
                onClick={() => {
                  customAction.onClick();
                  setIsOpen(false);
                }}
                className="w-full flex items-center px-3 py-2 hover:bg-gray-50 text-sm text-gray-700 whitespace-nowrap"
              >
                <span className="mr-2">+</span>
                <span>{customAction.label}</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};



