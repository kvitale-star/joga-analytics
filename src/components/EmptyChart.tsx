import React from 'react';
import { EMPTY_CHART_OPTIONS } from './EmptyChartOptions';

interface EmptyChartProps {
  title?: string;
  height?: number;
  showTitle?: boolean;
}

// Module-level counter to cycle through variants without repetition
let variantCounter = 0;
const selectedVariants = [1, 3, 6, 7, 11]; // Variants 2, 4, 7, 8, 12 (0-indexed: 1, 3, 6, 7, 11)
const availableVariants = [...selectedVariants];

export const EmptyChart: React.FC<EmptyChartProps> = ({ title, height = 400, showTitle = true }) => {
  // Cycle through available variants
  const selectedVariantIndex = availableVariants[variantCounter % availableVariants.length];
  variantCounter++;
  
  // Reset counter after all variants have been used
  if (variantCounter >= availableVariants.length * 2) {
    variantCounter = 0;
  }
  
  const SelectedChart = EMPTY_CHART_OPTIONS[selectedVariantIndex];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 relative">
      {showTitle && title && <h3 className="text-xl font-bold mb-2 text-gray-800">{title}</h3>}
      <div className="relative">
        <div 
          className="opacity-30 pointer-events-none"
          style={{
            filter: 'blur(0.5px)',
            position: 'relative',
          }}
        >
          {/* Noise overlay using background pattern */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.15'/%3E%3C/svg%3E")`,
              mixBlendMode: 'multiply',
              opacity: 0.3,
            }}
          />
          <SelectedChart height={height} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center bg-white bg-opacity-90 px-10 py-6 rounded-2xl shadow-2xl border border-gray-200 backdrop-blur-sm">
            <p className="text-gray-700 text-lg font-semibold">Choose a team above</p>
          </div>
        </div>
      </div>
    </div>
  );
};
