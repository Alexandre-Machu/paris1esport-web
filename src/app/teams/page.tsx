'use client';

import { teams } from '@/lib/data';
import { useState } from 'react';

export default function TeamsPage() {
  const [openGame, setOpenGame] = useState<'lol' | 'cs' | 'ow' | 'fgc' | null>('lol');

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
      <div className="mb-6 space-y-3">
        <p className="text-xs font-semibold uppercase text-brand-primary">Équipes & joueur·euse·s</p>
        <h1 className="text-4xl font-semibold text-slate-900">Rosters & contacts</h1>
        <p className="max-w-3xl text-lg text-slate-700">Point d’entrée par jeu : contacte le manager, on t’oriente sur les essais et rosters en cours.</p>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Contacts par jeu</p>
        <ul className="mt-2 space-y-1">
          <li>LoL : @1stkalenz sur le Discord</li>
          <li>CS : @baronvanwaffeln</li>
          <li>FGC : @dnl_serio</li>
          <li>Overwatch : @whitesun616</li>
        </ul>
      </div>

      <div className="space-y-3">
        {[{
          key: 'lol',
          title: 'League of Legends',
          desc: '6 équipes engagées (Ligue Poro et circuit étudiant).',
          content: (
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
                            <p className="text-xs text-slate-600">Elo : {player.elo ?? 'N/A'}</p>
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
          )
        }, {
          key: 'cs',
          title: 'Counter-Strike',
          desc: 'Rosters en préparation (mix étudié, essais à venir).',
          content: (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
              <p>Rosters en cours de montage. Passe sur le Discord et ping @baronvanwaffeln pour rejoindre les tests et soirées aim.</p>
            </div>
          )
        }, {
          key: 'ow',
          title: 'Overwatch',
          desc: 'Line-up campus en constitution.',
          content: (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
              <p>On recrute pour compléter le roster Overwatch. Contacte @whitesun616 pour les scrims et placements.</p>
            </div>
          )
        }, {
          key: 'fgc',
          title: 'FGC',
          desc: 'Référents et sparring partners en setup.',
          content: (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
              <p>Sessions training / seeding en préparation. Ping @dnl_serio pour rejoindre les pools (Smash, SF, Tekken...).</p>
            </div>
          )
        }].map((panel) => (
          <div key={panel.key} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <button
              className="flex w-full items-center justify-between text-left"
              onClick={() => setOpenGame(openGame === panel.key ? null : panel.key)}
            >
              <div>
                <p className="text-xs font-semibold uppercase text-brand-primary">{panel.title}</p>
                <p className="text-sm text-slate-700">{panel.desc}</p>
              </div>
              <span className="text-brand-primary text-lg">{openGame === panel.key ? '−' : '+'}</span>
            </button>
            {openGame === panel.key && <div className="mt-3">{panel.content}</div>}
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-dashed border-brand-primary/30 bg-white px-6 py-6 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Process de recrutement</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Rejoins le Discord.</li>
          <li>Contacte le manager du jeu concerné.</li>
        </ol>
      </div>
    </div>
  );
}
