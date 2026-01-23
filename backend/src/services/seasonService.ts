import { db } from '../db/database.js';

export interface Season {
  id: number;
  name: string; // Year label, e.g. "2026"
  isActive: boolean;
  createdAt: Date;
}

export async function getAllSeasons(): Promise<Season[]> {
  const seasons = await db
    .selectFrom('seasons')
    .selectAll()
    .orderBy('name', 'desc')
    .execute();

  return seasons.map(s => ({
    id: s.id,
    name: s.name,
    isActive: Boolean(s.is_active),
    createdAt: new Date(s.created_at),
  }));
}

export async function createSeason(year: number): Promise<Season> {
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    throw new Error('Invalid season year');
  }
  const name = String(year);
  const now = new Date().toISOString();

  const result = await db
    .insertInto('seasons')
    .values({
      name,
      start_date: null,
      end_date: null,
      is_active: 0,
      created_at: now,
    })
    .returning('id')
    .executeTakeFirstOrThrow();

  const created = await db
    .selectFrom('seasons')
    .selectAll()
    .where('id', '=', result.id)
    .executeTakeFirstOrThrow();

  return {
    id: created.id,
    name: created.name,
    isActive: Boolean(created.is_active),
    createdAt: new Date(created.created_at),
  };
}

export async function setActiveSeason(seasonId: number): Promise<void> {
  if (!Number.isFinite(seasonId)) {
    throw new Error('Invalid seasonId');
  }

  await db.updateTable('seasons').set({ is_active: 0 }).execute();
  await db
    .updateTable('seasons')
    .set({ is_active: 1 })
    .where('id', '=', seasonId)
    .execute();
}

