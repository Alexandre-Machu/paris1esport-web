import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { ManagedTeamItem, UpcomingMatch, TwitchLink } from '@/lib/types';
import { teams as seedTeams } from '@/lib/data';
import { prisma } from '@/lib/prisma';
import {
  canUseDatabase,
  isDatabaseConfigured,
  markDatabaseFailure,
  markDatabaseHealthy,
  resolveDataFilePath
} from '@/lib/dataDir';

const TEAMS_FILE = 'teams.json';

let dbSeedInitialized = false;
let dbOrderInitialized = false;

function toNullablePlayerIdsJson(playerIds: ManagedTeamItem['playerIds']) {
  return playerIds && playerIds.length > 0 ? playerIds : undefined;
}

function toNullableNextMatchesJson(nextMatches: ManagedTeamItem['nextMatches']) {
  return nextMatches ? (nextMatches as Prisma.InputJsonValue) : Prisma.DbNull;
}

function toNullableTwitchLinksJson(twitchLinks: ManagedTeamItem['twitchLinks']) {
  return twitchLinks ? (twitchLinks as Prisma.InputJsonValue) : Prisma.DbNull;
}

function normalizeGame(rawGame: string): string {
  return rawGame.trim().toLowerCase();
}

function normalizeOrder(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    return fallback;
  }

  return Math.floor(value);
}

function normalizeChampionName(value?: string): string | undefined {
  const cleaned = value?.trim();
  if (!cleaned) {
    return undefined;
  }

  return cleaned.toLowerCase() === 'taliah' ? 'Taliyah' : cleaned;
}

function sanitizeUpcomingMatches(nextMatches: ManagedTeamItem['nextMatches']): UpcomingMatch[] | undefined {
  if (!Array.isArray(nextMatches)) {
    return undefined;
  }

  const normalizeScore = (value: unknown): number | undefined => {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return undefined;
    }

    return Math.floor(parsed);
  };

  const cleaned = nextMatches
    .map((match) => ({
      id: String(match?.id || randomUUID()).trim(),
      opponent: String(match?.opponent || '').trim(),
      datetime: String(match?.datetime || '').trim(),
      competition: String(match?.competition || '').trim() || undefined,
      stage: String(match?.stage || '').trim() || undefined,
      streamUrl: String(match?.streamUrl || '').trim() || undefined,
      teamScore: normalizeScore(match?.teamScore),
      opponentScore: normalizeScore(match?.opponentScore),
      mvp: String(match?.mvp || '').trim() || undefined,
      vodUrl: String(match?.vodUrl || '').trim() || undefined
    }))
    .filter((match) => match.opponent.length > 0 && match.datetime.length > 0);

  return cleaned.length > 0 ? cleaned : undefined;
}

async function resolveDbTeamId(rawId: string): Promise<string | null> {
  const direct = await prisma.team.findUnique({ where: { id: rawId }, select: { id: true } });
  if (direct) {
    return direct.id;
  }

  const seedMatch = /^seed-team-(\d+)$/.exec(rawId);
  if (!seedMatch) {
    return null;
  }

  const index = Number(seedMatch[1]) - 1;
  const seed = seedTeams[index];
  if (!seed) {
    return null;
  }

  const mapped = await prisma.team.findFirst({
    where: {
      name: {
        equals: seed.name,
        mode: 'insensitive'
      },
      game: {
        equals: seed.game,
        mode: 'insensitive'
      }
    },
    select: { id: true }
  });

  return mapped?.id || null;
}

function sanitizeTeam(input: Omit<ManagedTeamItem, 'id'>): Omit<ManagedTeamItem, 'id'> {
  return {
    name: input.name.trim(),
    game: input.game.trim(),
    competition: String(input.competition || '').trim() || undefined,
    level: input.level.trim(),
    record: input.record.trim(),
    description: input.description?.trim() || undefined,
    playerIds: Array.isArray(input.playerIds) ? input.playerIds.filter((id) => id.trim().length > 0) : undefined,
    nextMatches: sanitizeUpcomingMatches(input.nextMatches),
    twitchLinks: Array.isArray(input.twitchLinks)
      ? input.twitchLinks
          .map((link) => ({
            name: String(link?.name || '').trim(),
            url: String(link?.url || '').trim()
          }))
          .filter((link) => link.name.length > 0 && link.url.length > 0)
      : undefined,
    multiopggUrl: String(input.multiopggUrl || '').trim() || undefined
  };
}

