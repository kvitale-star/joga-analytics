import { SheetConfig } from '../types';

export interface ColumnMetadata {
  description?: string;
  units?: string;
  calculation?: string;
  notes?: string;
  example?: string;
  dataType?: 'number' | 'string' | 'percentage' | 'date';
  availability?: string; // e.g., "some teams", "all teams", "league games only"
}

export interface ColumnMetadataMap {
  [columnName: string]: ColumnMetadata;
}

/**
 * Fetches column metadata from a "Metadata" tab in Google Sheets
 * Expected format:
 * Column Name | Description | Units | Calculation | Notes | Example | Data Type | Availability
 */
export async function fetchColumnMetadata(config: SheetConfig): Promise<ColumnMetadataMap> {
  const { spreadsheetId, apiKey } = config;
  
  if (!spreadsheetId) {
    return {};
  }

  try {
    // Try to fetch from a "Metadata" tab
    const metadataRanges = ['Metadata!A1:Z100', 'Column Definitions!A1:Z100', 'Metadata!A:Z'];
    
    for (const range of metadataRanges) {
      try {
        const encodedRange = encodeURIComponent(range);
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?key=${apiKey || ''}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (response.ok && data.values && data.values.length > 1) {
          // First row is headers, second row onwards is data
          const headers = data.values[0].map((h: string) => h.trim().toLowerCase());
          const rows = data.values.slice(1);
          
          const metadata: ColumnMetadataMap = {};
          
          // Find column indices
          const colNameIdx = headers.findIndex((h: string) => h.includes('column') || h.includes('name') || h === '');
          const descIdx = headers.findIndex((h: string) => h.includes('description') || h.includes('desc'));
          const unitsIdx = headers.findIndex((h: string) => h.includes('unit'));
          const calcIdx = headers.findIndex((h: string) => h.includes('calculation') || h.includes('calc') || h.includes('formula'));
          const notesIdx = headers.findIndex((h: string) => h.includes('note'));
          const exampleIdx = headers.findIndex((h: string) => h.includes('example'));
          const typeIdx = headers.findIndex((h: string) => h.includes('type') || h.includes('data type'));
          const availIdx = headers.findIndex((h: string) => h.includes('availability') || h.includes('available'));
          
          rows.forEach((row: string[]) => {
            const columnName = row[colNameIdx]?.trim();
            if (!columnName) return;
            
            metadata[columnName] = {
              description: descIdx >= 0 ? row[descIdx]?.trim() : undefined,
              units: unitsIdx >= 0 ? row[unitsIdx]?.trim() : undefined,
              calculation: calcIdx >= 0 ? row[calcIdx]?.trim() : undefined,
              notes: notesIdx >= 0 ? row[notesIdx]?.trim() : undefined,
              example: exampleIdx >= 0 ? row[exampleIdx]?.trim() : undefined,
              dataType: typeIdx >= 0 ? (row[typeIdx]?.trim().toLowerCase() as any) : undefined,
              availability: availIdx >= 0 ? row[availIdx]?.trim() : undefined,
            };
          });
          
          if (Object.keys(metadata).length > 0) {
            return metadata;
          }
        }
      } catch (err) {
        // Try next range
        continue;
      }
    }
    
    return {};
  } catch (error) {
    console.warn('Could not fetch column metadata from sheet:', error);
    return {};
  }
}

/**
 * Merges metadata from config file and sheet, with conflict resolution
 * Priority: Config file > Sheet metadata (config is more authoritative for business rules)
 */
export function mergeColumnMetadata(
  configMetadata: ColumnMetadataMap,
  sheetMetadata: ColumnMetadataMap
): ColumnMetadataMap {
  const merged: ColumnMetadataMap = {};
  
  // Get all unique column names
  const allColumns = new Set([
    ...Object.keys(configMetadata),
    ...Object.keys(sheetMetadata),
  ]);
  
  allColumns.forEach(columnName => {
    const configMeta = configMetadata[columnName] || {};
    const sheetMeta = sheetMetadata[columnName] || {};
    
    // Merge with priority: config takes precedence for business rules,
    // but sheet can provide additional technical details
    merged[columnName] = {
      // Description: config preferred (business context), fallback to sheet (technical)
      description: configMeta.description || sheetMeta.description,
      
      // Units: sheet preferred (more likely to be accurate), fallback to config
      units: sheetMeta.units || configMeta.units,
      
      // Calculation: sheet preferred (actual formula), fallback to config
      calculation: sheetMeta.calculation || configMeta.calculation,
      
      // Notes: merge both (both can be valuable)
      notes: [configMeta.notes, sheetMeta.notes].filter(Boolean).join(' | ') || undefined,
      
      // Example: sheet preferred (actual data), fallback to config
      example: sheetMeta.example || configMeta.example,
      
      // Data type: sheet preferred (technical accuracy), fallback to config
      dataType: sheetMeta.dataType || configMeta.dataType,
      
      // Availability: config preferred (business rules), fallback to sheet
      availability: configMeta.availability || sheetMeta.availability,
    };
    
    // Remove undefined values
    Object.keys(merged[columnName]).forEach(key => {
      if (merged[columnName][key as keyof ColumnMetadata] === undefined) {
        delete merged[columnName][key as keyof ColumnMetadata];
      }
    });
  });
  
  return merged;
}

/**
 * Formats column metadata for AI context
 */
export function formatMetadataForAI(metadata: ColumnMetadataMap): string {
  if (Object.keys(metadata).length === 0) {
    return '';
  }
  
  let formatted = '\nCOLUMN DEFINITIONS AND METADATA:\n';
  formatted += 'This section provides context about what each column means:\n\n';
  
  Object.entries(metadata).forEach(([columnName, meta]) => {
    formatted += `${columnName}:\n`;
    if (meta.description) formatted += `  Description: ${meta.description}\n`;
    if (meta.units) formatted += `  Units: ${meta.units}\n`;
    if (meta.calculation) formatted += `  Calculation: ${meta.calculation}\n`;
    if (meta.dataType) formatted += `  Data Type: ${meta.dataType}\n`;
    if (meta.availability) formatted += `  Availability: ${meta.availability}\n`;
    if (meta.notes) formatted += `  Notes: ${meta.notes}\n`;
    if (meta.example) formatted += `  Example: ${meta.example}\n`;
    formatted += '\n';
  });
  
  return formatted;
}

