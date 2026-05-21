import { randomUUID } from 'crypto';
import { ManagedPartner } from '@/lib/types';
import { partners as seedPartners } from '@/lib/data';
import { prisma } from '@/lib/prisma';

let dbSeedInitialized = false;

function normalizeOrder(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    return fallback;
  }

  return Math.floor(value);
}

function sanitizePartner(input: Omit<ManagedPartner, 'id'>): Omit<ManagedPartner, 'id'> {
  return {
    name: input.name.trim(),
    desc: input.desc.trim(),
    link: input.link.trim(),
    logo: input.logo?.trim() || undefined
  };
}

function fromDbPartner(partner: {
  id: string;
  name: string;
  desc: string;
  link: string;
  logo: string | null;
  order: number;
}): ManagedPartner {
  return {
    id: partner.id,
    name: partner.name,
    desc: partner.desc,
    link: partner.link,
    logo: partner.logo || undefined,
    order: partner.order
  };
}

async function ensureDbSeeded() {
  if (dbSeedInitialized) {
    return;
  }

  try {
    const count = await prisma.partner.count();
    if (count === 0) {
      const initialPartners: ManagedPartner[] = seedPartners.map((partner, index) => ({
        id: `seed-partner-${index + 1}`,
        ...partner,
        order: index
      }));

      if (initialPartners.length > 0) {
        await prisma.partner.createMany({
          data: initialPartners.map((partner, index) => ({
            ...partner,
            order: normalizeOrder(partner.order, index)
          }))
        });
      }
    }

    dbSeedInitialized = true;
  } catch {
    throw new Error('Base non initialisee. Executez npm run db:push apres avoir configure DATABASE_URL.');
  }
}

export async function getManagedPartners(): Promise<ManagedPartner[]> {
  await ensureDbSeeded();
  const partners = await prisma.partner.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
  return partners.map(fromDbPartner);
}

export async function addManagedPartner(partner: Omit<ManagedPartner, 'id'>): Promise<ManagedPartner> {
  const sanitized = sanitizePartner(partner);
  await ensureDbSeeded();
  const last = await prisma.partner.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
  const created = await prisma.partner.create({
    data: {
      id: randomUUID(),
      ...sanitized,
      order: (last?.order ?? -1) + 1
    }
  });

  return fromDbPartner(created);
}

export async function updateManagedPartner(id: string, patch: Omit<ManagedPartner, 'id'>): Promise<ManagedPartner | null> {
  const sanitized = sanitizePartner(patch);
  await ensureDbSeeded();

  const existing = await prisma.partner.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  const updated = await prisma.partner.update({
    where: { id },
    data: {
      ...sanitized,
      order: existing.order
    }
  });

  return fromDbPartner(updated);
}

export async function reorderManagedPartners(orderedIds: string[]): Promise<boolean> {
  await ensureDbSeeded();
  const partners = await prisma.partner.findMany();
  const mapById = new Map(partners.map((partner) => [partner.id, partner]));
  const ordered = orderedIds.map((id) => mapById.get(id)).filter((partner): partner is typeof partners[number] => Boolean(partner));
  const missing = partners.filter((partner) => !orderedIds.includes(partner.id));
  const nextPartners = [...ordered, ...missing];

  await prisma.$transaction(
    nextPartners.map((partner, index) =>
      prisma.partner.update({
        where: { id: partner.id },
        data: { order: index }
      })
    )
  );

  return true;
}

export async function deleteManagedPartner(id: string): Promise<boolean> {
  await ensureDbSeeded();
  const removed = await prisma.partner.deleteMany({ where: { id } });
  return removed.count > 0;
}
