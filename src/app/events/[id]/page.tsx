import { getEvents } from '@/lib/eventStore';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import EditEventButton from './EditEventButton';

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

  const photos = event.photos || [];
  const coverPhoto = photos[0];
  const gallery = photos.slice(1);
  const articleBody = event.content?.trim()
    ? event.content
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    : [
        `Retrouve toutes les informations pratiques pour ${event.title}.`,
        'Les details logistiques et les annonces importantes sont centralises sur cette page.',
        'Pour participer, surveille notre Discord et les communications de l\'association.'
      ];

  return (
    <article className="mx-auto max-w-5xl px-4 pb-20 pt-12">
      <Link href="/events" className="text-sm font-semibold text-brand-primary hover:underline">
        ← Retour aux événements
      </Link>

      <header className="mt-8">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-brand-primary">{event.type}</p>
            <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">{event.title}</h1>
          </div>
          <EditEventButton eventId={event.id} />
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1">{event.date}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">{event.location}</span>
          {event.link && (
            <a
              href={event.link}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-brand-primary px-3 py-1 font-semibold text-white hover:bg-brand-primary/90"
            >
              Infos / inscription
            </a>
          )}
        </div>
      </header>

      {coverPhoto && (
        <div className="relative mt-8 overflow-hidden rounded-2xl">
          <Image
            src={coverPhoto}
            alt={`${event.title} - photo de couverture`}
            width={1400}
            height={780}
            className="h-auto w-full object-cover"
            priority
          />
        </div>
      )}

      <section className="prose prose-slate mt-10 max-w-none prose-p:text-slate-700 prose-p:leading-7">
        {articleBody.map((paragraph, index) => (
          <p key={`${event.id}-paragraph-${index}`}>{paragraph}</p>
        ))}
      </section>

      {gallery.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold text-slate-900">Galerie photos</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {gallery.map((photo, index) => (
              <div key={`${event.id}-gallery-${index}`} className="overflow-hidden rounded-xl">
                <Image
                  src={photo}
                  alt={`${event.title} - photo ${index + 2}`}
                  width={1000}
                  height={620}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
