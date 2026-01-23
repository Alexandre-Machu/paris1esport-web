import { teams } from '@/lib/data';

export default function TeamsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
      <div className="mb-8 space-y-3">
        <p className="text-xs font-semibold uppercase text-brand-primary">Équipes & joueur·euse·s</p>
        <h1 className="text-4xl font-semibold text-slate-900">Rosters actuels et profils</h1>
        <p className="max-w-3xl text-lg text-slate-700">
          Sélection universitaire, équipes académie, et ouverture aux recrutements. Chaque roster est encadré par un ou une
          manager bénévole.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {teams.map((team) => (
          <section key={team.game} className="card-surface rounded-2xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-brand-primary">{team.game}</p>
                <h2 className="text-xl font-semibold text-slate-900">{team.level}</h2>
                <p className="text-sm text-slate-600">Bilan : {team.record}</p>
              </div>
              <span className="rounded-full bg-brand-accent/60 px-3 py-1 text-xs font-semibold text-brand-primary">Recrutement ouvert</span>
            </div>
            <div className="mt-4 grid gap-3">
              {team.players.map((player) => (
                <div key={player.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <div>
                    <p className="font-semibold text-slate-900">{player.name}</p>
                    <p className="text-xs text-slate-600">{player.role}</p>
                  </div>
                  <p className="text-xs font-semibold text-brand-primary">{player.tag}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-dashed border-brand-primary/30 bg-white px-6 py-6 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Process de recrutement</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Rejoins le Discord et présente-toi dans le salon recrutement.</li>
          <li>Participes à une soirée open scrim ou aux tests programmés.</li>
          <li>Intégration en académie ou en roster selon le niveau et les besoins.</li>
        </ol>
      </div>
    </div>
  );
}
