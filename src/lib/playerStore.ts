import { prisma } from '@/lib/prisma';
import { ManagedPlayer } from '@/lib/types';
import {
  canUseDatabase,
  isDatabaseConfigured,
  markDatabaseFailure,
  markDatabaseHealthy
} from '@/lib/dataDir';

let dbSeeded = false;

function fromDbPlayer(player: {
  id: string;
  name: string;
  teamStatus: string | null;
  role: string | null;
  elo: string | null;
  opgg: string | null;
  note: string | null;
  favoriteChampion: string | null;
  discord: string | null;
  twitter: string | null;
  twitch: string | null;
  instagram: string | null;
  linkedin: string | null;
}): ManagedPlayer {
  return {
    id: player.id,
    name: player.name,
    teamStatus: player.teamStatus === 'captain' || player.teamStatus === 'sub' ? player.teamStatus : undefined,
    role: player.role || undefined,
    elo: player.elo || undefined,
    opgg: player.opgg || undefined,
    note: player.note || undefined,
    favoriteChampion: player.favoriteChampion || undefined,
    discord: player.discord || undefined,
    twitter: player.twitter || undefined,
    twitch: player.twitch || undefined,
    instagram: player.instagram || undefined,
    linkedin: player.linkedin || undefined
  };
}

function sanitizePlayer(input: Omit<ManagedPlayer, 'id'>): Omit<ManagedPlayer, 'id'> {
  return {
    name: input.name.trim(),
    teamStatus: input.teamStatus === 'captain' || input.teamStatus === 'sub' ? input.teamStatus : undefined,
    role: input.role?.trim() || undefined,
    elo: input.elo?.trim() || undefined,
    opgg: input.opgg?.trim() || undefined,
    note: input.note?.trim() || undefined,
    favoriteChampion: input.favoriteChampion?.trim() || undefined,
    discord: input.discord?.trim() || undefined,
    twitter: input.twitter?.trim() || undefined,
    twitch: input.twitch?.trim() || undefined,
    instagram: input.instagram?.trim() || undefined,
    linkedin: input.linkedin?.trim() || undefined
  };
}

async function ensureDbSeeded() {
  if (dbSeeded) {
    return;
  }

  try {
    dbSeeded = true;
  } catch {
    throw new Error('Base non initialisee. Executez npm run db:push apres avoir configure DATABASE_URL.');
  }
}

export async function getManagedPlayers(): Promise<ManagedPlayer[]> {
  if (!canUseDatabase()) {
    throw new Error('DATABASE_URL not configured.');
  }

  try {
    await ensureDbSeeded();
    const players = await prisma.player.findMany({
      orderBy: { createdAt: 'desc' }
    });
    markDatabaseHealthy();
    return players.map(fromDbPlayer);
  } catch (error) {
    markDatabaseFailure();
    console.error('[playerStore] DB read failed.', error);
    throw error;
  }
}

export async function getPlayerById(id: string): Promise<ManagedPlayer | null> {
  if (!canUseDatabase()) {
    throw new Error('DATABASE_URL not configured.');
  }

  try {
    await ensureDbSeeded();
    const player = await prisma.player.findUnique({ where: { id } });
    markDatabaseHealthy();
    return player ? fromDbPlayer(player) : null;
  } catch (error) {
    markDatabaseFailure();
    console.error('[playerStore] DB read failed.', error);
    throw error;
  }
}

export async function addManagedPlayer(player: Omit<ManagedPlayer, 'id'>): Promise<ManagedPlayer> {
  if (!canUseDatabase()) {
    throw new Error('DATABASE_URL not configured.');
  }

  const sanitized = sanitizePlayer(player);

  try {
    await ensureDbSeeded();
    const created = await prisma.player.create({
      data: {
        ...sanitized,
        teamStatus: sanitized.teamStatus || null,
        role: sanitized.role || null,
        elo: sanitized.elo || null,
        opgg: sanitized.opgg || null,
        note: sanitized.note || null,
        favoriteChampion: sanitized.favoriteChampion || null,
        discord: sanitized.discord || null,
        twitter: sanitized.twitter || null,
        twitch: sanitized.twitch || null,
        instagram: sanitized.instagram || null,
        linkedin: sanitized.linkedin || null
      }
    });
    markDatabaseHealthy();
    return fromDbPlayer(created);
  } catch (error) {
    markDatabaseFailure();
    console.error('[playerStore] DB create failed.', error);
    throw error;
  }
}

export async function updateManagedPlayer(
  id: string,
  patch: Omit<ManagedPlayer, 'id'>
): Promise<ManagedPlayer | null> {
  if (!canUseDatabase()) {
    throw new Error('DATABASE_URL not configured.');
  }

  const sanitized = sanitizePlayer(patch);

  try {
    await ensureDbSeeded();
    const existing = await prisma.player.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    const updated = await prisma.player.update({
      where: { id },
      data: {
        ...sanitized,
        teamStatus: sanitized.teamStatus || null,
        role: sanitized.role || null,
        elo: sanitized.elo || null,
        opgg: sanitized.opgg || null,
        note: sanitized.note || null,
        favoriteChampion: sanitized.favoriteChampion || null,
        discord: sanitized.discord || null,
        twitter: sanitized.twitter || null,
        twitch: sanitized.twitch || null,
        instagram: sanitized.instagram || null,
        linkedin: sanitized.linkedin || null
      }
    });
    markDatabaseHealthy();
    return fromDbPlayer(updated);
  } catch (error) {
    markDatabaseFailure();
    console.error('[playerStore] DB update failed.', error);
    throw error;
  }
}

export async function deleteManagedPlayer(id: string): Promise<boolean> {
  if (!canUseDatabase()) {
    throw new Error('DATABASE_URL not configured.');
  }

  try {
    await ensureDbSeeded();
    const deleted = await prisma.player.delete({ where: { id } });
    markDatabaseHealthy();
    return !!deleted;
  } catch (error) {
    markDatabaseFailure();
    console.error('[playerStore] DB delete failed.', error);
    throw error;
  }
}
