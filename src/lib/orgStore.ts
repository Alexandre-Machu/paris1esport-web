import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { ManagedOrgMember } from '@/lib/types';
import { DEFAULT_ORG_MEMBERS } from '@/lib/orgDefaults';
import { prisma } from '@/lib/prisma';

const ORG_MEMBERS_FILE_NAME = 'org-members.json';
const hasDatabaseConfigured = Boolean(process.env.DATABASE_URL?.trim());

let cachedDataDir: string | null = null;
let dbSeedInitialized = false;

function resolveCandidatePath(rawPath: string): string {
  return path.isAbsolute(rawPath) ? rawPath : path.join(process.cwd(), rawPath);
}

async function ensureWritableDir(dirPath: string): Promise<boolean> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    const probePath = path.join(dirPath, '.org-store-write-test');
    await fs.writeFile(probePath, 'ok', 'utf-8');
    await fs.unlink(probePath);
    return true;
  } catch {
    return false;
  }
}

async function getDataDir(): Promise<string> {
  if (cachedDataDir) {
    return cachedDataDir;
  }

  const configuredDataDir = process.env.DATA_DIR?.trim();
  const candidates = [
    configuredDataDir ? resolveCandidatePath(configuredDataDir) : null,
    path.join(process.cwd(), 'data'),
    path.join(os.tmpdir(), 'paris1esport-web', 'data')
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (await ensureWritableDir(candidate)) {
      cachedDataDir = candidate;
      return candidate;
    }
  }

  throw new Error('Aucun dossier data accessible en ecriture. Configurez DATA_DIR vers un dossier persistant.');
}

async function getOrgMembersFilePath(): Promise<string> {
  const dataDir = await getDataDir();
  return path.join(dataDir, ORG_MEMBERS_FILE_NAME);
}

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
    photo: input.photo?.trim() || undefined
  };
}

function toStorePatch(input: Omit<ManagedOrgMember, 'id'>): Omit<ManagedOrgMember, 'id'> {
  return {
    pole: normalizePole(input.pole || ''),
    name: input.name.trim(),
    role: input.role.trim(),
    description: input.description?.trim() || undefined,
    photo: input.photo?.trim() || undefined
  };
}

function fromDbMember(member: {
  id: string;
  pole: string;
  name: string;
  role: string;
  description: string | null;
  photo: string | null;
}): ManagedOrgMember {
  return {
    id: member.id,
    pole: normalizePole(member.pole),
    name: member.name,
    role: member.role,
    description: member.description || undefined,
    photo: member.photo || undefined
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
        await prisma.orgMember.createMany({ data: seedMembers });
      }
    }

    dbSeedInitialized = true;
  } catch {
    throw new Error('Base non initialisee. Executez npm run db:push apres avoir configure DATABASE_URL.');
  }
}

async function ensureStoreFile() {
  const storeFile = await getOrgMembersFilePath();
  try {
    await fs.access(storeFile);
  } catch {
    await fs.writeFile(storeFile, JSON.stringify(DEFAULT_ORG_MEMBERS, null, 2), 'utf-8');
    return;
  }

  const content = await fs.readFile(storeFile, 'utf-8');
  try {
    const parsed = JSON.parse(content) as Partial<ManagedOrgMember>[];
    if (!Array.isArray(parsed)) {
      await fs.writeFile(storeFile, JSON.stringify(DEFAULT_ORG_MEMBERS, null, 2), 'utf-8');
      return;
    }

    const sanitized = parsed
      .map((member) => sanitizeMember(member))
      .filter((member): member is ManagedOrgMember => member !== null);

    if (JSON.stringify(sanitized) !== JSON.stringify(parsed)) {
      await fs.writeFile(storeFile, JSON.stringify(sanitized, null, 2), 'utf-8');
    }
  } catch {
    await fs.writeFile(storeFile, JSON.stringify(DEFAULT_ORG_MEMBERS, null, 2), 'utf-8');
  }
}

export async function getManagedOrgMembers(): Promise<ManagedOrgMember[]> {
  if (hasDatabaseConfigured) {
    await ensureDbSeeded();
    const members = await prisma.orgMember.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return members.map(fromDbMember);
  }

  await ensureStoreFile();
  const storeFile = await getOrgMembersFilePath();
  const content = await fs.readFile(storeFile, 'utf-8');

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
  const patch = toStorePatch(member);

  if (hasDatabaseConfigured) {
    await ensureDbSeeded();
    const created = await prisma.orgMember.create({
      data: patch
    });
    return fromDbMember(created);
  }

  const members = await getManagedOrgMembers();
  const next: ManagedOrgMember = { ...patch, id: randomUUID() };
  members.unshift(next);
  const storeFile = await getOrgMembersFilePath();
  await fs.writeFile(storeFile, JSON.stringify(members, null, 2), 'utf-8');
  return next;
}

export async function deleteManagedOrgMember(id: string): Promise<boolean> {
  if (hasDatabaseConfigured) {
    await ensureDbSeeded();
    const deleted = await prisma.orgMember.deleteMany({ where: { id } });
    return deleted.count > 0;
  }

  const members = await getManagedOrgMembers();
  const filtered = members.filter((member) => member.id !== id);

  if (filtered.length === members.length) {
    return false;
  }

  const storeFile = await getOrgMembersFilePath();
  await fs.writeFile(storeFile, JSON.stringify(filtered, null, 2), 'utf-8');
  return true;
}

export async function updateManagedOrgMember(
  id: string,
  patch: Omit<ManagedOrgMember, 'id'>
): Promise<ManagedOrgMember | null> {
  const normalizedPatch = toStorePatch(patch);

  if (hasDatabaseConfigured) {
    await ensureDbSeeded();
    const existing = await prisma.orgMember.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    const updated = await prisma.orgMember.update({
      where: { id },
      data: normalizedPatch
    });

    return fromDbMember(updated);
  }

  const members = await getManagedOrgMembers();
  const index = members.findIndex((member) => member.id === id);

  if (index === -1) {
    return null;
  }

  const updated: ManagedOrgMember = {
    ...members[index],
    ...normalizedPatch,
    id
  };

  members[index] = updated;
  const storeFile = await getOrgMembersFilePath();
  await fs.writeFile(storeFile, JSON.stringify(members, null, 2), 'utf-8');
  return updated;
}
