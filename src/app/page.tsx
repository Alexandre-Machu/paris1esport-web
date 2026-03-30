import Image from 'next/image';
import Link from 'next/link';
import { getEvents } from '@/lib/eventStore';
import { toEventSlug } from '@/lib/eventSlug';
import { getManagedPartners } from '@/lib/partnerStore';
import { getManagedTeams } from '@/lib/teamStore';
import { getPublicationsSettings } from '@/lib/publicationsStore';
import type { UpcomingMatch, ManagedPublicationsSettings } from '@/lib/types';

const fallbackEventVisual = '/photos/events/1774642597385-890a771d-dbc7-4368-b51d-9469401b04aa.jpg';
export const dynamic = 'force-dynamic';

const defaultSettings: ManagedPublicationsSettings = {
  featuredEventId: undefined
};

async function safeFetch<T>(loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    console.error('[home] data loader failed, using fallback.', error);
    return fallback;
  }
}

function formatMatchDateTime(datetime: string): string {
  const parsed = new Date(datetime);
  if (Number.isNaN(parsed.getTime())) return datetime;
  return parsed.toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
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

export default async function HomePage() {
  const [events, partners, allTeams, settings] = await Promise.all([
    safeFetch(getEvents, []),
    safeFetch(getManagedPartners, []),
    safeFetch(getManagedTeams, []),
    safeFetch(getPublicationsSettings, defaultSettings)
  ]);

  const featuredEventId = settings.featuredEventId;
  let featuredEvent = events[0];
  if (featuredEventId && events.length > 0) {
    const found = events.find((e) => e.id === featuredEventId);
    if (found) featuredEvent = found;
  }

  const featuredVisual = featuredEvent?.photos?.[0] || fallbackEventVisual;
  const featuredEventHref = featuredEvent
    ? `/events/${toEventSlug(featuredEvent.title || featuredEvent.id)}`
    : '/events';
  const basePartners =
    partners.length > 0
      ? Array.from({ length: Math.max(12, partners.length * 6) }, (_, index) => partners[index % partners.length])
      : [];
  const loopPartners = [...basePartners, ...basePartners];

  const allUpcomingMatches: (UpcomingMatch & { teamGame: string })[] = [];
  allTeams.forEach((team) => {
    if (team.nextMatches && team.nextMatches.length > 0) {
      team.nextMatches.forEach((match) => {
        allUpcomingMatches.push({
          ...match,
          teamGame: team.game
        });
      });
    }
  });

  const upcomingMatches = allUpcomingMatches
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
    .slice(0, 5);

  return (
    <div className="surface-grid">
      {/* Hero Section */}
      <section className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 md:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-8 fade-up">
            <div className="space-y-4">
              <p className="inline-flex rounded-lg border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-gray-700">
                Association Esport Etudiante
              </p>
              <h1 className="font-display text-5xl font-bold leading-tight text-gray-900 md:text-7xl">
                Paris 1<br />
                <span className="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">Esport</span>
              </h1>
              <p className="max-w-lg text-lg text-gray-600">
                Rosters compétitifs, événements majeurs et une communauté soudée. Paris 1 Esport structure la scène étudiante.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="https://discord.gg/gbnWXxxkqK"
                className="rounded-lg border border-brand-primary bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:shadow-lg hover:bg-opacity-90"
                target="_blank"
                rel="noopener noreferrer"
              >
                Rejoindre le Discord
              </Link>
              <Link
                href="/about"
                className="rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-50"
              >
                Découvrir l&apos;asso
              </Link>
            </div>
          </div>

          {/* Featured Event */}
          <div className="fade-up fade-up-delay-1">
            <Link href={featuredEventHref} className="group block">
              <div className="hero-panel relative overflow-hidden rounded-xl transition group-hover:shadow-xl">
                <div className="relative h-80 md:h-[420px]">
                  <Image
                    src={featuredVisual}
                    alt="Event majeur"
                    fill
                    className="object-cover transition duration-300 group-hover:scale-[1.02]"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <p className="section-title mb-2 text-xs">Événement majeur</p>
                    <h2 className="text-2xl font-bold text-white md:text-3xl">
                      {featuredEvent?.title || 'Campus Clash Paris 1'}
                    </h2>
                    <p className="mt-2 text-sm text-gray-100">
                      {featuredEvent
                        ? `${featuredEvent.date} • ${featuredEvent.location}`
                        : 'Finale inter-facs, showmatch live et animations onsite'}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-white/90 group-hover:text-white">Lire l&apos;article →</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      {partners.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16 fade-up fade-up-delay-2">
          <div className="mb-8">
            <p className="section-title mb-2">Partenariats</p>
            <h2 className="text-3xl font-bold text-gray-900">Nos partenaires</h2>
          </div>
          <div className="rounded-lg bg-gradient-to-r from-brand-primary/10 via-brand-secondary/10 to-brand-primary/10 p-8 overflow-hidden border border-brand-primary/15">
            <div className="marquee-track">
              {loopPartners.map((partner, index) => (
                <a
                  href={partner.link}
                  key={`${partner.id}-${index}`}
                  className="flex min-w-[200px] shrink-0 items-center justify-center gap-3 rounded-lg border border-brand-primary/20 bg-white/60 hover:bg-white px-4 py-4 transition hover:border-brand-secondary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {partner.logo ? (
                    <Image
                      src={partner.logo}
                      alt={partner.name}
                      width={48}
                      height={48}
                      className="h-12 w-12 object-contain"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-brand-primary flex items-center justify-center">
                      <span className="text-xs font-bold text-white">Paris 1 Esport</span>
                    </div>
                  )}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Upcoming Matches */}
      {upcomingMatches.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16 fade-up fade-up-delay-3">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="section-title mb-2">Compétition</p>
              <h2 className="text-3xl font-bold text-gray-900">Prochains matchs</h2>
            </div>
            <Link
              href="/teams"
              className="text-sm font-semibold text-brand-primary hover:text-brand-secondary transition"
            >
              Tous les matchs →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            {upcomingMatches.map((match) => (
              <div key={match.id} className="card-surface rounded-lg p-4 hover:shadow-md transition flex flex-col border-l-4 border-brand-primary">
                <p className="section-title mb-2 text-xs">{match.teamGame}</p>
                <h3 className="font-display font-bold text-gray-900">vs {match.opponent}</h3>
                <p className="text-xs text-gray-600 mt-2">{formatMatchDateTime(match.datetime)}</p>
                {match.competition && (
                  <p className="text-xs text-brand-primary font-medium mt-1">{match.competition}</p>
                )}
                {match.stage && (
                  <p className="text-xs text-gray-600">{match.stage}</p>
                )}
                {match.streamUrl && (
                  <Link
                    href={match.streamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto pt-3 inline-flex text-xs font-semibold text-brand-primary hover:text-brand-secondary transition"
                  >
                    Suivre le stream →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Events */}
      {events.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16 fade-up fade-up-delay-3">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="section-title mb-2">Agenda</p>
              <h2 className="text-3xl font-bold text-gray-900">Événements</h2>
            </div>
            <Link
              href="/events"
              className="text-sm font-semibold text-brand-primary hover:text-brand-secondary transition"
            >
              Calendrier complet →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {events.slice(0, 6).map((event) => {
              const isPassed = isEventPassed(event.date);
              return (
                <Link
                  href={`/events/${toEventSlug(event.title || event.id)}`}
                  key={event.id}
                  className="card-surface rounded-lg p-5 hover:shadow-md transition flex flex-col border-t-4 border-brand-secondary group"
                >
                  <div className="flex items-start justify-between">
                    <p className="section-title mb-3 text-xs uppercase text-brand-primary">{event.type}</p>
                    {isPassed && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                        Passé
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-lg font-bold text-gray-900 group-hover:text-brand-primary transition">{event.title}</h3>
                  <p className="text-sm text-gray-600 mt-2">{event.date}</p>
                  <p className="text-xs text-gray-600 mt-1">{event.location}</p>
                  {event.link && (
                    <p className="mt-auto pt-4 inline-flex text-xs font-semibold text-brand-primary">
                      Infos/S&apos;inscrire sur la page événement →
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* CTA Footer */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="neon-border rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary/20 p-8 md:p-12 text-white">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-display text-2xl md:text-3xl font-bold">Prêt.e à rejoindre ?</h3>
              <p className="mt-2 text-white/90">Recrutement ouvert pour joueurs, staff et bénévoles événementiels.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="https://discord.gg/gbnWXxxkqK"
                className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-brand-primary hover:bg-gray-100 transition text-center"
                target="_blank"
                rel="noopener noreferrer"
              >
                Rejoindre le Discord
              </Link>
              <Link
                href="/about"
                className="rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition text-center"
              >
                En savoir plus
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
