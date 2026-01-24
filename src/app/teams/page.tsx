import { teams } from '@/lib/data';

export default function TeamsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
      <div className="mb-8 space-y-3">
        <p className="text-xs font-semibold uppercase text-brand-primary">Équipes & joueur·euse·s</p>
        <h1 className="text-4xl font-semibold text-slate-900">Rosters League of Legends</h1>
        <p className="max-w-3xl text-lg text-slate-700">
          6 équipes P1 engagées (Ligue Poro et autres ligues étudiantes). Détails joueurs et résultats arrivent très vite.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {teams.map((team) => (
          <section key={team.name} className="card-surface rounded-2xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-brand-primary">{team.game}</p>
                <h2 className="text-xl font-semibold text-slate-900">{team.name}</h2>
                <p className="text-sm text-slate-600">Niveau : {team.level}</p>
                <p className="text-sm text-slate-600">{team.record}</p>
              </div>
              <span className="rounded-full bg-brand-accent/60 px-3 py-1 text-xs font-semibold text-brand-primary">Roster en cours</span>
            </div>

            {team.players && team.players.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {team.players.map((player) => (
                  <div key={player.name} className="flex items-start justify-between rounded-xl bg-slate-50 px-4 py-3">
                    <div>
                      <p className="font-semibold text-slate-900">{player.name}</p>
                      <p className="text-xs text-slate-600">{player.role}</p>
                      <p className="text-xs text-slate-600">Elo : {player.elo}</p>
                      {player.note && <p className="text-xs text-slate-500">{player.note}</p>}
                    </div>
                    {player.opgg && (
                      <a
                        href={player.opgg}
                        className="text-xs font-semibold text-brand-primary hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        OPGG
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Les fiches joueurs (pseudo, rôle, elo, lien OPGG) arrivent avec le mapping final des équipes.
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-dashed border-brand-primary/30 bg-white px-6 py-6 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Process de recrutement</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Rejoins le Discord et présente-toi dans le salon recrutement.</li>
          <li>Participe à une soirée open scrim ou aux tests programmés.</li>
          <li>Intégration en roster selon le niveau et les besoins de chaque équipe.</li>
        </ol>
      </div>
    </div>
  );
}
