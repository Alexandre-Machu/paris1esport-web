import { promises as fs } from 'fs';
import { POLE_DESCRIPTIONS } from '@/lib/orgDefaults';
import { resolveDataFilePath } from '@/lib/dataDir';
import type { ManagedOrgContentSettings } from '@/lib/types';

const ORG_CONTENT_FILE = 'org-content.json';

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

async function ensureStoreFile(): Promise<string> {
  const filePath = await resolveDataFilePath(ORG_CONTENT_FILE);
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
  }

  return filePath;
}

export async function getManagedOrgContentSettings(): Promise<ManagedOrgContentSettings> {
  const filePath = await ensureStoreFile();
  const raw = await fs.readFile(filePath, 'utf-8');

  try {
    const parsed = JSON.parse(raw) as ManagedOrgContentSettings;
    return normalizeSettings(parsed);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
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

  const filePath = await ensureStoreFile();
  await fs.writeFile(filePath, JSON.stringify(next, null, 2), 'utf-8');
  return next;
}
