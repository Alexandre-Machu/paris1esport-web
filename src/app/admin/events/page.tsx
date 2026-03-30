import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getEvents } from '@/lib/eventStore';
import { isAdminAuthenticated } from '@/lib/auth';
import { getPublicationsSettings, updatePublicationsSettings } from '@/lib/publicationsStore';
import EventsEditor from './EventsEditor';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: { edit?: string };
};

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

export default async function AdminEventsPage({ searchParams }: PageProps) {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    redirect('/login?redirect=/admin/events');
  }

  const events = await getEvents();
  const settings = await getPublicationsSettings();
  const editEventId = searchParams.edit;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
      <div className="mb-8">
        <div>
          <h1 className="text-4xl font-semibold text-slate-900">Gestion des événements</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-700">
            Ajoute, modifie ou supprime des événements. Les changements sont visibles sur la page publique.
          </p>
        </div>
      </div>

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

        <EventsEditor initialEvents={events} editEventId={editEventId} />
      </div>
    </div>
  );
}
