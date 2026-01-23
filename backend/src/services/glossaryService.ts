import { db } from '../db/database.js';
import { fetchColumnMetadata } from './sheetsService.js';

// Type for column metadata (matches what fetchColumnMetadata returns)
export type ColumnMetadata = Record<string, any>;

export interface MetricDefinition {
  id?: number;
  metric_name: string;
  category: string | null;
  description: string | null;
  units: string | null;
  calculation: string | null;
  notes: string | null;
  example: string | null;
  data_type: string | null;
  availability: string | null;
  source?: string;
  last_synced_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Sync metric definitions from Google Sheets Metadata tab
 */
export async function syncMetricDefinitionsFromSheet(): Promise<number> {
  try {
    // Fetch metadata from Google Sheets
    const metadata = await fetchColumnMetadata('Metadata!A1:Z100');
    
    if (!metadata || Object.keys(metadata).length === 0) {
      console.log('📚 No metadata found in Google Sheets');
      return 0;
    }

    let syncedCount = 0;
    const now = new Date().toISOString();

    // Categorize metrics based on their names (similar to GameDataView categorization)
    const categorizeMetric = (metricName: string): string | null => {
      const nameLower = metricName.toLowerCase();
      
      if (nameLower.includes('attempt') || nameLower.includes('shot') || 
          nameLower.includes('goal') || nameLower.includes('xg') || 
          nameLower.includes('conversion') || nameLower.includes('conv') ||
          nameLower.includes('inside box') || nameLower.includes('outside box') ||
          (nameLower === 'tsr' || (nameLower.includes('tsr') && !nameLower.includes('pass')))) {
        return 'Shooting';
      }
      
      if (nameLower.includes('pass') || nameLower.includes('string') || 
          nameLower.includes('lpc') || nameLower.includes('ppm') || nameLower.includes('zone')) {
        return 'Passing';
      }
      
      if ((nameLower.includes('possession') || nameLower.includes('poss')) && 
          !nameLower.includes('won')) {
        return 'Possession';
      }
      
      if (nameLower.includes('spi') || nameLower.includes('joga')) {
        return 'JOGA Metrics';
      }
      
      if (nameLower.includes('possession') && nameLower.includes('won')) {
        return 'Defense';
      }
      
      if (nameLower.includes('corner') || nameLower.includes('free kick') || 
          nameLower.includes('freekick') || nameLower.includes('penalty')) {
        return 'Set Pieces';
      }
      
      if (nameLower.includes('season') || nameLower.includes('date') || 
          nameLower.includes('competition') || nameLower.includes('result') ||
          nameLower.includes('match') || nameLower.includes('team') || 
          nameLower.includes('opponent')) {
        return 'Other';
      }
      
      return null;
    };

    // Process each metric
    for (const [metricName, meta] of Object.entries(metadata)) {
      const category = categorizeMetric(metricName);
      
      // Check if metric already exists
      const existing = await db
        .selectFrom('metric_definitions')
        .selectAll()
        .where('metric_name', '=', metricName)
        .executeTakeFirst();

      const definition: Partial<MetricDefinition> = {
        metric_name: metricName,
        category,
        description: meta.description || null,
        units: meta.units || null,
        calculation: meta.calculation || null,
        notes: meta.notes || null,
        example: meta.example || null,
        data_type: meta.dataType || null,
        availability: meta.availability || null,
        source: 'google_sheets',
        last_synced_at: now,
        updated_at: now,
      };

      if (existing) {
        // Update existing
        await db
          .updateTable('metric_definitions')
          .set(definition)
          .where('metric_name', '=', metricName)
          .execute();
      } else {
        // Insert new
        await db
          .insertInto('metric_definitions')
          .values({
            ...definition,
            created_at: now,
          } as any)
          .execute();
      }
      
      syncedCount++;
    }

    console.log(`📚 Synced ${syncedCount} metric definitions from Google Sheets`);
    return syncedCount;
  } catch (error: any) {
    console.error('📚 Error syncing metric definitions:', error);
    throw error;
  }
}

/**
 * Get all metric definitions, optionally filtered by category
 */
export async function getMetricDefinitions(category?: string): Promise<MetricDefinition[]> {
  let query = db
    .selectFrom('metric_definitions')
    .selectAll()
    .orderBy('category', 'asc')
    .orderBy('metric_name', 'asc');

  if (category) {
    query = query.where('category', '=', category) as any;
  }

  return await query.execute();
}

/**
 * Get metric definition by name
 */
export async function getMetricDefinitionByName(metricName: string): Promise<MetricDefinition | null> {
  const result = await db
    .selectFrom('metric_definitions')
    .selectAll()
    .where('metric_name', '=', metricName)
    .executeTakeFirst();

  return result || null;
}

/**
 * Get all unique categories
 */
export async function getMetricCategories(): Promise<string[]> {
  const results = await db
    .selectFrom('metric_definitions')
    .select('category')
    .distinct()
    .where('category', 'is not', null)
    .orderBy('category', 'asc')
    .execute();

  return results.map(r => r.category).filter((c): c is string => c !== null);
}
