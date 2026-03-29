import { getEvents } from '@/lib/eventStore';
import Image from 'next/image';

const recurring = [
  'Scrims hebdomadaires League of Legends',
  'Tournois internes étudiants',
  'Viewing parties (LFL, Worlds)',
  'Ateliers staff : cast, analyse, prod'
];

export const revalidate = 60;

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
            <article key={event.title} className="card-surface rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase text-brand-primary">{event.type}</p>
              <h3 className="text-lg font-semibold text-slate-900">{event.title}</h3>
              <p className="text-sm text-slate-600">{event.date}</p>
              <p className="text-sm text-slate-600">{event.location}</p>
              {event.photos && event.photos.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {event.photos.map((photo, index) => (
                    <Image
                      key={`${event.id}-${index}`}
                      src={photo}
                      alt={`${event.title} - photo ${index + 1}`}
                      width={240}
                      height={96}
                      className="h-24 w-full rounded-lg object-cover"
                    />
                  ))}
                </div>
              )}
              {event.link && (
                <a href={event.link} className="mt-3 inline-block text-sm font-semibold text-brand-primary hover:text-brand-secondary">
                  Infos / inscription
                </a>
              )}
            </article>
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
