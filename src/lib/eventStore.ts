import { Prisma } from '@prisma/client';
import type { EventItem } from '@/lib/types';
import { prisma } from '@/lib/prisma';

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

export async function getEvents(): Promise<EventItem[]> {
  await ensureDbSeeded();
  const events = await prisma.event.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
  return events.map(fromDbEvent);
}

export async function addEvent(event: Omit<EventItem, 'id'>): Promise<EventItem> {
  const sanitized = sanitizeEvent(event);
  await ensureDbSeeded();

  const last = await prisma.event.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
  const created = await prisma.event.create({
    data: {
      title: sanitized.title,
      date: sanitized.date,
      location: sanitized.location,
      type: sanitized.type,
      content: sanitized.content || null,
      link: sanitized.link || null,
      thumbnailPhoto: sanitized.thumbnailPhoto || null,
      photos: sanitized.photos || [],
      order: (last?.order ?? -1) + 1
    }
  });

  return fromDbEvent(created);
}

export async function updateEvent(id: string, event: Omit<EventItem, 'id'>): Promise<EventItem | null> {
  const sanitized = sanitizeEvent(event);
  await ensureDbSeeded();

  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  const updated = await prisma.event.update({
    where: { id },
    data: {
      title: sanitized.title,
      date: sanitized.date,
      location: sanitized.location,
      type: sanitized.type,
      content: sanitized.content || null,
      link: sanitized.link || null,
      thumbnailPhoto: sanitized.thumbnailPhoto || null,
      photos: sanitized.photos || [],
      order: existing.order
    }
  });

  return fromDbEvent(updated);
}

export async function deleteEvent(id: string): Promise<boolean> {
  await ensureDbSeeded();
  const deleted = await prisma.event.deleteMany({ where: { id } });
  return deleted.count > 0;
}

export async function reorderEvents(orderedIds: string[]): Promise<boolean> {
  await ensureDbSeeded();
  const events = await prisma.event.findMany();
  const mapById = new Map(events.map((event) => [event.id, event]));
  const ordered = orderedIds.map((id) => mapById.get(id)).filter((event): event is typeof events[number] => Boolean(event));
  const missing = events.filter((event) => !orderedIds.includes(event.id));
  const nextEvents = [...ordered, ...missing];

  await prisma.$transaction(
    nextEvents.map((event, index) =>
      prisma.event.update({
        where: { id: event.id },
        data: { order: index }
      })
    )
  );

  return true;
}
