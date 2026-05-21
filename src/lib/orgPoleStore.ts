import { getManagedOrgMembers } from '@/lib/orgStore';
import { prisma } from '@/lib/prisma';

const DEFAULT_ORG_POLES = [
  'Bureau Executif',
  'Pole Communication',
  'Caster',
  'Pole Event',
  'Pole Esport'
];

let dbSeedInitialized = false;

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

async function ensureDbSeeded() {
  if (dbSeedInitialized) {
    return;
  }

  try {
    const count = await prisma.orgPole.count();
    if (count === 0) {
      await prisma.orgPole.createMany({
        data: DEFAULT_ORG_POLES.map((name, index) => ({ name, order: index })),
        skipDuplicates: true
      });
    }

    dbSeedInitialized = true;
  } catch {
    throw new Error('Base non initialisee. Executez npm run db:push apres avoir configure DATABASE_URL.');
  }
}

export async function getManagedOrgPoles(): Promise<string[]> {
  await ensureDbSeeded();
  const [storedPoles, members] = await Promise.all([
    prisma.orgPole.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }),
    getManagedOrgMembers()
  ]);

  const polesFromMembers = members.map((member) => member.pole);
  const polesFromStore = storedPoles.map((pole) => pole.name);

  return dedupePoles([...polesFromStore, ...DEFAULT_ORG_POLES, ...polesFromMembers]);
}

export async function addManagedOrgPole(name: string): Promise<string[]> {
  await ensureDbSeeded();
  const normalized = normalizePoleName(name);
  if (!normalized) {
    return getManagedOrgPoles();
  }

  const existing = await prisma.orgPole.findFirst({
    where: {
      name: {
        equals: normalized,
        mode: 'insensitive'
      }
    }
  });

  if (!existing) {
    const last = await prisma.orgPole.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
    await prisma.orgPole.create({
      data: {
        name: normalized,
        order: (last?.order ?? -1) + 1
      }
    });
  }

  return getManagedOrgPoles();
}

export async function reorderManagedOrgPoles(orderedPoles: string[]): Promise<string[]> {
  await ensureDbSeeded();
  const poles = await prisma.orgPole.findMany();
  const mapByName = new Map(poles.map((pole) => [normalizePoleName(pole.name).toLowerCase(), pole]));

  const normalizedOrdered = dedupePoles(orderedPoles);
  const ordered = normalizedOrdered.map((name) => mapByName.get(name.toLowerCase())).filter((pole): pole is typeof poles[number] => Boolean(pole));
  const missing = poles.filter((pole) => !normalizedOrdered.some((name) => name.toLowerCase() === normalizePoleName(pole.name).toLowerCase()));
  const nextPoles = [...ordered, ...missing];

  await prisma.$transaction(
    nextPoles.map((pole, index) =>
      prisma.orgPole.update({
        where: { id: pole.id },
        data: { order: index }
      })
    )
  );

  return getManagedOrgPoles();
}
