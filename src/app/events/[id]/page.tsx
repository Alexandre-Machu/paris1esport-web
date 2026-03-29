import { getEvents } from '@/lib/eventStore';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const revalidate = 60;

type PageProps = {
  params: { id: string };
};

export default async function EventDetailPage({ params }: PageProps) {
  const events = await getEvents();
  const event = events.find((e) => e.id === params.id);

  if (!event) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
      <Link href="/events" className="text-sm font-semibold text-brand-primary hover:underline">
        ← Retour aux événements
      </Link>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div>
            <p className="text-xs font-semibold uppercase text-brand-primary">{event.type}</p>
            <h1 className="mt-1 text-4xl font-semibold text-slate-900">{event.title}</h1>

            <div className="mt-6 space-y-3 text-lg text-slate-600">
              <p>
                <span className="font-semibold text-slate-900">Date :</span> {event.date}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Lieu :</span> {event.location}
              </p>
              {event.link && (
                <p>
                  <span className="font-semibold text-slate-900">Lien :</span>{' '}
                  <a href={event.link} target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">
                    {event.link}
                  </a>
                </p>
              )}
            </div>
          </div>

          {/* Photos Gallery */}
          {event.photos && event.photos.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-semibold text-slate-900">Galerie photos</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {event.photos.map((photo, index) => (
                  <div key={index} className="rounded-lg overflow-hidden aspect-video">
                    <Image
                      src={photo}
                      alt={`${event.title} - photo ${index + 1}`}
                      width={500}
                      height={300}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <div className="card-surface rounded-2xl p-6 sticky top-20">
            <h3 className="text-lg font-semibold text-slate-900">À propos</h3>
            <p className="mt-3 text-sm text-slate-600">
              {event.type === 'Scrim' && "Retrouve-nous pour nos scrims hebdomadaires !"}
              {event.type === 'Tournoi' && "Participe à l'un de nos tournois"}
              {event.type === 'Viewing Party' && "Visionnage en direct avec la communauté"}
              {event.type === 'Atelier' && "Session d'apprentissage"}
              {!['Scrim', 'Tournoi', 'Viewing Party', 'Atelier'].includes(event.type) && 'Événement campus paris1esport'}
            </p>

            <Link
              href="/events"
              className="mt-6 block w-full rounded-full bg-brand-primary px-4 py-3 text-center text-sm font-semibold text-white hover:bg-brand-primary/90"
            >
              Voir tous les événements
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
