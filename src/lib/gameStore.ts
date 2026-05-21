import { prisma } from '@/lib/prisma';
import { getManagedTeams } from '@/lib/teamStore';

const DEFAULT_GAMES = [
  'League Of Legends',
  'Valorant',
  'Counter-Strike',
  'Overwatch',
  'FGC',
  'TFT',
  'Rocket League'
];

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
  await ensureDbSeeded();
  const dbGames = await prisma.game.findMany({ orderBy: { createdAt: 'asc' } });
  const teams = await getManagedTeams();
  const fromTeams = teams.map((team) => team.game);

  return uniq([...DEFAULT_GAMES, ...dbGames.map((game) => game.name), ...fromTeams]);
}

export async function addManagedGame(name: string): Promise<string[]> {
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

  return getManagedGames();
}

export async function getManagedGamesWithTeamSize() {
  await ensureDbSeeded();
  return prisma.game.findMany({
    orderBy: { createdAt: 'asc' },
    select: { name: true, teamSize: true }
  });
}

export async function updateGameTeamSize(gameName: string, teamSize: number): Promise<{ name: string; teamSize: number } | null> {
  await ensureDbSeeded();
  try {
    return await prisma.game.update({
      where: { name: gameName },
      data: { teamSize: Math.max(1, teamSize) },
      select: { name: true, teamSize: true }
    });
  } catch {
    return null;
  }
}
