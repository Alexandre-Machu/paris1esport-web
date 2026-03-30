import { getEvents } from '@/lib/eventStore';
import { toEventSlug } from '@/lib/eventSlug';
import Image from 'next/image';
import Link from 'next/link';

const recurring = [
  'Scrims hebdomadaires League of Legends',
  'Tournois internes étudiants',
  'Viewing parties (LFL, Worlds)',
  'Ateliers staff : cast, analyse, prod'
];

export const dynamic = 'force-dynamic';

function getContentPreview(content: string): string {
  return content
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\+\+([^+]+)\+\+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function isEventPassed(dateStr: string): boolean {
  let eventDate: Date | null = null;

  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    eventDate = new Date(`${dateStr}T23:59:59`);
  } else {
    try {
      const parts = dateStr.split(' ');
      if (parts.length >= 3) {
        const day = parseInt(parts[0]);
        const monthName = parts[1];
        const year = parseInt(parts[2]);

        const months: Record<string, number> = {
          janvier: 0, février: 1, mars: 2, avril: 3, mai: 4,
          juin: 5, juillet: 6, août: 7, septembre: 8, octobre: 9,
          novembre: 10, décembre: 11
        };
        const month = months[monthName.toLowerCase()];

        if (!Number.isNaN(day) && month !== undefined && !Number.isNaN(year)) {
          eventDate = new Date(year, month, day, 23, 59, 59);
        }
      }
    } catch {
      // If parsing fails, assume it's not passed
    }
  }

  if (!eventDate) return false;
  const now = new Date();
  return eventDate < now;
}

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
      <div className="mb-8 space-y-3">
        <p className="section-title text-[11px] font-semibold text-brand-primary">Evenements & competitions</p>
        <h1 className="font-display text-4xl font-semibold text-slate-900">Calendrier et rendez-vous</h1>
        <p className="max-w-3xl text-lg text-slate-600">
          Suis nos déplacements, les matchs officiels et les actions campus. Les inscriptions se font via Discord ou formulaires
          dédiés.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-6 text-sm text-slate-600">
          Aucun evenement public pour le moment. Les dates des ligues et tournois seront annoncees ici.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${toEventSlug(event.title)}`}
              className="group card-surface overflow-hidden rounded-2xl transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <article>
                {event.thumbnailPhoto || event.photos?.[0] ? (
                  <div className="relative h-56 w-full">
                    <Image
                      src={event.thumbnailPhoto || event.photos![0]}
                      alt={`${event.title} - couverture`}
                      fill
                      className="object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                ) : (
                  <div className="h-56 w-full bg-gradient-to-br from-slate-200 to-slate-300" />
                )}

                <div className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase text-brand-primary">{event.type}</p>
                    {isEventPassed(event.date) && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                        Passé
                      </span>
                    )}
                  </div>

                  <h3 className="mt-2 text-xl font-semibold text-slate-900">{event.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{event.date}</p>
                  <p className="text-sm text-slate-600">{event.location}</p>

                  {event.content && (
                    <p className="mt-3 line-clamp-3 text-sm text-slate-700">{getContentPreview(event.content)}</p>
                  )}

                  <p className="mt-4 inline-block text-sm font-semibold text-brand-primary transition group-hover:text-brand-secondary">
                    Lire l&apos;article →
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}

      <section className="mt-10 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="card-surface rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-slate-900">Recurrence</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {recurring.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-[#14324d] to-[#12606a] px-6 py-6 text-white">
          <h3 className="text-xl font-semibold text-cyan-100">Envie d&apos;organiser un event ?</h3>
          <p className="mt-2 text-sm text-white/85">
            Propose une LAN, une conférence ou un atelier. Le bureau t’accompagne sur la logistique et la communication.
          </p>
          <a href="mailto:contact@paris1esport.fr" className="mt-4 inline-block rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900">
            contact@paris1esport.fr
          </a>
        </div>
      </section>
    </div>
  );
}
