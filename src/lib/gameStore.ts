import { promises as fs } from 'fs';
import path from 'path';
import { getManagedTeams } from '@/lib/teamStore';

const DATA_DIR = path.join(process.cwd(), 'data');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');

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
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(GAMES_FILE);
  } catch {
    await fs.writeFile(GAMES_FILE, JSON.stringify(DEFAULT_GAMES, null, 2), 'utf-8');
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
  await ensureStoreFile();
  const raw = await fs.readFile(GAMES_FILE, 'utf-8');

  let fromFile: string[] = [];
  try {
    const parsed = JSON.parse(raw) as string[];
    fromFile = Array.isArray(parsed) ? parsed : [];
  } catch {
    fromFile = [];
  }

  const teams = await getManagedTeams();
  const fromTeams = teams.map((team) => team.game);

  return uniq([...DEFAULT_GAMES, ...fromFile, ...fromTeams]);
}

export async function addManagedGame(name: string): Promise<string[]> {
  const games = await getManagedGames();
  const next = uniq([...games, name]);
  await fs.writeFile(GAMES_FILE, JSON.stringify(next, null, 2), 'utf-8');
  return next;
}
