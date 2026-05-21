import { randomUUID } from 'crypto';
import { ManagedOrgMember } from '@/lib/types';
import { DEFAULT_ORG_MEMBERS } from '@/lib/orgDefaults';
import { prisma } from '@/lib/prisma';

let dbSeedInitialized = false;

function normalizePole(rawPole: string): string {
  const normalized = rawPole
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalized === 'bureau' || normalized === 'bureau executif') {
    return 'Bureau Executif';
  }
  if (normalized.includes('esport')) {
    return 'Pole Esport';
  }
  if (normalized.includes('event')) {
    return 'Pole Event';
  }
  if (normalized.includes('communication')) {
    return 'Pole Communication';
  }
  return rawPole.trim() || 'Bureau Executif';
}

function sanitizeMember(input: Partial<ManagedOrgMember>): ManagedOrgMember | null {
  const name = input.name?.trim();
  const role = input.role?.trim();
  if (!name || !role) {
    return null;
  }

  return {
    id: input.id?.trim() || randomUUID(),
    pole: normalizePole(input.pole || ''),
    name,
    role,
    description: input.description?.trim() || undefined,
    photo: input.photo?.trim() || undefined,
    discord: input.discord?.trim() || undefined,
    linkedin: input.linkedin?.trim() || undefined,
    twitter: input.twitter?.trim() || undefined,
    instagram: input.instagram?.trim() || undefined,
    twitch: input.twitch?.trim() || undefined
  };
}

function toStorePatch(input: Omit<ManagedOrgMember, 'id'>): Omit<ManagedOrgMember, 'id'> {
  return {
    pole: normalizePole(input.pole || ''),
    name: input.name.trim(),
    role: input.role.trim(),
    description: input.description?.trim() || undefined,
    photo: input.photo?.trim() || undefined,
    discord: input.discord?.trim() || undefined,
    linkedin: input.linkedin?.trim() || undefined,
    twitter: input.twitter?.trim() || undefined,
    instagram: input.instagram?.trim() || undefined,
    twitch: input.twitch?.trim() || undefined
  };
}

function fromDbMember(member: {
  id: string;
  pole: string;
  name: string;
  role: string;
  description: string | null;
  photo: string | null;
  discord: string | null;
  linkedin: string | null;
  twitter: string | null;
  instagram: string | null;
  twitch: string | null;
  order: number;
}): ManagedOrgMember {
  return {
    id: member.id,
    pole: normalizePole(member.pole),
    name: member.name,
    role: member.role,
    description: member.description || undefined,
    photo: member.photo || undefined,
    discord: member.discord || undefined,
    linkedin: member.linkedin || undefined,
    twitter: member.twitter || undefined,
    instagram: member.instagram || undefined,
    twitch: member.twitch || undefined,
    order: member.order
  };
}

async function ensureDbSeeded() {
  if (dbSeedInitialized) {
    return;
  }

  try {
    const count = await prisma.orgMember.count();
    if (count === 0) {
      const seedMembers = DEFAULT_ORG_MEMBERS.map((member) => sanitizeMember(member)).filter(
        (member): member is ManagedOrgMember => member !== null
      );

      if (seedMembers.length > 0) {
        const membersByPole: Record<string, ManagedOrgMember[]> = {};
        seedMembers.forEach((member) => {
          if (!membersByPole[member.pole]) {
            membersByPole[member.pole] = [];
          }
          membersByPole[member.pole].push(member);
        });

        const membersWithOrder: (ManagedOrgMember & { order: number })[] = [];
        Object.entries(membersByPole).forEach(([, poleMembers]) => {
          poleMembers.forEach((member, index) => {
            membersWithOrder.push({ ...member, order: index });
          });
        });

        await prisma.orgMember.createMany({ data: membersWithOrder });
      }
    }

    dbSeedInitialized = true;
  } catch {
    throw new Error('Base non initialisee. Executez npm run db:push apres avoir configure DATABASE_URL.');
  }
}

export async function getManagedOrgMembers(): Promise<ManagedOrgMember[]> {
  await ensureDbSeeded();
  const members = await prisma.orgMember.findMany({
    orderBy: [{ pole: 'asc' }, { order: 'asc' }, { createdAt: 'asc' }]
  });

  return members.map(fromDbMember);
}

export async function addManagedOrgMember(member: Partial<ManagedOrgMember>): Promise<ManagedOrgMember> {
  await ensureDbSeeded();
  const sanitized = sanitizeMember(member);
  if (!sanitized) {
    throw new Error('Membre invalide.');
  }

  const last = await prisma.orgMember.findFirst({
    where: { pole: sanitized.pole },
    orderBy: { order: 'desc' },
    select: { order: true }
  });

  const created = await prisma.orgMember.create({
    data: {
      ...sanitized,
      order: (last?.order ?? -1) + 1
    }
  });

  return fromDbMember(created);
}

export async function updateManagedOrgMember(
  id: string,
  patch: Omit<ManagedOrgMember, 'id'>
): Promise<ManagedOrgMember | null> {
  await ensureDbSeeded();
  const sanitized = toStorePatch(patch);
  const existing = await prisma.orgMember.findUnique({ where: { id } });

  if (!existing) {
    return null;
  }

  let nextOrder = existing.order;
  if (normalizePole(existing.pole) !== normalizePole(sanitized.pole)) {
    const last = await prisma.orgMember.findFirst({
      where: { pole: sanitized.pole },
      orderBy: { order: 'desc' },
      select: { order: true }
    });
    nextOrder = (last?.order ?? -1) + 1;
  }

  const updated = await prisma.orgMember.update({
    where: { id },
    data: {
      ...sanitized,
      order: nextOrder
    }
  });

  return fromDbMember(updated);
}

export async function deleteManagedOrgMember(id: string): Promise<boolean> {
  await ensureDbSeeded();
  const removed = await prisma.orgMember.deleteMany({ where: { id } });
  return removed.count > 0;
}

export async function reorderOrgMembers(pole: string, orderedIds: string[]): Promise<boolean> {
  await ensureDbSeeded();
  const normalizedPole = normalizePole(pole);
  const members = await prisma.orgMember.findMany({ where: { pole: normalizedPole } });
  const mapById = new Map(members.map((member) => [member.id, member]));
  const ordered = orderedIds.map((id) => mapById.get(id)).filter((member): member is typeof members[number] => Boolean(member));
  const missing = members.filter((member) => !orderedIds.includes(member.id));
  const nextMembers = [...ordered, ...missing];

  await prisma.$transaction(
    nextMembers.map((member, index) =>
      prisma.orgMember.update({
        where: { id: member.id },
        data: { order: index }
      })
    )
  );

  return true;
}
