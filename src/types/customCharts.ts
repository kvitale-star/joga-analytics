export type ChartType = 'line' | 'bar' | 'area' | 'scatter';

export interface CustomChartConfig {
  xAxis: {
    key: string; // Column key for x-axis (e.g., 'Date', 'Match')
    label?: string;
  };
  series: Array<{
    key: string; // Column key for y-axis
    label: string;
    aggregation?: 'none' | 'avg' | 'sum'; // How to aggregate if grouping
  }>;
  filters?: {
    teams?: string[]; // Team slugs or names
    opponents?: string[];
    seasons?: number[];
    dateRange?: {
      start?: string; // ISO date string
      end?: string;
    };
  };
  groupBy?: 'match' | 'date' | 'team'; // How to group data
}

export interface CustomChart {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  chartType: ChartType;
  config: CustomChartConfig;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChartRenderData {
  xKey: string;
  xLabel: string;
  series: Array<{
    key: string;
    label: string;
    data: Array<{ x: any; y: number | null }>;
  }>;
}

export interface CreateChartRequest {
  name: string;
  description?: string;
  chartType: ChartType;
  config: CustomChartConfig;
}

export interface UpdateChartRequest {
  name?: string;
  description?: string;
  chartType?: ChartType;
  config?: CustomChartConfig;
}

export interface RenderChartRequest {
  range: string; // Sheet range (e.g., "Match Log!A1:ZZ1000")
  filters?: CustomChartConfig['filters']; // Optional additional filters
}
