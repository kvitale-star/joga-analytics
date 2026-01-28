import React, { useState, useEffect } from 'react';
import { getMetricDefinitions, getMetricCategories, syncMetricDefinitions, MetricDefinition } from '../services/glossaryService';
import { useAuth } from '../contexts/AuthContext';
import { JOGA_COLORS } from '../utils/colors';
import { PageLayout } from './PageLayout';

export const Glossary: React.FC = () => {
  const { user } = useAuth();
  const [definitions, setDefinitions] = useState<MetricDefinition[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  const splitCategories = (categoryRaw: string | null): string[] => {
    if (!categoryRaw) return [];
    return categoryRaw
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => (c === 'Other' ? 'Game Info' : c));
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [defs, cats] = await Promise.all([
        getMetricDefinitions(selectedCategory || undefined),
        getMetricCategories(),
      ]);
      
      setDefinitions(defs);
      setCategories(cats);
    } catch (err: any) {
      console.error('Error loading glossary:', err);
      setError(err.message || 'Failed to load glossary');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!isAdmin) return;
    
    try {
      setSyncing(true);
      setError(null);
      const result = await syncMetricDefinitions();
      alert(`Successfully synced ${result.count} metric definitions from Google Sheets.`);
      await loadData();
    } catch (err: any) {
      console.error('Error syncing glossary:', err);
      setError(err.message || 'Failed to sync glossary');
    } finally {
      setSyncing(false);
    }
  };

  // Filter definitions by search term
  const filteredDefinitions = definitions.filter(def => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      def.metric_name.toLowerCase().includes(search) ||
      def.description?.toLowerCase().includes(search) ||
      def.notes?.toLowerCase().includes(search) ||
      def.category?.toLowerCase().includes(search)
    );
  });

  // Group by category
  const groupedDefinitions = filteredDefinitions.reduce((acc, def) => {
    const categoriesForDef = splitCategories(def.category);
    const categories = categoriesForDef.length > 0 ? categoriesForDef : ['Uncategorized'];

    for (const category of categories) {
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(def);
    }
    return acc;
  }, {} as Record<string, MetricDefinition[]>);

  const sortedCategories = Object.keys(groupedDefinitions).sort();

  // JOGA colors for category headers (repeating pattern)
  const categoryColors = [JOGA_COLORS.voltYellow, JOGA_COLORS.pinkFoam, JOGA_COLORS.valorBlue];
  
  const getCategoryColor = (index: number): string => {
    return categoryColors[index % categoryColors.length];
  };

  const syncButton = isAdmin ? (
              <button
                onClick={handleSync}
                disabled={syncing}
      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {syncing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
          Sync
                  </>
                )}
              </button>
  ) : null;

  return (
    <PageLayout
      title="Metric Glossary"
      subtitle="Definitions and explanations for all metrics used in JOGA Analytics"
      headerActions={syncButton}
      maxWidth="4xl"
    >
          {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center mb-6">
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Category:</label>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search metrics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading glossary...</p>
          </div>
        ) : filteredDefinitions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">
              {searchTerm ? 'No metrics found matching your search.' : 'No metric definitions found.'}
            </p>
          </div>
        ) : (
          /* Definitions by Category - Table Layout */
          <div className="space-y-8">
            {sortedCategories.map((category, categoryIndex) => {
              const categoryColor = getCategoryColor(categoryIndex);
              // Determine text color based on background (volt yellow needs dark text)
              const textColor = categoryColor === JOGA_COLORS.voltYellow ? 'text-gray-900' : 'text-white';
              
              return (
              <div key={category} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <div 
                  className="px-6 py-4 border-b border-gray-200"
                  style={{ backgroundColor: categoryColor }}
                >
                  <h2 className={`text-xl font-semibold ${textColor}`}>{category}</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 table-auto">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                          Metric Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Units
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Calculation
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Example
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {groupedDefinitions[category].map(def => (
                        <tr key={def.id || def.metric_name} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                            <div className="text-sm font-semibold text-gray-900">{def.metric_name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{def.description || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{def.units || '-'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {def.calculation ? (
                                <code className="bg-gray-100 px-2 py-1 rounded text-xs">{def.calculation}</code>
                              ) : (
                                '-'
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{def.example || '-'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600">{def.notes || '-'}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              );
            })}
          </div>
        )}
    </PageLayout>
  );
};
