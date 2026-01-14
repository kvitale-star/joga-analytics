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
  spreadsheetId: string;
  range: string;
  apiKey?: string;
  credentials?: {
    client_email: string;
    private_key: string;
  };
}








