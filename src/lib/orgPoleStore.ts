import { promises as fs } from 'fs';
import { getManagedOrgMembers } from '@/lib/orgStore';
import { resolveDataFilePath } from '@/lib/dataDir';

const ORG_POLES_FILE = 'org-poles.json';

export const DEFAULT_ORG_POLES = [
  'Bureau Executif',
  'Pole Communication',
  'Caster',
  'Pole Event',
  'Pole Esport'
];

function normalizePoleName(rawPole: string): string {
  const trimmed = rawPole.trim();
  if (!trimmed) {
    return '';
  }

  const lowered = trimmed
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (lowered === 'bureau' || lowered === 'bureau executif') {
    return 'Bureau Executif';
  }
  if (lowered.includes('communication')) {
    return 'Pole Communication';
  }
  if (lowered.includes('event')) {
    return 'Pole Event';
  }
  if (lowered.includes('esport')) {
    return 'Pole Esport';
  }
  if (lowered.includes('caster') || lowered.includes('cast')) {
    return 'Caster';
  }

  return trimmed;
}

function dedupePoles(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizePoleName(value);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

async function ensureStoreFile(): Promise<string> {
  const polesFile = await resolveDataFilePath(ORG_POLES_FILE);
  try {
    await fs.access(polesFile);
  } catch {
    await fs.writeFile(polesFile, JSON.stringify(DEFAULT_ORG_POLES, null, 2), 'utf-8');
  }

  return polesFile;
}

async function readStoredPoles(): Promise<string[]> {
  const polesFile = await ensureStoreFile();
  const raw = await fs.readFile(polesFile, 'utf-8');

  try {
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_ORG_POLES];
    }

    return dedupePoles(parsed);
  } catch {
    return [...DEFAULT_ORG_POLES];
  }
}

async function writeStoredPoles(poles: string[]): Promise<void> {
  const polesFile = await ensureStoreFile();
  await fs.writeFile(polesFile, JSON.stringify(dedupePoles(poles), null, 2), 'utf-8');
}

export async function getManagedOrgPoles(): Promise<string[]> {
  const [storedPoles, members] = await Promise.all([readStoredPoles(), getManagedOrgMembers()]);
  const polesFromMembers = members.map((member) => member.pole);

  return dedupePoles([...storedPoles, ...DEFAULT_ORG_POLES, ...polesFromMembers]);
}

export async function addManagedOrgPole(name: string): Promise<string[]> {
  const poles = await getManagedOrgPoles();
  const normalized = normalizePoleName(name);
  if (!normalized) {
    return poles;
  }

  const exists = poles.some((pole) => pole.toLowerCase() === normalized.toLowerCase());
  if (exists) {
    return poles;
  }

  const next = [...poles, normalized];
  await writeStoredPoles(next);
  return next;
}

export async function reorderManagedOrgPoles(orderedPoles: string[]): Promise<string[]> {
  const current = await getManagedOrgPoles();
  const requested = dedupePoles(orderedPoles);

  const orderedKnown = requested.filter((name) =>
    current.some((existing) => existing.toLowerCase() === name.toLowerCase())
  );

  const leftovers = current.filter(
    (name) => !orderedKnown.some((ordered) => ordered.toLowerCase() === name.toLowerCase())
  );

  const next = [...orderedKnown, ...leftovers];
  await writeStoredPoles(next);
  return next;
}
