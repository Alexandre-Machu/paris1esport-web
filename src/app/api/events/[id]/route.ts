import { NextResponse } from 'next/server';
import { deleteEvent, updateEvent } from '@/lib/eventStore';
import { isAdminAuthenticated } from '@/lib/auth';
import { storeEventPhoto } from '@/lib/photoStorage';

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

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let body: EventPayload = {};
    let uploadedPhotoPath: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      body = {
        title: String(formData.get('title') || ''),
        date: String(formData.get('date') || ''),
        location: String(formData.get('location') || ''),
        type: String(formData.get('type') || ''),
        link: String(formData.get('link') || ''),
        photos: String(formData.get('photos') || '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
      };

      const photoFile = formData.get('photoFile');
      if (isUploadedFile(photoFile)) {
        uploadedPhotoPath = await storeEventPhoto(photoFile);
      }
    } else {
      body = (await req.json()) as EventPayload;
    }

    if (!body.title?.trim() || !body.date?.trim() || !body.location?.trim() || !body.type?.trim()) {
      return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 });
    }

    const existingPhotos = Array.isArray(body.photos) ? body.photos : [];
    const allPhotos = uploadedPhotoPath ? [...existingPhotos, uploadedPhotoPath] : existingPhotos;

    const updated = await updateEvent(params.id, {
      title: body.title.trim(),
      date: body.date.trim(),
      location: body.location.trim(),
      type: body.type.trim(),
      link: body.link?.trim() || undefined,
      photos: allPhotos.length > 0 ? allPhotos : undefined
    });

    if (!updated) {
      return NextResponse.json({ error: 'Événement introuvable.' }, { status: 404 });
    }

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

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Stockage indisponible. Verifiez DATABASE_URL ou DATA_DIR.' },
      { status: 500 }
    );
  }
}
