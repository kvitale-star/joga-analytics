import React from 'react';

interface DateFilterProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  availableDates: { value: string; label: string }[];
}

export const DateFilter: React.FC<DateFilterProps> = ({
  selectedDate,
  onDateChange,
  availableDates,
}) => {
  if (availableDates.length === 0) {
    return null;
  }

  return (
    <div className="flex-shrink-0">
      <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
      <select
        value={selectedDate || ''}
        onChange={(e) => onDateChange(e.target.value || '')}
        className={`px-3 py-1.5 text-sm border-2 rounded-lg bg-white focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] whitespace-nowrap ${
          selectedDate ? 'border-[#ceff00]' : 'border-gray-300'
        }`}
        style={selectedDate ? { borderColor: '#ceff00', width: 'auto', minWidth: '140px' } : { width: 'auto', minWidth: '140px' }}
      >
        <option value="">All Dates</option>
        {availableDates.map((date) => (
          <option key={date.value} value={date.value}>
            {date.label}
          </option>
        ))}
      </select>
    </div>
  );
};

