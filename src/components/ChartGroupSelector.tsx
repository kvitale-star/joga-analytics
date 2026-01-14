import React from 'react';
import { CHART_GROUPS } from '../utils/chartGroups';

interface ChartGroupSelectorProps {
  selectedGroup: string | null;
  onGroupChange: (groupId: string | null) => void;
}

export const ChartGroupSelector: React.FC<ChartGroupSelectorProps> = ({
  selectedGroup,
  onGroupChange,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Chart Groups
      </label>
      <select
        value={selectedGroup || ''}
        onChange={(e) => onGroupChange(e.target.value || null)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6787aa] focus:border-[#6787aa] text-sm"
      >
        <option value="">Select a group...</option>
        {[...CHART_GROUPS].sort((a, b) => {
          // "All Charts" always at top
          if (a.id === 'all') return -1;
          if (b.id === 'all') return 1;
          // Rest alphabetically
          return a.name.localeCompare(b.name);
        }).map((group) => (
          <option key={group.id} value={group.id}>
            {group.name} - {group.description}
          </option>
        ))}
      </select>
      {selectedGroup && (
        <p className="text-xs text-gray-500 mt-2">
          {CHART_GROUPS.find((g) => g.id === selectedGroup)?.description}
        </p>
      )}
    </div>
  );
};

