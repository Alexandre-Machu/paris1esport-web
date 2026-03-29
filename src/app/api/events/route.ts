import { NextResponse } from 'next/server';
import { addEvent, getEvents } from '@/lib/eventStore';
import { isAdminAuthenticated } from '@/lib/auth';
import { storeEventPhoto } from '@/lib/photoStorage';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

type EventPayload = {
  title?: string;
  date?: string;
  location?: string;
  type?: string;
  link?: string;
  photos?: string[];
};

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    !!value &&
    typeof value === 'object' &&
    'size' in value &&
    typeof value.size === 'number' &&
    value.size > 0 &&
    'name' in value &&
    typeof value.name === 'string' &&
    'arrayBuffer' in value &&
    typeof value.arrayBuffer === 'function'
  );
}

export async function GET() {
  const events = await getEvents();
  return NextResponse.json(events);
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let body: EventPayload = {};
    const uploadedPhotos: string[] = [];

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      body = {
        title: String(formData.get('title') || ''),
        date: String(formData.get('date') || ''),
        location: String(formData.get('location') || ''),
        type: String(formData.get('type') || ''),
        link: String(formData.get('link') || '')
      };

      // Handle multiple file uploads
      const entries = formData.entries();
      for (const [key, value] of entries) {
        if (key === 'photoFile' && isUploadedFile(value)) {
          try {
            uploadedPhotos.push(await storeEventPhoto(value));
          } catch (error) {
            console.error('[api/events] Photo upload failed, continuing.', error);
          }
        }
      }
    } else {
      body = (await req.json()) as EventPayload;
    }

    if (!body.title?.trim() || !body.date?.trim() || !body.location?.trim() || !body.type?.trim()) {
      return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 });
    }

    const created = await addEvent({
      title: body.title.trim(),
      date: body.date.trim(),
      location: body.location.trim(),
      type: body.type.trim(),
      link: body.link?.trim() || undefined,
      photos: uploadedPhotos.length > 0 ? uploadedPhotos : undefined
    });

    revalidatePath('/');
    revalidatePath('/events');
    revalidatePath('/admin/events');

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Stockage indisponible. Verifiez DATABASE_URL ou DATA_DIR.' },
      { status: 500 }
    );
  }
}
