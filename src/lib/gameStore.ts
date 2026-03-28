import { promises as fs } from 'fs';
import { prisma } from '@/lib/prisma';
import { getManagedTeams } from '@/lib/teamStore';
import {
  canUseDatabase,
  isDatabaseConfigured,
  markDatabaseFailure,
  markDatabaseHealthy,
  resolveDataFilePath
} from '@/lib/dataDir';

const GAMES_FILE = 'games.json';

const DEFAULT_GAMES = [
  'League Of Legends',
  'Valorant',
  'Counter-Strike',
  'Overwatch',
  'FGC',
  'TFT',
  'Rocket League'
];

async function ensureStoreFile() {
  const gamesFile = await resolveDataFilePath(GAMES_FILE);
  try {
    await fs.access(gamesFile);
  } catch {
    await fs.writeFile(gamesFile, JSON.stringify(DEFAULT_GAMES, null, 2), 'utf-8');
  }
}

let dbSeedInitialized = false;

async function ensureDbSeeded() {
  if (dbSeedInitialized) {
    return;
  }

  try {
    const count = await prisma.game.count();
    if (count === 0) {
      await prisma.game.createMany({
        data: DEFAULT_GAMES.map((name) => ({ name })),
        skipDuplicates: true
      });
    }
    dbSeedInitialized = true;
  } catch {
    throw new Error('Base non initialisee. Executez npm run db:push apres avoir configure DATABASE_URL.');
  }
}

function uniq(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of values) {
    const value = raw.trim();
    if (!value) {
      continue;
    }

    const key = value.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(value);
  }

  return result;
}

export async function getManagedGames(): Promise<string[]> {
  let fromStore: string[] = [];

  if (canUseDatabase()) {
    try {
      await ensureDbSeeded();
      const dbGames = await prisma.game.findMany({ orderBy: { createdAt: 'asc' } });
      fromStore = dbGames.map((game) => game.name);
      markDatabaseHealthy();
    } catch (error) {
      markDatabaseFailure();
      console.error('[gameStore] DB read failed, fallback JSON.', error);
    }
  }

  if (fromStore.length === 0) {
    await ensureStoreFile();
    const gamesFile = await resolveDataFilePath(GAMES_FILE);
    const raw = await fs.readFile(gamesFile, 'utf-8');

    try {
      const parsed = JSON.parse(raw) as string[];
      fromStore = Array.isArray(parsed) ? parsed : [];
    } catch {
      fromStore = [];
    }
  }

  const teams = await getManagedTeams();
  const fromTeams = teams.map((team) => team.game);

  return uniq([...DEFAULT_GAMES, ...fromStore, ...fromTeams]);
}

export async function addManagedGame(name: string): Promise<string[]> {
  if (canUseDatabase()) {
    try {
      await ensureDbSeeded();
      const trimmedName = name.trim();
      if (!trimmedName) {
        return getManagedGames();
      }

      const existing = await prisma.game.findFirst({
        where: {
          name: {
            equals: trimmedName,
            mode: 'insensitive'
          }
        }
      });

      if (!existing) {
        await prisma.game.create({ data: { name: trimmedName } });
      }

      markDatabaseHealthy();
      return getManagedGames();
    } catch (error) {
      markDatabaseFailure();
      console.error('[gameStore] DB write failed, fallback JSON.', error);
    }
  }

  const games = await getManagedGames();
  const next = uniq([...games, name]);
  const gamesFile = await resolveDataFilePath(GAMES_FILE);
  await fs.writeFile(gamesFile, JSON.stringify(next, null, 2), 'utf-8');
  return next;
}
