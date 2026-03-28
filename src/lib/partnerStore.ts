import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { ManagedPartner } from '@/lib/types';
import { partners as seedPartners } from '@/lib/data';
import { prisma } from '@/lib/prisma';
import {
  canUseDatabase,
  isDatabaseConfigured,
  markDatabaseFailure,
  markDatabaseHealthy,
  resolveDataFilePath
} from '@/lib/dataDir';

const PARTNERS_FILE = 'partners.json';

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

async function ensureStoreFile() {
  const partnersFile = await resolveDataFilePath(PARTNERS_FILE);
  try {
    await fs.access(partnersFile);
  } catch {
    const initialPartners: ManagedPartner[] = seedPartners.map((partner, index) => ({
      id: `seed-partner-${index + 1}`,
      ...partner,
      order: index
    }));
    await fs.writeFile(partnersFile, JSON.stringify(initialPartners, null, 2), 'utf-8');
    return;
  }

  const content = await fs.readFile(partnersFile, 'utf-8');
  try {
    const parsed = JSON.parse(content) as ManagedPartner[];
    if (!Array.isArray(parsed) || parsed.length > 0) {
      return;
    }

    const initialPartners: ManagedPartner[] = seedPartners.map((partner, index) => ({
      id: `seed-partner-${index + 1}`,
      ...partner,
      order: index
    }));
    await fs.writeFile(partnersFile, JSON.stringify(initialPartners, null, 2), 'utf-8');
  } catch {
    await fs.writeFile(partnersFile, '[]', 'utf-8');
  }
}

export async function getManagedPartners(): Promise<ManagedPartner[]> {
  if (canUseDatabase()) {
    try {
      await ensureDbSeeded();
      const partners = await prisma.partner.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
      markDatabaseHealthy();
      return partners.map(fromDbPartner);
    } catch (error) {
      markDatabaseFailure();
      console.error('[partnerStore] DB read failed, fallback JSON.', error);
    }
  }

  await ensureStoreFile();
  const partnersFile = await resolveDataFilePath(PARTNERS_FILE);
  const content = await fs.readFile(partnersFile, 'utf-8');

  try {
    const parsed = JSON.parse(content) as ManagedPartner[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((partner, index) => ({ ...partner, order: normalizeOrder(partner.order, index) }))
      .sort((a, b) => normalizeOrder(a.order, 0) - normalizeOrder(b.order, 0));
  } catch {
    return [];
  }
}

export async function addManagedPartner(partner: Omit<ManagedPartner, 'id'>): Promise<ManagedPartner> {
  const sanitized = sanitizePartner(partner);

  if (isDatabaseConfigured()) {
    await ensureDbSeeded();
    const last = await prisma.partner.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
    const created = await prisma.partner.create({
      data: {
        ...sanitized,
        order: (last?.order ?? -1) + 1
      }
    });
    return fromDbPartner(created);
  }

  const partners = await getManagedPartners();
  const next: ManagedPartner = {
    ...sanitized,
    id: randomUUID(),
    order: partners.reduce((max, item) => Math.max(max, normalizeOrder(item.order, 0)), -1) + 1
  };
  partners.push(next);
  const partnersFile = await resolveDataFilePath(PARTNERS_FILE);
  await fs.writeFile(partnersFile, JSON.stringify(partners, null, 2), 'utf-8');
  return next;
}

export async function updateManagedPartner(id: string, patch: Omit<ManagedPartner, 'id'>): Promise<ManagedPartner | null> {
  const sanitized = sanitizePartner(patch);

  if (isDatabaseConfigured()) {
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

  const partners = await getManagedPartners();
  const index = partners.findIndex((partner) => partner.id === id);

  if (index === -1) {
    return null;
  }

  const updated: ManagedPartner = { ...partners[index], ...sanitized, id };
  partners[index] = updated;
  const partnersFile = await resolveDataFilePath(PARTNERS_FILE);
  await fs.writeFile(partnersFile, JSON.stringify(partners, null, 2), 'utf-8');
  return updated;
}

export async function reorderManagedPartners(orderedIds: string[]): Promise<boolean> {
  if (isDatabaseConfigured()) {
    await ensureDbSeeded();
    for (let index = 0; index < orderedIds.length; index += 1) {
      await prisma.partner.updateMany({
        where: { id: orderedIds[index] },
        data: { order: index }
      });
    }
    return true;
  }

  const partners = await getManagedPartners();
  const mapById = new Map(partners.map((partner) => [partner.id, partner]));
  const reordered = orderedIds
    .map((id) => mapById.get(id))
    .filter((partner): partner is ManagedPartner => Boolean(partner));
  const missing = partners.filter((partner) => !orderedIds.includes(partner.id));
  const nextPartners = [...reordered, ...missing].map((partner, index) => ({ ...partner, order: index }));

  const partnersFile = await resolveDataFilePath(PARTNERS_FILE);
  await fs.writeFile(partnersFile, JSON.stringify(nextPartners, null, 2), 'utf-8');
  return true;
}

export async function deleteManagedPartner(id: string): Promise<boolean> {
  if (isDatabaseConfigured()) {
    await ensureDbSeeded();
    const deleted = await prisma.partner.deleteMany({ where: { id } });
    return deleted.count > 0;
  }

  const partners = await getManagedPartners();
  const filtered = partners.filter((partner) => partner.id !== id);

  if (filtered.length === partners.length) {
    return false;
  }

  const partnersFile = await resolveDataFilePath(PARTNERS_FILE);
  await fs.writeFile(partnersFile, JSON.stringify(filtered, null, 2), 'utf-8');
  return true;
}
