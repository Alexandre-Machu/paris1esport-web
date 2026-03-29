import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { EventItem } from '@/lib/types';
import { prisma } from '@/lib/prisma';
import {
  canUseDatabase,
  isDatabaseConfigured,
  markDatabaseFailure,
  markDatabaseHealthy,
  resolveDataFilePath
} from '@/lib/dataDir';

const EVENTS_FILE = 'events.json';

let dbSeedInitialized = false;

function sanitizeEvent(input: Omit<EventItem, 'id'>): Omit<EventItem, 'id'> {
  return {
    title: input.title.trim(),
    date: input.date.trim(),
    location: input.location.trim(),
    type: input.type.trim(),
    link: input.link?.trim() || undefined,
    photos: Array.isArray(input.photos)
      ? input.photos.map((photo) => photo.trim()).filter(Boolean)
      : undefined
  };
}

function fromDbEvent(event: {
  id: string;
  title: string;
  date: string;
  location: string;
  type: string;
  link: string | null;
  photos: string[];
}): EventItem {
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    location: event.location,
    type: event.type,
    link: event.link || undefined,
    photos: event.photos.length > 0 ? event.photos : undefined
  };
}

async function ensureDbSeeded() {
  if (dbSeedInitialized) {
    return;
  }

  try {
    await prisma.event.count();
    dbSeedInitialized = true;
  } catch {
    throw new Error('Base non initialisee. Executez npm run db:push apres avoir configure DATABASE_URL.');
  }
}

async function ensureStoreFile() {
  const eventsFile = await resolveDataFilePath(EVENTS_FILE);
  try {
    await fs.access(eventsFile);
  } catch {
    await fs.writeFile(eventsFile, '[]', 'utf-8');
  }
}

export async function getEvents(): Promise<EventItem[]> {
  if (canUseDatabase()) {
    try {
      await ensureDbSeeded();
      const events = await prisma.event.findMany({ orderBy: { createdAt: 'desc' } });
      markDatabaseHealthy();
      return events.map(fromDbEvent);
    } catch (error) {
      markDatabaseFailure();
      console.error('[eventStore] DB read failed, fallback JSON.', error);
    }
  }

  await ensureStoreFile();
  const eventsFile = await resolveDataFilePath(EVENTS_FILE);
  const content = await fs.readFile(eventsFile, 'utf-8');

  try {
    const parsed = JSON.parse(content) as EventItem[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

export async function addEvent(event: Omit<EventItem, 'id'>): Promise<EventItem> {
  const sanitized = sanitizeEvent(event);

  if (canUseDatabase()) {
    try {
      await ensureDbSeeded();
      const created = await prisma.event.create({
        data: {
          ...sanitized,
          photos: sanitized.photos || []
        }
      });
      markDatabaseHealthy();
      return fromDbEvent(created);
    } catch (error) {
      markDatabaseFailure();
      console.error('[eventStore] DB write failed, fallback JSON.', error);
    }
  } else if (isDatabaseConfigured()) {
    markDatabaseFailure();
  }

  const events = await getEvents();
  const nextEvent: EventItem = {
    ...sanitized,
    id: randomUUID()
  };

  events.unshift(nextEvent);
  const eventsFile = await resolveDataFilePath(EVENTS_FILE);
  await fs.writeFile(eventsFile, JSON.stringify(events, null, 2), 'utf-8');
  return nextEvent;
}

export async function deleteEvent(id: string): Promise<boolean> {
  if (canUseDatabase()) {
    try {
      await ensureDbSeeded();
      const deleted = await prisma.event.deleteMany({ where: { id } });
      markDatabaseHealthy();
      return deleted.count > 0;
    } catch (error) {
      markDatabaseFailure();
      console.error('[eventStore] DB delete failed, fallback JSON.', error);
    }
  } else if (isDatabaseConfigured()) {
    markDatabaseFailure();
  }

  const events = await getEvents();
  const filtered = events.filter((event) => event.id !== id);

  if (filtered.length === events.length) {
    return false;
  }

  const eventsFile = await resolveDataFilePath(EVENTS_FILE);
  await fs.writeFile(eventsFile, JSON.stringify(filtered, null, 2), 'utf-8');
  return true;
}
