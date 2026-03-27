import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { ManagedTeamItem } from '@/lib/types';
import { teams as seedTeams } from '@/lib/data';

const DATA_DIR = path.join(process.cwd(), 'data');
const TEAMS_FILE = path.join(DATA_DIR, 'teams.json');

async function ensureStoreFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(TEAMS_FILE);
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
    await fs.writeFile(TEAMS_FILE, JSON.stringify(initialTeams, null, 2), 'utf-8');
    return;
  }

  const content = await fs.readFile(TEAMS_FILE, 'utf-8');
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
    await fs.writeFile(TEAMS_FILE, JSON.stringify(initialTeams, null, 2), 'utf-8');
  } catch {
    await fs.writeFile(TEAMS_FILE, '[]', 'utf-8');
  }
}

export async function getManagedTeams(): Promise<ManagedTeamItem[]> {
  await ensureStoreFile();
  const content = await fs.readFile(TEAMS_FILE, 'utf-8');

  try {
    const parsed = JSON.parse(content) as ManagedTeamItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addManagedTeam(team: Omit<ManagedTeamItem, 'id'>): Promise<ManagedTeamItem> {
  const teams = await getManagedTeams();
  const next: ManagedTeamItem = { ...team, id: randomUUID() };
  teams.unshift(next);
  await fs.writeFile(TEAMS_FILE, JSON.stringify(teams, null, 2), 'utf-8');
  return next;
}

export async function deleteManagedTeam(id: string): Promise<boolean> {
  const teams = await getManagedTeams();
  const filtered = teams.filter((team) => team.id !== id);

  if (filtered.length === teams.length) {
    return false;
  }

  await fs.writeFile(TEAMS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  return true;
}

export async function updateManagedTeam(id: string, patch: Omit<ManagedTeamItem, 'id'>): Promise<ManagedTeamItem | null> {
  const teams = await getManagedTeams();
  const index = teams.findIndex((team) => team.id === id);

  if (index === -1) {
    return null;
  }

  const updated: ManagedTeamItem = {
    ...teams[index],
    ...patch,
    id
  };

  teams[index] = updated;
  await fs.writeFile(TEAMS_FILE, JSON.stringify(teams, null, 2), 'utf-8');
  return updated;
}
