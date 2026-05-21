import Image from 'next/image';
import Link from 'next/link';
import { highlights } from '@/lib/data';
import { getEvents } from '@/lib/eventStore';
import { getManagedPartners } from '@/lib/partnerStore';
import { getManagedTeams } from '@/lib/teamStore';
import { getPublicationsSettings } from '@/lib/publicationsStore';
import type { ManagedTeamItem, UpcomingMatch } from '@/lib/types';

const fallbackEventVisual = '/photos/events/1774642597385-890a771d-dbc7-4368-b51d-9469401b04aa.jpg';

export default async function HomePage() {
  const [events, partners, allTeams, settings] = await Promise.all([
    getEvents(),
    getManagedPartners(),
    getManagedTeams(),
    getPublicationsSettings()
  ]);

  // Get featured event (use admin setting or default to first event)
  const featuredEventId = settings.featuredEventId;
  let featuredEvent = events[0];
  if (featuredEventId && events.length > 0) {
    const found = events.find((e) => e.id === featuredEventId);
    if (found) featuredEvent = found;
  }

  const featuredVisual = featuredEvent?.photos?.[0] || fallbackEventVisual;
  const loopPartners = partners.length > 0 ? [...partners, ...partners] : [];

  // Collect all upcoming matches from teams
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

  // Sort by datetime (newest first) and take top 3
  const upcomingMatches = allUpcomingMatches
    .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
    .slice(0, 5);

  return (
    <div className="surface-grid">
      <section className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 md:pt-14">
        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6 fade-up">
            <p className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
              Association Esport Etudiante - Paris 1
            </p>
            <h1 className="font-display text-4xl font-semibold leading-tight text-white md:text-6xl">
              Le campus
              <span className="bg-gradient-to-r from-cyan-200 via-cyan-400 to-emerald-300 bg-clip-text text-transparent"> passe en mode arena.</span>
            </h1>
            <p className="max-w-xl text-lg text-slate-300">
              Rosters compétitifs, event majeur sur le campus, staff créatif et ambitions de ligue: Paris 1 Esport rassemble,
              structure et fait performer la scene etudiante.
            </p>
            <div className="flex flex-wrap gap-3" id="join">
              <Link
                href="https://discord.gg/gbnWXxxkqK"
                className="rounded-full border border-cyan-200/65 bg-gradient-to-r from-cyan-500 to-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-800/30 transition hover:-translate-y-0.5"
                target="_blank"
                rel="noopener noreferrer"
              >
                Rejoindre le Discord
              </Link>
              <Link
                href="/about"
                className="rounded-full border border-cyan-300/30 bg-slate-950/45 px-5 py-3 text-sm font-semibold text-cyan-200 transition hover:border-cyan-200/60"
              >
                Découvrir l’asso
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="card-surface rounded-xl p-3">
                <p className="font-display text-xl font-semibold text-cyan-300">6+</p>
                <p className="text-xs uppercase tracking-wider text-slate-300">Teams actives</p>
              </div>
              <div className="card-surface rounded-xl p-3">
                <p className="font-display text-xl font-semibold text-cyan-300">20+</p>
                <p className="text-xs uppercase tracking-wider text-slate-300">Staff assoc</p>
              </div>
              <div className="card-surface rounded-xl p-3">
                <p className="font-display text-xl font-semibold text-cyan-300">4</p>
                <p className="text-xs uppercase tracking-wider text-slate-300">Poles metiers</p>
              </div>
              <div className="card-surface rounded-xl p-3">
                <p className="font-display text-xl font-semibold text-cyan-300">100%</p>
                <p className="text-xs uppercase tracking-wider text-slate-300">Campus energy</p>
              </div>
            </div>
          </div>
          <div className="fade-up fade-up-delay-1">
            <article className="hero-panel neon-border relative overflow-hidden rounded-3xl p-4 md:p-5">
              <div className="relative h-[280px] overflow-hidden rounded-2xl md:h-[340px]">
                <Image src={featuredVisual} alt="Event majeur Paris 1 Esport" fill className="object-cover" priority />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="section-title text-[11px] text-cyan-200">Event Majeur</p>
                  <h2 className="mt-1 text-2xl font-semibold text-white md:text-3xl">
                    {featuredEvent?.title || 'Campus Clash Paris 1'}
                  </h2>
                  <p className="text-sm text-slate-200">
                    {featuredEvent
                      ? `${featuredEvent.date} - ${featuredEvent.location}`
                      : 'Finale inter-facs, showmatch, cast live et animations onsite.'}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.1em] text-slate-300">
                Visual central de la saison: place a l&apos;action, au show et a la communaute.
              </p>
            </article>
          </div>
        </div>
      </section>

      {partners.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-14 fade-up fade-up-delay-2">
          <div className="rounded-2xl border border-cyan-300/15 bg-[#0b1727]/95 px-4 py-4">
            <p className="section-title mb-3 text-[11px] text-cyan-200">Partenaires</p>
            <div className="overflow-hidden">
              <div className="marquee-track gap-4">
                {loopPartners.map((partner, index) => (
                  <a
                    href={partner.link}
                    key={`${partner.id}-${index}`}
                    className="flex min-w-[230px] items-center gap-3 rounded-xl border border-cyan-300/15 bg-slate-900/65 px-4 py-3 transition hover:border-cyan-200/45"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {partner.logo ? (
                      <Image src={partner.logo} alt={partner.name} width={54} height={54} className="h-10 w-10 object-contain" />
                    ) : (
                      <span className="font-display text-sm text-cyan-300">P1E</span>
                    )}
                    <span className="text-sm text-slate-200">{partner.name}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="section-title text-[11px] text-cyan-200">Playbook</p>
            <h2 className="font-display text-3xl text-white">Ce qui fait tourner l&apos;asso</h2>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <div key={item.title} className="card-surface rounded-2xl p-6 transition hover:-translate-y-1">
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {allTeams.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="flex items-center justify-between">
            <div>
              <p className="section-title text-[11px] text-cyan-200">Rosters</p>
              <h2 className="font-display text-3xl text-white">Nos equipes en cours de saison</h2>
            </div>
            <Link href="/teams" className="text-sm font-semibold text-cyan-300 hover:text-cyan-100">
              Voir toutes les équipes
            </Link>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {allTeams.slice(0, 4).map((team) => (
              <div key={team.id} className="card-surface rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase text-cyan-300">{team.game}</p>
                    <h3 className="text-lg font-semibold text-white">{team.name}</h3>
                  </div>
                  <span className="rounded-full bg-orange-400/15 px-3 py-1 text-xs font-semibold text-orange-300">
                    {team.playerIds?.length || 0} joueurs
                  </span>
                </div>
                <div className="mt-4 rounded-lg border border-slate-600/30 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
                  Composition à venir
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {upcomingMatches.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="section-title text-[11px] text-cyan-200">Prochains Matchs</p>
              <h2 className="font-display text-3xl text-white">Les confrontations a venir</h2>
            </div>
            <Link href="/teams" className="text-sm font-semibold text-cyan-300 hover:text-cyan-100">
              Tous les matchs
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {upcomingMatches.map((match) => (
              <div key={match.id} className="card-surface rounded-2xl p-4">
                <p className="text-xs font-semibold uppercase text-cyan-300">{match.teamGame}</p>
                <h3 className="mt-1 text-base font-semibold text-white">vs {match.opponent}</h3>
                <p className="text-xs text-slate-400 mt-2">{match.datetime}</p>
                {match.competition && (
                  <p className="text-xs text-slate-300 mt-1">{match.competition}</p>
                )}
                {match.stage && (
                  <p className="text-xs text-slate-400">{match.stage}</p>
                )}
                {match.streamUrl && (
                  <Link
                    href={match.streamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-xs font-semibold text-emerald-300 hover:text-emerald-100"
                  >
                    Suivre le stream →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex items-center justify-between">
          <div>
            <p className="section-title text-[11px] text-cyan-200">Calendrier</p>
            <h2 className="font-display text-3xl text-white">Evenements a venir</h2>
          </div>
          <Link href="/events" className="text-sm font-semibold text-cyan-300 hover:text-cyan-100">
            Tout le calendrier
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {events.map((event) => (
            <div key={event.title} className="card-surface rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase text-cyan-300">{event.type}</p>
              <h3 className="text-lg font-semibold text-white">{event.title}</h3>
              <p className="text-sm text-slate-400">{event.date} · {event.location}</p>
              {event.link ? (
                <Link href={event.link} className="mt-3 inline-block text-sm font-semibold text-cyan-300 hover:text-cyan-100">
                  Infos / inscription
                </Link>
              ) : (
                <p className="mt-3 text-sm text-slate-500">Infos / inscription a venir</p>
              )}
            </div>
          ))}
          {events.length === 0 && (
            <div className="card-surface rounded-2xl p-5 text-sm text-slate-300 md:col-span-3">
              Le calendrier public arrive bientot. Les prochains matchs et events seront annonces ici.
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="neon-border rounded-3xl bg-gradient-to-r from-[#10253b] via-[#0f3a58] to-[#16676c] px-8 py-8 text-white shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-display text-2xl font-semibold">Pret a rejoindre l&apos;aventure ?</h3>
              <p className="text-sm text-white/85">Recrutement continu pour joueurs, staff et benevoles evenementiels.</p>
            </div>
            <div className="flex gap-3">
              <Link href="https://discord.gg/gbnWXxxkqK" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900" target="_blank" rel="noopener noreferrer">
                Rejoindre le Discord
              </Link>
              <Link href="/about" className="rounded-full border border-white/50 px-5 py-3 text-sm font-semibold text-white">
                En savoir plus
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
