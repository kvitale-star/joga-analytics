export interface MatchData {
  [key: string]: string | number | undefined;
  // Common fields (will be populated from sheet)
  opponent?: string;
  date?: string;
  shotsFor?: number;
  shotsAgainst?: number;
  possession?: number;
  conversionRate?: number;
  xG?: number;
  xGA?: number;
}

export interface SheetConfig {
  spreadsheetId?: string; // Optional - now handled by backend
  range: string;
  apiKey?: string; // Optional - now handled by backend
  credentials?: {
    client_email: string;
    private_key: string;
  };
}








