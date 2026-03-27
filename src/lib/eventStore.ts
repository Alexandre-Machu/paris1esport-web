import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { EventItem } from '@/lib/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');

async function ensureStoreFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(EVENTS_FILE);
  } catch {
    await fs.writeFile(EVENTS_FILE, '[]', 'utf-8');
  }
}

export async function getEvents(): Promise<EventItem[]> {
  await ensureStoreFile();
  const content = await fs.readFile(EVENTS_FILE, 'utf-8');

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
  const events = await getEvents();
  const nextEvent: EventItem = {
    ...event,
    id: randomUUID()
  };

  events.unshift(nextEvent);
  await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf-8');
  return nextEvent;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const events = await getEvents();
  const filtered = events.filter((event) => event.id !== id);

  if (filtered.length === events.length) {
    return false;
  }

  await fs.writeFile(EVENTS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  return true;
}
