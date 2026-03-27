import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { ManagedOrgMember } from '@/lib/types';
import { DEFAULT_ORG_MEMBERS } from '@/lib/orgDefaults';

const DATA_DIR = path.join(process.cwd(), 'data');
const ORG_MEMBERS_FILE = path.join(DATA_DIR, 'org-members.json');

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

function memberKey(member: Pick<ManagedOrgMember, 'pole' | 'name' | 'role'>): string {
  return `${member.pole}|${member.name}|${member.role}`.trim().toLowerCase();
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
    photo: input.photo?.trim() || undefined
  };
}

function mergeWithDefaults(members: ManagedOrgMember[]): ManagedOrgMember[] {
  const merged = [...members];
  const existing = new Set(merged.map((member) => memberKey(member)));

  for (const fallback of DEFAULT_ORG_MEMBERS) {
    const key = memberKey(fallback);
    if (!existing.has(key)) {
      merged.push(fallback);
      existing.add(key);
    }
  }

  return merged;
}

async function ensureStoreFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(ORG_MEMBERS_FILE);
  } catch {
    await fs.writeFile(ORG_MEMBERS_FILE, JSON.stringify(DEFAULT_ORG_MEMBERS, null, 2), 'utf-8');
    return;
  }

  const content = await fs.readFile(ORG_MEMBERS_FILE, 'utf-8');
  try {
    const parsed = JSON.parse(content) as Partial<ManagedOrgMember>[];
    if (!Array.isArray(parsed)) {
      await fs.writeFile(ORG_MEMBERS_FILE, JSON.stringify(DEFAULT_ORG_MEMBERS, null, 2), 'utf-8');
      return;
    }

    const sanitized = parsed
      .map((member) => sanitizeMember(member))
      .filter((member): member is ManagedOrgMember => member !== null);

    const finalMembers = mergeWithDefaults(sanitized);
    if (JSON.stringify(finalMembers) !== JSON.stringify(parsed)) {
      await fs.writeFile(ORG_MEMBERS_FILE, JSON.stringify(finalMembers, null, 2), 'utf-8');
    }
  } catch {
    await fs.writeFile(ORG_MEMBERS_FILE, JSON.stringify(DEFAULT_ORG_MEMBERS, null, 2), 'utf-8');
  }
}

export async function getManagedOrgMembers(): Promise<ManagedOrgMember[]> {
  await ensureStoreFile();
  const content = await fs.readFile(ORG_MEMBERS_FILE, 'utf-8');

  try {
    const parsed = JSON.parse(content) as Partial<ManagedOrgMember>[];
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_ORG_MEMBERS];
    }

    return parsed
      .map((member) => sanitizeMember(member))
      .filter((member): member is ManagedOrgMember => member !== null);
  } catch {
    return [...DEFAULT_ORG_MEMBERS];
  }
}

export async function addManagedOrgMember(member: Omit<ManagedOrgMember, 'id'>): Promise<ManagedOrgMember> {
  const members = await getManagedOrgMembers();
  const next: ManagedOrgMember = { ...member, id: randomUUID() };
  members.unshift(next);
  await fs.writeFile(ORG_MEMBERS_FILE, JSON.stringify(members, null, 2), 'utf-8');
  return next;
}

export async function deleteManagedOrgMember(id: string): Promise<boolean> {
  const members = await getManagedOrgMembers();
  const filtered = members.filter((member) => member.id !== id);

  if (filtered.length === members.length) {
    return false;
  }

  await fs.writeFile(ORG_MEMBERS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  return true;
}

export async function updateManagedOrgMember(
  id: string,
  patch: Omit<ManagedOrgMember, 'id'>
): Promise<ManagedOrgMember | null> {
  const members = await getManagedOrgMembers();
  const index = members.findIndex((member) => member.id === id);

  if (index === -1) {
    return null;
  }

  const updated: ManagedOrgMember = {
    ...members[index],
    ...patch,
    id
  };

  members[index] = updated;
  await fs.writeFile(ORG_MEMBERS_FILE, JSON.stringify(members, null, 2), 'utf-8');
  return updated;
}
