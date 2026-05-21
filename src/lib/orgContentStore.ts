import { Prisma } from '@prisma/client';
import { POLE_DESCRIPTIONS } from '@/lib/orgDefaults';
import { prisma } from '@/lib/prisma';
import type { ManagedOrgContentSettings } from '@/lib/types';

const ORG_CONTENT_SETTINGS_ID = 'default';

const DEFAULT_ABOUT_DESCRIPTION =
  'Creee en novembre 2025, Paris 1 Esport rassemble les etudiant.e.s de P1 autour de League of Legends, d\'evenements campus et de roles staff. Objectif: apprendre, progresser, performer ensemble.';

const DEFAULT_POLE_DESCRIPTIONS: Record<string, string> = {
  'Bureau Executif': 'Pilotage strategique, administratif et financier.',
  ...POLE_DESCRIPTIONS
};

const DEFAULT_SETTINGS: ManagedOrgContentSettings = {
  aboutDescription: DEFAULT_ABOUT_DESCRIPTION,
  poleDescriptions: DEFAULT_POLE_DESCRIPTIONS
};

let dbSeedInitialized = false;

function normalizePoleDescriptions(input: Record<string, string> | undefined): Record<string, string> {
  if (!input || typeof input !== 'object') {
    return { ...DEFAULT_POLE_DESCRIPTIONS };
  }

  const merged: Record<string, string> = { ...DEFAULT_POLE_DESCRIPTIONS };

  for (const [key, value] of Object.entries(input)) {
    const normalizedKey = key.trim();
    if (!normalizedKey) {
      continue;
    }

    merged[normalizedKey] = typeof value === 'string' ? value.trim() : '';
  }

  return merged;
}

function normalizeSettings(input: ManagedOrgContentSettings | undefined): ManagedOrgContentSettings {
  if (!input || typeof input !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }

  return {
    aboutDescription:
      typeof input.aboutDescription === 'string' && input.aboutDescription.trim().length > 0
        ? input.aboutDescription.trim()
        : DEFAULT_ABOUT_DESCRIPTION,
    poleDescriptions: normalizePoleDescriptions(input.poleDescriptions)
  };
}

async function ensureDbSeeded() {
  if (dbSeedInitialized) {
    return;
  }

  try {
    await prisma.orgContentSettings.upsert({
      where: { id: ORG_CONTENT_SETTINGS_ID },
      update: {},
      create: {
        id: ORG_CONTENT_SETTINGS_ID,
        aboutDescription: DEFAULT_SETTINGS.aboutDescription || null,
        poleDescriptions: DEFAULT_SETTINGS.poleDescriptions as Prisma.InputJsonValue
      }
    });

    dbSeedInitialized = true;
  } catch {
    throw new Error('Base non initialisee. Executez npm run db:push apres avoir configure DATABASE_URL.');
  }
}

export async function getManagedOrgContentSettings(): Promise<ManagedOrgContentSettings> {
  await ensureDbSeeded();
  const settings = await prisma.orgContentSettings.findUnique({ where: { id: ORG_CONTENT_SETTINGS_ID } });

  if (!settings) {
    return { ...DEFAULT_SETTINGS };
  }

  return normalizeSettings({
    aboutDescription: settings.aboutDescription || undefined,
    poleDescriptions: settings.poleDescriptions as Record<string, string> | undefined
  });
}

export async function updateManagedOrgContentSettings(
  patch: ManagedOrgContentSettings
): Promise<ManagedOrgContentSettings> {
  const current = await getManagedOrgContentSettings();

  const next = normalizeSettings({
    ...current,
    ...patch,
    poleDescriptions: {
      ...(current.poleDescriptions || {}),
      ...(patch.poleDescriptions || {})
    }
  });

  await ensureDbSeeded();
  await prisma.orgContentSettings.upsert({
    where: { id: ORG_CONTENT_SETTINGS_ID },
    update: {
      aboutDescription: next.aboutDescription || null,
      poleDescriptions: next.poleDescriptions as Prisma.InputJsonValue
    },
    create: {
      id: ORG_CONTENT_SETTINGS_ID,
      aboutDescription: next.aboutDescription || null,
      poleDescriptions: next.poleDescriptions as Prisma.InputJsonValue
    }
  });

  return next;
}
