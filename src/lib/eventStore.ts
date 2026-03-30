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
    content: input.content?.trim() || undefined,
    link: input.link?.trim() || undefined,
    thumbnailPhoto: input.thumbnailPhoto?.trim() || undefined,
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
  content: string | null;
  link: string | null;
  thumbnailPhoto: string | null;
  photos: string[];
  order: number;
}): EventItem {
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    location: event.location,
    type: event.type,
    content: event.content || undefined,
    link: event.link || undefined,
    thumbnailPhoto: event.thumbnailPhoto || undefined,
    photos: event.photos.length > 0 ? event.photos : undefined,
    order: event.order
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
      const events = await prisma.event.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
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

export async function updateEvent(id: string, event: Omit<EventItem, 'id'>): Promise<EventItem | null> {
  const sanitized = sanitizeEvent(event);

  if (canUseDatabase()) {
    try {
      await ensureDbSeeded();
      const existing = await prisma.event.findUnique({ where: { id } });
      if (!existing) {
        return null;
      }

      const updated = await prisma.event.update({
        where: { id },
        data: {
          ...sanitized,
          photos: sanitized.photos || []
        }
      });

      markDatabaseHealthy();
      return fromDbEvent(updated);
    } catch (error) {
      markDatabaseFailure();
      console.error('[eventStore] DB update failed, fallback JSON.', error);
    }
  } else if (isDatabaseConfigured()) {
    markDatabaseFailure();
  }

  const events = await getEvents();
  const index = events.findIndex((e) => e.id === id);

  if (index === -1) {
    return null;
  }

  const updated: EventItem = {
    ...sanitized,
    id,
    order: events[index].order
  };

  events[index] = updated;
  const eventsFile = await resolveDataFilePath(EVENTS_FILE);
  await fs.writeFile(eventsFile, JSON.stringify(events, null, 2), 'utf-8');
  return updated;
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

export async function reorderEvents(orderedIds: string[]): Promise<boolean> {
  if (canUseDatabase()) {
    try {
      await ensureDbSeeded();

      // Update order for each event
      for (let i = 0; i < orderedIds.length; i++) {
        await prisma.event.updateMany({
          where: { id: orderedIds[i] },
          data: { order: i }
        });
      }
      markDatabaseHealthy();
      return true;
    } catch (error) {
      markDatabaseFailure();
      console.error('[eventStore] DB reorder failed, fallback JSON.', error);
    }
  } else if (isDatabaseConfigured()) {
    markDatabaseFailure();
  }

  // JSON fallback: reorder events in file
  const events = await getEvents();
  
  // Create a map of id -> event for quick lookup
  const eventMap = new Map(events.map(e => [e.id, e]));
  
  // Reorder based on orderedIds
  const reorderedEvents = orderedIds
    .map(id => eventMap.get(id))
    .filter((e): e is EventItem => e !== undefined);
  
  const eventsFile = await resolveDataFilePath(EVENTS_FILE);
  await fs.writeFile(eventsFile, JSON.stringify(reorderedEvents, null, 2), 'utf-8');
  return true;
}
