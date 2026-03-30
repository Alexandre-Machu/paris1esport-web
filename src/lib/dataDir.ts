import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

let cachedDataDir: string | null = null;
let dbDisabledUntil = 0;

const DEFAULT_DB_RETRY_COOLDOWN_MS = 0;

function resolveCandidatePath(rawPath: string): string {
  return path.isAbsolute(rawPath) ? rawPath : path.join(process.cwd(), rawPath);
}

async function ensureWritableDir(dirPath: string): Promise<boolean> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    const probePath = path.join(dirPath, '.store-write-test');
    await fs.writeFile(probePath, 'ok', 'utf-8');
    await fs.unlink(probePath);
    return true;
  } catch {
    return false;
  }
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function getDbRetryCooldownMs(): number {
  const raw = Number(process.env.DB_RETRY_COOLDOWN_MS || DEFAULT_DB_RETRY_COOLDOWN_MS);
  if (Number.isNaN(raw) || raw < 0) {
    return DEFAULT_DB_RETRY_COOLDOWN_MS;
  }

  return Math.floor(raw);
}

export function canUseDatabase(): boolean {
  return isDatabaseConfigured() && Date.now() >= dbDisabledUntil;
}

export function markDatabaseFailure() {
  dbDisabledUntil = Date.now() + getDbRetryCooldownMs();
}

export function markDatabaseHealthy() {
  dbDisabledUntil = 0;
}

export async function resolveDataFilePath(fileName: string): Promise<string> {
  if (cachedDataDir) {
    return path.join(cachedDataDir, fileName);
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
      return path.join(candidate, fileName);
    }
  }

  throw new Error('Aucun dossier data accessible en ecriture. Verifiez DATA_DIR.');
}
