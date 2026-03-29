import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { addEvent, deleteEvent, getEvents } from '@/lib/eventStore';
import { isAdminAuthenticated } from '@/lib/auth';
import { storeEventPhoto } from '@/lib/photoStorage';
import { getPublicationsSettings, updatePublicationsSettings } from '@/lib/publicationsStore';

export const dynamic = 'force-dynamic';

async function createEvent(formData: FormData) {
  'use server';

  if (!(await isAdminAuthenticated())) {
    redirect('/login?redirect=/admin/events');
  }

  const title = String(formData.get('title') || '').trim();
  const dateInput = String(formData.get('date') || '').trim();
  const location = String(formData.get('location') || '').trim();
  const type = String(formData.get('type') || '').trim();
  const linkRaw = String(formData.get('link') || '').trim();
  const photoFiles = formData.getAll('photoFiles').filter((item) => item instanceof File) as File[];

  if (!title || !dateInput || !location || !type) {
    return;
  }

  let date = dateInput;
  // Convertir format ISO (2026-04-12) en texte lisible (12 avril 2026)
  if (dateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const parsed = new Date(`${dateInput}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      date = parsed.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  }

  const uploadedPhotos: string[] = [];
  if (photoFiles.length > 0) {
    for (const file of photoFiles) {
      if (!file.name) {
        continue;
      }

      try {
        uploadedPhotos.push(await storeEventPhoto(file));
      } catch (error) {
        console.error('[admin/events] Photo upload failed, continuing without this file.', error);
      }
    }
  }

  try {
    await addEvent({
      title,
      date,
      location,
      type,
      link: linkRaw || undefined,
      photos: uploadedPhotos.length > 0 ? uploadedPhotos : undefined
    });
  } catch (error) {
    console.error('[admin/events] Event creation failed.', error);
    return;
  }

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

async function updateFeaturedEvent(formData: FormData) {
  'use server';

  if (!(await isAdminAuthenticated())) {
    redirect('/login?redirect=/admin/events');
  }

  const featuredEventId = String(formData.get('featuredEventId') || '').trim();

  await updatePublicationsSettings({
    featuredEventId: featuredEventId || undefined
  });

  revalidatePath('/');
  revalidatePath('/admin/events');
}

export default async function AdminEventsPage() {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    redirect('/login?redirect=/admin/events');
  }

  const events = await getEvents();
  const settings = await getPublicationsSettings();

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
              <input 
                name="date" 
                type="date" 
                required 
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" 
              />
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
              Importer des photos
              <input name="photoFiles" type="file" accept="image/*" multiple className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>
          </div>

          <button type="submit" className="mt-5 rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white">
            Ajouter
          </button>
        </form>

        <div className="card-surface rounded-2xl p-6">
          <form action={updateFeaturedEvent} className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="text-base font-semibold text-slate-900">Evenement mis en avant (page d&apos;accueil)</h2>
            <p className="mt-1 text-xs text-slate-600">Choisis l&apos;event affiche dans le hero de la home.</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                name="featuredEventId"
                defaultValue={settings.featuredEventId || ''}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                <option value="">Premier event de la liste (auto)</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title} - {event.date}
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white">
                Enregistrer
              </button>
            </div>
          </form>

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
