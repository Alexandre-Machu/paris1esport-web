import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ManagedPlayer } from '@/lib/types';
import {
  canUseDatabase,
  isDatabaseConfigured,
  markDatabaseFailure,
  markDatabaseHealthy
} from '@/lib/dataDir';

let dbSeeded = false;

function normalizeGames(values: unknown): string[] | undefined {
  if (!Array.isArray(values)) {
    return undefined;
  }

  const cleaned = values
    .map((value) => String(value || '').trim())
    .filter((value) => value.length > 0);

  const unique = [...new Set(cleaned)];
  return unique.length > 0 ? unique : undefined;
}

function normalizeGameElos(values: unknown): Record<string, string> | undefined {
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    return undefined;
  }

  const entries = Object.entries(values as Record<string, unknown>)
    .map(([game, elo]) => [String(game || '').trim(), String(elo || '').trim()] as const)
    .filter(([game, elo]) => game.length > 0 && elo.length > 0);

  if (entries.length === 0) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

function getFallbackElo(
  elo: string | null | undefined,
  games: string[] | undefined,
  gameElos: Record<string, string> | undefined
): string | undefined {
  if (elo) {
    return elo;
  }

  if (!games || games.length === 0 || !gameElos) {
    return undefined;
  }

  for (const game of games) {
    const match = gameElos[game];
    if (match) {
      return match;
    }
  }

  return undefined;
}

function fromDbPlayer(player: {
  id: string;
  name: string;
  teamStatus: string | null;
  games: string[];
  role: string | null;
  elo: string | null;
  gameElos: Prisma.JsonValue | null;
  opgg: string | null;
  note: string | null;
  favoriteChampion: string | null;
  discord: string | null;
  twitter: string | null;
  twitch: string | null;
  instagram: string | null;
  linkedin: string | null;
}): ManagedPlayer {
  const games = normalizeGames(player.games);
  const gameElos = normalizeGameElos(player.gameElos);
  const elo = getFallbackElo(player.elo, games, gameElos);

  return {
    id: player.id,
    name: player.name,
    teamStatus: player.teamStatus === 'captain' || player.teamStatus === 'sub' ? player.teamStatus : undefined,
    games,
    gameElos,
    role: player.role || undefined,
    elo,
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
  const games = normalizeGames(input.games);
  const gameElos = normalizeGameElos(input.gameElos);
  const fallbackElo = getFallbackElo(input.elo || undefined, games, gameElos);

  return {
    name: input.name.trim(),
    teamStatus: input.teamStatus === 'captain' || input.teamStatus === 'sub' ? input.teamStatus : undefined,
    games,
    role: input.role?.trim() || undefined,
    elo: fallbackElo,
    gameElos,
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
        games: sanitized.games || [],
        role: sanitized.role || null,
        elo: sanitized.elo || null,
        gameElos: sanitized.gameElos ? (sanitized.gameElos as Prisma.InputJsonValue) : Prisma.DbNull,
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
        games: sanitized.games || [],
        role: sanitized.role || null,
        elo: sanitized.elo || null,
        gameElos: sanitized.gameElos ? (sanitized.gameElos as Prisma.InputJsonValue) : Prisma.DbNull,
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