function fromDbTeam(team: {
  id: string;
  name: string;
  game: string;
  competition: string | null;
  level: string;
  record: string;
  description: string | null;
  playerIds: Prisma.JsonValue | null;
  nextMatches: Prisma.JsonValue | null;
  twitchLinks: Prisma.JsonValue | null;
  multiopggUrl: string | null;
  order: number;
}): ManagedTeamItem {
  return {
    id: team.id,
    name: team.name,
    game: team.game,
    competition: team.competition || undefined,
    level: team.level,
    record: team.record,
    description: team.description || undefined,
    playerIds: Array.isArray(team.playerIds) ? (team.playerIds as string[]) : undefined,
    nextMatches: sanitizeUpcomingMatches(Array.isArray(team.nextMatches) ? (team.nextMatches as UpcomingMatch[]) : undefined),
    twitchLinks: Array.isArray(team.twitchLinks) ? (team.twitchLinks as TwitchLink[]) : undefined,
    multiopggUrl: team.multiopggUrl || undefined,
    order: team.order
  };
}

async function ensureDbSeeded() {
  if (dbSeedInitialized) {
    return;
  }

  try {
    const count = await prisma.team.count();
    if (count === 0) {
      const initialTeams: ManagedTeamItem[] = seedTeams.map((team, index) => ({
        id: `seed-team-${index + 1}`,
        name: team.name,
        game: team.game,
        competition: undefined,
        level: team.level,
        record: team.record,
        description: undefined,
        playerIds: [],
        order: index
      }));

      if (initialTeams.length > 0) {
        await prisma.team.createMany({
          data: initialTeams.map((team) => ({
            id: team.id,
            name: team.name,
            game: team.game,
            competition: null,
            level: team.level,
            record: team.record,
            description: team.description || null,
            playerIds: toNullablePlayerIdsJson(team.playerIds),
            nextMatches: Prisma.DbNull,
            twitchLinks: Prisma.DbNull,
            multiopggUrl: null,
            order: normalizeOrder(team.order, 0)
          }))
        });
      }
    }

    dbSeedInitialized = true;
  } catch {
    throw new Error('Base non initialisee. Executez npm run db:push apres avoir configure DATABASE_URL.');
  }
}

