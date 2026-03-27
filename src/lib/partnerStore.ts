import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { ManagedPartner } from '@/lib/types';
import { partners as seedPartners } from '@/lib/data';

const DATA_DIR = path.join(process.cwd(), 'data');
const PARTNERS_FILE = path.join(DATA_DIR, 'partners.json');

async function ensureStoreFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(PARTNERS_FILE);
  } catch {
    const initialPartners: ManagedPartner[] = seedPartners.map((partner, index) => ({
      id: `seed-partner-${index + 1}`,
      ...partner
    }));
    await fs.writeFile(PARTNERS_FILE, JSON.stringify(initialPartners, null, 2), 'utf-8');
    return;
  }

  const content = await fs.readFile(PARTNERS_FILE, 'utf-8');
  try {
    const parsed = JSON.parse(content) as ManagedPartner[];
    if (!Array.isArray(parsed) || parsed.length > 0) {
      return;
    }

    const initialPartners: ManagedPartner[] = seedPartners.map((partner, index) => ({
      id: `seed-partner-${index + 1}`,
      ...partner
    }));
    await fs.writeFile(PARTNERS_FILE, JSON.stringify(initialPartners, null, 2), 'utf-8');
  } catch {
    await fs.writeFile(PARTNERS_FILE, '[]', 'utf-8');
  }
}

export async function getManagedPartners(): Promise<ManagedPartner[]> {
  await ensureStoreFile();
  const content = await fs.readFile(PARTNERS_FILE, 'utf-8');

  try {
    const parsed = JSON.parse(content) as ManagedPartner[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addManagedPartner(partner: Omit<ManagedPartner, 'id'>): Promise<ManagedPartner> {
  const partners = await getManagedPartners();
  const next: ManagedPartner = { ...partner, id: randomUUID() };
  partners.unshift(next);
  await fs.writeFile(PARTNERS_FILE, JSON.stringify(partners, null, 2), 'utf-8');
  return next;
}

export async function updateManagedPartner(id: string, patch: Omit<ManagedPartner, 'id'>): Promise<ManagedPartner | null> {
  const partners = await getManagedPartners();
  const index = partners.findIndex((partner) => partner.id === id);

  if (index === -1) {
    return null;
  }

  const updated: ManagedPartner = { ...partners[index], ...patch, id };
  partners[index] = updated;
  await fs.writeFile(PARTNERS_FILE, JSON.stringify(partners, null, 2), 'utf-8');
  return updated;
}

export async function deleteManagedPartner(id: string): Promise<boolean> {
  const partners = await getManagedPartners();
  const filtered = partners.filter((partner) => partner.id !== id);

  if (filtered.length === partners.length) {
    return false;
  }

  await fs.writeFile(PARTNERS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  return true;
}
