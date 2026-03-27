import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { addEvent, deleteEvent, getEvents } from '@/lib/eventStore';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

async function createEvent(formData: FormData) {
  'use server';

  if (!(await isAdminAuthenticated())) {
    redirect('/login?redirect=/admin/events');
  }

  const title = String(formData.get('title') || '').trim();
  const date = String(formData.get('date') || '').trim();
  const location = String(formData.get('location') || '').trim();
  const type = String(formData.get('type') || '').trim();
  const linkRaw = String(formData.get('link') || '').trim();
  const photosRaw = String(formData.get('photos') || '');
  const manualPhotos = photosRaw
    .split('\n')
    .map((value) => value.trim())
    .filter(Boolean);
  const photoFiles = formData.getAll('photoFiles').filter((item) => item instanceof File) as File[];

  const uploadedPhotos: string[] = [];
  if (photoFiles.length > 0) {
    const uploadDir = path.join(process.cwd(), 'public', 'photos', 'events');
    await fs.mkdir(uploadDir, { recursive: true });

    for (const file of photoFiles) {
      if (!file.name) {
        continue;
      }

      const extension = path.extname(file.name) || '.jpg';
      const fileName = `${Date.now()}-${randomUUID()}${extension}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(path.join(uploadDir, fileName), buffer);
      uploadedPhotos.push(`/photos/events/${fileName}`);
    }
  }

  const photos = [...manualPhotos, ...uploadedPhotos];

  if (!title || !date || !location || !type) {
    return;
  }

  await addEvent({
    title,
    date,
    location,
    type,
    link: linkRaw || undefined,
    photos: photos.length > 0 ? photos : undefined
  });

  revalidatePath('/events');
  revalidatePath('/admin/events');
}

async function removeEvent(formData: FormData) {
  'use server';

  if (!(await isAdminAuthenticated())) {
    redirect('/login?redirect=/admin/events');
  }

  const id = String(formData.get('id') || '');
  if (!id) {
    return;
  }

  await deleteEvent(id);

  revalidatePath('/events');
  revalidatePath('/admin/events');
}

export default async function AdminEventsPage() {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    redirect('/login?redirect=/admin/events');
  }

  const events = await getEvents();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
      <div className="mb-8">
        <div>
          <h1 className="text-4xl font-semibold text-slate-900">Gestion des événements</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-700">
            Ajoute ou supprime des événements. Les changements sont directement visibles sur la page publique.
          </p>
        </div>
      </div>

      <section className="grid gap-8 md:grid-cols-[1fr_1.2fr]">
        <form action={createEvent} className="card-surface rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-slate-900">Ajouter un événement</h2>
          <div className="mt-4 space-y-4">
            <label className="block text-sm text-slate-700">
              Titre
              <input name="title" required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm text-slate-700">
              Date
              <input name="date" required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm text-slate-700">
              Lieu
              <input name="location" required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm text-slate-700">
              Type
              <input name="type" required className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm text-slate-700">
              Lien (optionnel)
              <input name="link" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm text-slate-700">
              Photos (optionnel, une URL/chemin par ligne)
              <textarea
                name="photos"
                rows={3}
                placeholder="Un chemin ou URL par ligne"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm text-slate-700">
              Importer des photos
              <input name="photoFiles" type="file" accept="image/*" multiple className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
          </div>

          <button type="submit" className="mt-5 rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white">
            Ajouter
          </button>
        </form>

        <div className="card-surface rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-slate-900">Événements existants</h2>
          {events.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Aucun événement enregistré pour le moment.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {events.map((event) => (
                <li key={event.id} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase text-brand-primary">{event.type}</p>
                  <h3 className="text-base font-semibold text-slate-900">{event.title}</h3>
                  <p className="text-sm text-slate-600">{event.date}</p>
                  <p className="text-sm text-slate-600">{event.location}</p>
                  {event.photos && event.photos.length > 0 && (
                    <p className="text-xs text-slate-500">{event.photos.length} photo(s)</p>
                  )}
                  <form action={removeEvent} className="mt-3">
                    <input type="hidden" name="id" value={event.id} />
                    <button type="submit" className="text-sm font-semibold text-red-600 hover:underline">
                      Supprimer
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
