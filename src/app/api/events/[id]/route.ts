import { NextResponse } from 'next/server';
import { deleteEvent, updateEvent } from '@/lib/eventStore';
import { isAdminAuthenticated } from '@/lib/auth';
import { storeEventPhoto } from '@/lib/photoStorage';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

type EventPayload = {
  title?: string;
  date?: string;
  location?: string;
  type?: string;
  content?: string;
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

export async function PUT(req: Request, { params }: { params: { id: string } }) {
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
        content: String(formData.get('content') || ''),
        link: String(formData.get('link') || '')
      };

      // Collect existing photos from the form
      const existingPhotosStr = String(formData.get('existingPhotos') || '');
      const existingPhotos = existingPhotosStr ? existingPhotosStr.split('||').filter(Boolean) : [];

      // Handle multiple file uploads for new photos
      const entries = formData.entries();
      for (const [key, value] of entries) {
        if (key === 'photoFile' && isUploadedFile(value)) {
          try {
            uploadedPhotos.push(await storeEventPhoto(value));
          } catch (error) {
            console.error('[api/events/[id]] Photo upload failed, continuing.', error);
          }
        }
      }

      body.photos = [...existingPhotos, ...uploadedPhotos];
    } else {
      body = (await req.json()) as EventPayload;
    }

    if (!body.title?.trim() || !body.date?.trim() || !body.location?.trim() || !body.type?.trim()) {
      return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 });
    }

    const updated = await updateEvent(params.id, {
      title: body.title.trim(),
      date: body.date.trim(),
      location: body.location.trim(),
      type: body.type.trim(),
      content: body.content?.trim() || undefined,
      link: body.link?.trim() || undefined,
      photos: Array.isArray(body.photos) && body.photos.length > 0 ? body.photos : undefined
    });

    if (!updated) {
      return NextResponse.json({ error: 'Événement introuvable.' }, { status: 404 });
    }

    revalidatePath('/');
    revalidatePath('/events');
    revalidatePath(`/events/${params.id}`);
    revalidatePath('/admin/events');

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: 'Stockage indisponible. Verifiez DATABASE_URL ou DATA_DIR.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const removed = await deleteEvent(params.id);
    if (!removed) {
      return NextResponse.json({ error: 'Événement introuvable.' }, { status: 404 });
    }

    revalidatePath('/');
    revalidatePath('/events');
    revalidatePath(`/events/${params.id}`);
    revalidatePath('/admin/events');

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Stockage indisponible. Verifiez DATABASE_URL ou DATA_DIR.' },
      { status: 500 }
    );
  }
}