async function ensureDbOrderInitialized() {
  if (dbOrderInitialized) {
    return;
  }

  try {
    const teams = await prisma.team.findMany({
      orderBy: [{ game: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, game: true, order: true }
    });

    const byGame = new Map<string, Array<{ id: string; order: number }>>();
    for (const team of teams) {
      const list = byGame.get(team.game) || [];
      list.push({ id: team.id, order: team.order });
      byGame.set(team.game, list);
    }

    const updates: Array<ReturnType<typeof prisma.team.update>> = [];
    for (const [, list] of byGame) {
      const needsNormalization = list.some((item, index) => item.order !== index);
      if (!needsNormalization) {
        continue;
      }

      list.forEach((item, index) => {
        updates.push(
          prisma.team.update({
            where: { id: item.id },
            data: { order: index }
          })
        );
      });
    }

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    dbOrderInitialized = true;
  } catch {
    throw new Error('Base non initialisee. Executez npm run db:push apres avoir configure DATABASE_URL.');
  }
}

async function ensureStoreFile() {
  const teamsFile = await resolveDataFilePath(TEAMS_FILE);
  try {
    await fs.access(teamsFile);
  } catch {
    const initialTeams: ManagedTeamItem[] = seedTeams.map((team, index) => ({
      id: `seed-team-${index + 1}`,
      name: team.name,
      game: team.game,
      level: team.level,
      record: team.record,
      description: undefined,
      players: team.players
    }));
    await fs.writeFile(teamsFile, JSON.stringify(initialTeams, null, 2), 'utf-8');
    return;
  }

  const content = await fs.readFile(teamsFile, 'utf-8');
  try {
    const parsed = JSON.parse(content) as ManagedTeamItem[];
    if (!Array.isArray(parsed) || parsed.length > 0) {
      return;
    }

    const initialTeams: ManagedTeamItem[] = seedTeams.map((team, index) => ({
      id: `seed-team-${index + 1}`,
      name: team.name,
      game: team.game,
      level: team.level,
      record: team.record,
      description: undefined,
      players: team.players
    }));
    await fs.writeFile(teamsFile, JSON.stringify(initialTeams, null, 2), 'utf-8');
  } catch {
    await fs.writeFile(teamsFile, '[]', 'utf-8');
  }
}

export async function getManagedTeams(): Promise<ManagedTeamItem[]> {
  if (canUseDatabase()) {
    try {
      await ensureDbSeeded();
      await ensureDbOrderInitialized();
      const teams = await prisma.team.findMany({
        orderBy: [{ game: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }]
      });
      markDatabaseHealthy();
      return teams.map(fromDbTeam);
    } catch (error) {
      markDatabaseFailure();
      console.error('[teamStore] DB read failed, fallback JSON.', error);
    }
  }

  await ensureStoreFile();
  const teamsFile = await resolveDataFilePath(TEAMS_FILE);
  const content = await fs.readFile(teamsFile, 'utf-8');

  try {
    const parsed = JSON.parse(content) as ManagedTeamItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((team, index) => ({ ...team, order: normalizeOrder(team.order, index) }))
      .sort((a, b) => {
        const byGame = normalizeGame(a.game).localeCompare(normalizeGame(b.game));
        if (byGame !== 0) {
          return byGame;
        }

        return normalizeOrder(a.order, 0) - normalizeOrder(b.order, 0);
      });
  } catch {
    return [];
  }
}

export async function addManagedTeam(team: Omit<ManagedTeamItem, 'id'>): Promise<ManagedTeamItem> {
  const sanitized = sanitizeTeam(team);

  if (canUseDatabase()) {
    try {
      await ensureDbSeeded();
      await ensureDbOrderInitialized();
      const lastInGame = await prisma.team.findFirst({
        where: { game: sanitized.game },
        orderBy: { order: 'desc' },
        select: { order: true }
      });
      const nextOrder = (lastInGame?.order ?? -1) + 1;

      const created = await prisma.team.create({
        data: {
          ...sanitized,
          competition: sanitized.competition || null,
          playerIds: toNullablePlayerIdsJson(sanitized.playerIds),
          nextMatches: toNullableNextMatchesJson(sanitized.nextMatches),
          twitchLinks: toNullableTwitchLinksJson(sanitized.twitchLinks),
          multiopggUrl: sanitized.multiopggUrl || null,
          order: nextOrder
        }
      });
      markDatabaseHealthy();
      return fromDbTeam(created);
    } catch (error) {
      markDatabaseFailure();
      console.error('[teamStore] DB write failed, fallback JSON.', error);
    }
  }

  const teams = await getManagedTeams();
  const nextOrder =
    teams
      .filter((item) => normalizeGame(item.game) === normalizeGame(sanitized.game))
      .reduce((maxOrder, item) => Math.max(maxOrder, normalizeOrder(item.order, 0)), -1) + 1;
  const next: ManagedTeamItem = { ...sanitized, id: randomUUID(), order: nextOrder };
  teams.push(next);
  const teamsFile = await resolveDataFilePath(TEAMS_FILE);
  await fs.writeFile(teamsFile, JSON.stringify(teams, null, 2), 'utf-8');
  return next;
}

export async function deleteManagedTeam(id: string): Promise<boolean> {
  if (canUseDatabase()) {
    try {
      await ensureDbSeeded();
      await ensureDbOrderInitialized();
      const resolvedId = await resolveDbTeamId(id);
      if (!resolvedId) {
        return false;
      }
      const deleted = await prisma.team.deleteMany({ where: { id: resolvedId } });
      markDatabaseHealthy();
      return deleted.count > 0;
    } catch (error) {
      markDatabaseFailure();
      console.error('[teamStore] DB delete failed, fallback JSON.', error);
    }
  }

  const teams = await getManagedTeams();
  const filtered = teams.filter((team) => team.id !== id);

  if (filtered.length === teams.length) {
    return false;
  }

  const teamsFile = await resolveDataFilePath(TEAMS_FILE);
  await fs.writeFile(teamsFile, JSON.stringify(filtered, null, 2), 'utf-8');
  return true;
}

export async function updateManagedTeam(id: string, patch: Omit<ManagedTeamItem, 'id'>): Promise<ManagedTeamItem | null> {
  const sanitized = sanitizeTeam(patch);

  if (canUseDatabase()) {
    try {
      await ensureDbSeeded();
      await ensureDbOrderInitialized();
      const resolvedId = await resolveDbTeamId(id);
      if (!resolvedId) {
        return null;
      }

      const existing = await prisma.team.findUnique({ where: { id: resolvedId } });
      if (!existing) {
        return null;
      }

      let nextOrder = existing.order;
      if (normalizeGame(existing.game) !== normalizeGame(sanitized.game)) {
        const lastInGame = await prisma.team.findFirst({
          where: { game: sanitized.game },
          orderBy: { order: 'desc' },
          select: { order: true }
        });
        nextOrder = (lastInGame?.order ?? -1) + 1;
      }

      const updated = await prisma.team.update({
        where: { id: resolvedId },
        data: {
          ...sanitized,
          competition: sanitized.competition || null,
          playerIds: toNullablePlayerIdsJson(sanitized.playerIds),
          nextMatches: toNullableNextMatchesJson(sanitized.nextMatches),
          twitchLinks: toNullableTwitchLinksJson(sanitized.twitchLinks),
          multiopggUrl: sanitized.multiopggUrl || null,
          order: nextOrder
        }
      });

      markDatabaseHealthy();
      return fromDbTeam(updated);
    } catch (error) {
      markDatabaseFailure();
      console.error('[teamStore] DB update failed, fallback JSON.', error);
    }
  }

  const teams = await getManagedTeams();
  const index = teams.findIndex((team) => team.id === id);

  if (index === -1) {
    return null;
  }

  let nextOrder = normalizeOrder(teams[index].order, index);
  if (normalizeGame(teams[index].game) !== normalizeGame(sanitized.game)) {
    nextOrder =
      teams
        .filter((item) => normalizeGame(item.game) === normalizeGame(sanitized.game))
        .reduce((maxOrder, item) => Math.max(maxOrder, normalizeOrder(item.order, 0)), -1) + 1;
  }

  const updated: ManagedTeamItem = {
    ...teams[index],
    ...sanitized,
    id,
    order: nextOrder
  };

  teams[index] = updated;
  const teamsFile = await resolveDataFilePath(TEAMS_FILE);
  await fs.writeFile(teamsFile, JSON.stringify(teams, null, 2), 'utf-8');
  return updated;
}

export async function reorderManagedTeams(game: string, orderedIds: string[]): Promise<boolean> {
  if (canUseDatabase()) {
    try {
      await ensureDbSeeded();
      await ensureDbOrderInitialized();

      for (let index = 0; index < orderedIds.length; index += 1) {
        const resolvedId = await resolveDbTeamId(orderedIds[index]);
        if (!resolvedId) {
          continue;
        }
        await prisma.team.update({
          where: { id: resolvedId },
          data: { order: index }
        });
      }

      markDatabaseHealthy();
      return true;
    } catch (error) {
      markDatabaseFailure();
      console.error('[teamStore] DB reorder failed, fallback JSON.', error);
    }
  }

  const teams = await getManagedTeams();
  const normalizedGame = normalizeGame(game);
  const teamsInGame = teams.filter((team) => normalizeGame(team.game) === normalizedGame);
  const teamsOutsideGame = teams.filter((team) => normalizeGame(team.game) !== normalizedGame);
  const mapById = new Map(teamsInGame.map((team) => [team.id, team]));

  const reordered = orderedIds.map((id) => mapById.get(id)).filter((team): team is ManagedTeamItem => Boolean(team));
  const missing = teamsInGame.filter((team) => !orderedIds.includes(team.id));
  const finalInGame = [...reordered, ...missing].map((team, index) => ({ ...team, order: index }));

  const nextTeams = [...teamsOutsideGame, ...finalInGame].sort((a, b) => {
    const byGame = normalizeGame(a.game).localeCompare(normalizeGame(b.game));
    if (byGame !== 0) {
      return byGame;
    }

    return normalizeOrder(a.order, 0) - normalizeOrder(b.order, 0);
  });

  const teamsFile = await resolveDataFilePath(TEAMS_FILE);
  await fs.writeFile(teamsFile, JSON.stringify(nextTeams, null, 2), 'utf-8');
  return true;
}
