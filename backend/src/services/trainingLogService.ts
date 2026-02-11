/**
 * Training Log Service
 * 
 * Manages training log entries and focus tags for tracking what teams work on in training.
 */

import { db } from '../db/database.js';
import type { TrainingLogRow, NewTrainingLog, TrainingFocusTagRow } from '../db/schema.js';

/**
 * Get all active training focus tags
 */
export async function getAllFocusTags(): Promise<TrainingFocusTagRow[]> {
  return await db
    .selectFrom('training_focus_tags')
    .selectAll()
    .where('is_active', '=', true)
    .orderBy('category', 'asc')
    .orderBy('sort_order', 'asc')
    .orderBy('display_name', 'asc')
    .execute();
}

/**
 * Get focus tags by category
 */
export async function getFocusTagsByCategory(category: string): Promise<TrainingFocusTagRow[]> {
  return await db
    .selectFrom('training_focus_tags')
    .selectAll()
    .where('category', '=', category)
    .where('is_active', '=', true)
    .orderBy('sort_order', 'asc')
    .orderBy('display_name', 'asc')
    .execute();
}

/**
 * Get training logs for a team
 */
export async function getTrainingLogsForTeam(
  teamId: number,
  options?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<TrainingLogRow[]> {
  let query = db
    .selectFrom('training_logs')
    .selectAll()
    .where('team_id', '=', teamId)
    .orderBy('session_date', 'desc')
    .orderBy('created_at', 'desc');

  if (options?.startDate) {
    query = query.where('session_date', '>=', options.startDate);
  }

  if (options?.endDate) {
    query = query.where('session_date', '<=', options.endDate);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  return await query.execute();
}

/**
 * Get training logs for a user (across all their teams)
 */
export async function getTrainingLogsForUser(
  userId: number,
  options?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<TrainingLogRow[]> {
  let query = db
    .selectFrom('training_logs')
    .selectAll()
    .where('user_id', '=', userId)
    .orderBy('session_date', 'desc')
    .orderBy('created_at', 'desc');

  if (options?.startDate) {
    query = query.where('session_date', '>=', options.startDate);
  }

  if (options?.endDate) {
    query = query.where('session_date', '<=', options.endDate);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  return await query.execute();
}

/**
 * Get training log by ID
 */
export async function getTrainingLogById(logId: number): Promise<TrainingLogRow | null> {
  return await db
    .selectFrom('training_logs')
    .selectAll()
    .where('id', '=', logId)
    .executeTakeFirst() || null;
}

/**
 * Create a new training log entry
 */
export async function createTrainingLog(
  logData: Omit<NewTrainingLog, 'id' | 'created_at' | 'updated_at'>
): Promise<TrainingLogRow> {
  const now = new Date().toISOString();
  
  const result = await db
    .insertInto('training_logs')
    .values({
      ...logData,
      created_at: now,
      updated_at: now,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return result;
}

/**
 * Update a training log entry
 */
export async function updateTrainingLog(
  logId: number,
  updates: Partial<Omit<TrainingLogRow, 'id' | 'created_at' | 'updated_at'>>
): Promise<TrainingLogRow> {
  const updateData: any = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // Remove fields that shouldn't be updated directly
  delete updateData.id;
  delete updateData.created_at;

  await db
    .updateTable('training_logs')
    .set(updateData)
    .where('id', '=', logId)
    .execute();

  const updated = await getTrainingLogById(logId);
  if (!updated) {
    throw new Error('Training log not found after update');
  }

  return updated;
}

/**
 * Delete a training log entry
 */
export async function deleteTrainingLog(logId: number): Promise<void> {
  await db
    .deleteFrom('training_logs')
    .where('id', '=', logId)
    .execute();
}

/**
 * Get training log summary for a team (aggregate statistics)
 */
export async function getTrainingLogSummary(
  teamId: number,
  startDate?: string,
  endDate?: string
): Promise<{
  totalSessions: number;
  tagFrequency: Record<string, number>;
  sessionsByType: Record<string, number>;
  averageDuration: number | null;
  recentSessions: TrainingLogRow[];
}> {
  let query = db
    .selectFrom('training_logs')
    .selectAll()
    .where('team_id', '=', teamId);

  if (startDate) {
    query = query.where('session_date', '>=', startDate);
  }

  if (endDate) {
    query = query.where('session_date', '<=', endDate);
  }

  const logs = await query
    .orderBy('session_date', 'desc')
    .execute();

  // Aggregate statistics
  const tagFrequency: Record<string, number> = {};
  const sessionsByType: Record<string, number> = {};
  let totalDuration = 0;
  let durationCount = 0;

  for (const log of logs) {
    // Count tags
    try {
      const tags = JSON.parse(log.focus_tags) as number[];
      for (const tagId of tags) {
        tagFrequency[tagId] = (tagFrequency[tagId] || 0) + 1;
      }
    } catch (e) {
      // Invalid JSON, skip
    }

    // Count by type
    sessionsByType[log.session_type] = (sessionsByType[log.session_type] || 0) + 1;

    // Sum duration
    if (log.duration_minutes) {
      totalDuration += log.duration_minutes;
      durationCount++;
    }
  }

  return {
    totalSessions: logs.length,
    tagFrequency,
    sessionsByType,
    averageDuration: durationCount > 0 ? totalDuration / durationCount : null,
    recentSessions: logs.slice(0, 10), // Last 10 sessions
  };
}
