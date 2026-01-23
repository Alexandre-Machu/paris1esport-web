import Image from 'next/image';
import Link from 'next/link';
import { events, highlights, teams } from '@/lib/data';

export default function HomePage() {
  return (
    <div className="bg-hero-glow">
      <section className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-16 pt-12 md:pt-16">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(247,207,227,0.35),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(25,69,111,0.25),transparent_25%)]" />
        <div className="grid items-center gap-8 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <p className="inline rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-brand-primary shadow-sm">
              Association esport étudiante — Paris 1
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
              Esport, communauté et événements pour les étudiant·e·s passionné·e·s.
            </h1>
            <p className="text-lg text-slate-700">
              Rejoins nos rosters, participe aux tournois inter-universitaires, ou découvre l’esport avec des rôles staff
              (cast, event, graphisme).
            </p>
            <div className="flex flex-wrap gap-3" id="join">
              <Link
                href="https://discord.gg/gbnWXxxkqK"
                className="rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 transition hover:-translate-y-0.5"
                target="_blank"
                rel="noopener noreferrer"
              >
                Rejoindre le Discord
              </Link>
              <Link
                href="/about"
                className="rounded-full border border-brand-primary/20 px-5 py-3 text-sm font-semibold text-brand-primary bg-white transition hover:border-brand-primary/50"
              >
                Découvrir l’asso
              </Link>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <span className="rounded-full bg-white px-3 py-2 shadow-sm">Rosters LoL / Valorant / RL</span>
              <span className="rounded-full bg-white px-3 py-2 shadow-sm">Calendrier compétitions</span>
              <span className="rounded-full bg-white px-3 py-2 shadow-sm">Partenariats étudiants</span>
            </div>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="absolute h-64 w-64 rounded-full bg-gradient-to-br from-brand-accent/60 to-brand-primary/40 blur-3xl" />
            <div className="relative rounded-3xl bg-white/80 p-8 shadow-xl backdrop-blur">
              <div className="mx-auto flex h-52 w-52 items-center justify-center">
                <Image src="/Logo_P1.png" alt="Logo Paris 1 Esport" width={320} height={320} className="drop-shadow" />
              </div>
              <p className="mt-4 text-center text-sm text-slate-600">
                Identité visuelle inspirée de la sorbonne, portée par la communauté esport de Paris 1.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <div key={item.title} className="card-surface rounded-2xl p-6 transition hover:-translate-y-1 hover:shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-700">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-brand-primary">Rosters</p>
            <h2 className="text-2xl font-semibold text-slate-900">Nos équipes en cours de saison</h2>
          </div>
          <Link href="/teams" className="text-sm font-semibold text-brand-primary hover:underline">
            Voir toutes les équipes
          </Link>
        </div>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {teams.map((team) => (
            <div key={team.game} className="card-surface rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-brand-primary">{team.game}</p>
                  <h3 className="text-lg font-semibold text-slate-900">{team.level}</h3>
                </div>
                <span className="rounded-full bg-brand-accent/60 px-3 py-1 text-xs font-semibold text-brand-primary">
                  {team.record}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-700">
                {team.players.map((player) => (
                  <div key={player.name} className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="font-semibold text-slate-900">{player.name}</p>
                    <p className="text-xs text-slate-600">{player.role}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-brand-primary">Calendrier</p>
            <h2 className="text-2xl font-semibold text-slate-900">Événements à venir</h2>
          </div>
          <Link href="/events" className="text-sm font-semibold text-brand-primary hover:underline">
            Tout le calendrier
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {events.map((event) => (
            <div key={event.title} className="card-surface rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase text-brand-primary">{event.type}</p>
              <h3 className="text-lg font-semibold text-slate-900">{event.title}</h3>
              <p className="text-sm text-slate-600">{event.date} · {event.location}</p>
              <Link href={event.link} className="mt-3 inline-block text-sm font-semibold text-brand-primary hover:underline">
                Infos / inscription
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="rounded-3xl bg-gradient-to-r from-brand-primary to-[#102d47] px-8 py-8 text-white shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-2xl font-semibold">Prêt·e à rejoindre l’aventure ?</h3>
              <p className="text-sm text-white/80">Recrutement continu pour joueurs, staff et bénévoles événementiels.</p>
            </div>
            <div className="flex gap-3">
              <Link href="https://discord.gg/gbnWXxxkqK" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-brand-primary" target="_blank" rel="noopener noreferrer">
                Rejoindre le Discord
              </Link>
              <Link href="/about" className="rounded-full border border-white/40 px-5 py-3 text-sm font-semibold text-white">
                En savoir plus
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
