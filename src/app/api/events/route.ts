import { NextResponse } from 'next/server';
import { addEvent, getEvents } from '@/lib/eventStore';
import { isAdminAuthenticated } from '@/lib/auth';

type EventPayload = {
  title?: string;
  date?: string;
  location?: string;
  type?: string;
  link?: string;
  photos?: string[];
};

export async function GET() {
  const events = await getEvents();
  return NextResponse.json(events);
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const body = (await req.json()) as EventPayload;
  const requiredFields: Array<keyof Pick<EventPayload, 'title' | 'date' | 'location' | 'type'>> = [
    'title',
    'date',
    'location',
    'type'
  ];

  for (const field of requiredFields) {
    if (!body[field] || !body[field]?.trim()) {
      return NextResponse.json({ error: `Le champ ${field} est requis.` }, { status: 400 });
    }
  }

  const created = await addEvent({
    title: body.title!.trim(),
    date: body.date!.trim(),
    location: body.location!.trim(),
    type: body.type!.trim(),
    link: body.link?.trim() || undefined,
    photos: Array.isArray(body.photos)
      ? body.photos.map((photo) => photo.trim()).filter(Boolean)
      : undefined
  });

  return NextResponse.json(created, { status: 201 });
}
