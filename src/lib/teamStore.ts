import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { ManagedTeamItem } from '@/lib/types';
import { teams as seedTeams } from '@/lib/data';
import { prisma } from '@/lib/prisma';
import { isDatabaseConfigured, resolveDataFilePath } from '@/lib/dataDir';

const TEAMS_FILE = 'teams.json';

let dbSeedInitialized = false;

function sanitizeTeam(input: Omit<ManagedTeamItem, 'id'>): Omit<ManagedTeamItem, 'id'> {
  return {
    name: input.name.trim(),
    game: input.game.trim(),
    level: input.level.trim(),
    record: input.record.trim(),
    description: input.description?.trim() || undefined,
    players: Array.isArray(input.players)
      ? input.players
          .map((player) => ({
            name: String(player.name || '').trim(),
            role: String(player.role || '').trim() || undefined,
            elo: String(player.elo || '').trim() || undefined,
            opgg: String(player.opgg || '').trim() || undefined,
            note: String(player.note || '').trim() || undefined,
            favoriteChampion: String(player.favoriteChampion || '').trim() || undefined
          }))
          .filter((player) => player.name.length > 0)
      : undefined
  };
}

function fromDbTeam(team: {
  id: string;
  name: string;
  game: string;
  level: string;
  record: string;
  description: string | null;
  players: Prisma.JsonValue | null;
}): ManagedTeamItem {
  return {
    id: team.id,
    name: team.name,
    game: team.game,
    level: team.level,
    record: team.record,
    description: team.description || undefined,
    players: Array.isArray(team.players) ? (team.players as ManagedTeamItem['players']) : undefined
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
        level: team.level,
        record: team.record,
        description: undefined,
        players: team.players
      }));

      if (initialTeams.length > 0) {
        await prisma.team.createMany({
          data: initialTeams.map((team) => ({
            id: team.id,
            name: team.name,
            game: team.game,
            level: team.level,
            record: team.record,
            description: team.description || null,
            players: team.players ? (team.players as Prisma.InputJsonValue) : null
          }))
        });
      }
    }

    dbSeedInitialized = true;
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
  if (isDatabaseConfigured()) {
    await ensureDbSeeded();
    const teams = await prisma.team.findMany({ orderBy: { createdAt: 'desc' } });
    return teams.map(fromDbTeam);
  }

  await ensureStoreFile();
  const teamsFile = await resolveDataFilePath(TEAMS_FILE);
  const content = await fs.readFile(teamsFile, 'utf-8');

  try {
    const parsed = JSON.parse(content) as ManagedTeamItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addManagedTeam(team: Omit<ManagedTeamItem, 'id'>): Promise<ManagedTeamItem> {
  const sanitized = sanitizeTeam(team);

  if (isDatabaseConfigured()) {
    await ensureDbSeeded();
    const created = await prisma.team.create({
      data: {
        ...sanitized,
        players: sanitized.players ? (sanitized.players as Prisma.InputJsonValue) : null
      }
    });
    return fromDbTeam(created);
  }

  const teams = await getManagedTeams();
  const next: ManagedTeamItem = { ...sanitized, id: randomUUID() };
  teams.unshift(next);
  const teamsFile = await resolveDataFilePath(TEAMS_FILE);
  await fs.writeFile(teamsFile, JSON.stringify(teams, null, 2), 'utf-8');
  return next;
}

export async function deleteManagedTeam(id: string): Promise<boolean> {
  if (isDatabaseConfigured()) {
    await ensureDbSeeded();
    const deleted = await prisma.team.deleteMany({ where: { id } });
    return deleted.count > 0;
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

  if (isDatabaseConfigured()) {
    await ensureDbSeeded();
    const existing = await prisma.team.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    const updated = await prisma.team.update({
      where: { id },
      data: {
        ...sanitized,
        players: sanitized.players ? (sanitized.players as Prisma.InputJsonValue) : null
      }
    });

    return fromDbTeam(updated);
  }

  const teams = await getManagedTeams();
  const index = teams.findIndex((team) => team.id === id);

  if (index === -1) {
    return null;
  }

  const updated: ManagedTeamItem = {
    ...teams[index],
    ...sanitized,
    id
  };

  teams[index] = updated;
  const teamsFile = await resolveDataFilePath(TEAMS_FILE);
  await fs.writeFile(teamsFile, JSON.stringify(teams, null, 2), 'utf-8');
  return updated;
}
