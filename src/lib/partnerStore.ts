import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { ManagedPartner } from '@/lib/types';
import { partners as seedPartners } from '@/lib/data';
import { prisma } from '@/lib/prisma';
import { isDatabaseConfigured, resolveDataFilePath } from '@/lib/dataDir';

const PARTNERS_FILE = 'partners.json';

let dbSeedInitialized = false;

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
}): ManagedPartner {
  return {
    id: partner.id,
    name: partner.name,
    desc: partner.desc,
    link: partner.link,
    logo: partner.logo || undefined
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
        ...partner
      }));

      if (initialPartners.length > 0) {
        await prisma.partner.createMany({ data: initialPartners });
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
      ...partner
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
      ...partner
    }));
    await fs.writeFile(partnersFile, JSON.stringify(initialPartners, null, 2), 'utf-8');
  } catch {
    await fs.writeFile(partnersFile, '[]', 'utf-8');
  }
}

export async function getManagedPartners(): Promise<ManagedPartner[]> {
  if (isDatabaseConfigured()) {
    await ensureDbSeeded();
    const partners = await prisma.partner.findMany({ orderBy: { createdAt: 'desc' } });
    return partners.map(fromDbPartner);
  }

  await ensureStoreFile();
  const partnersFile = await resolveDataFilePath(PARTNERS_FILE);
  const content = await fs.readFile(partnersFile, 'utf-8');

  try {
    const parsed = JSON.parse(content) as ManagedPartner[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addManagedPartner(partner: Omit<ManagedPartner, 'id'>): Promise<ManagedPartner> {
  const sanitized = sanitizePartner(partner);

  if (isDatabaseConfigured()) {
    await ensureDbSeeded();
    const created = await prisma.partner.create({ data: sanitized });
    return fromDbPartner(created);
  }

  const partners = await getManagedPartners();
  const next: ManagedPartner = { ...sanitized, id: randomUUID() };
  partners.unshift(next);
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
      data: sanitized
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
