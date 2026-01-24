'use client';

import Link from 'next/link';
import { useState } from 'react';

const values = [
  { title: 'Esprit campus', desc: 'Créer des ponts entre filières autour du jeu et de la compétition.' },
  { title: 'Progression', desc: 'Accompagnement des joueurs et des rôles staff (coaching, analyses, ateliers).' },
  { title: 'Ouverture', desc: 'Événements grand public, inclusivité et parité au sein des équipes.' }
];

const milestones = [
  { year: 'Nov. 2025', text: 'Création de Paris 1 Esport et premières équipes LoL.' },
  { year: 'Déc. 2025', text: 'Engagement en ligues (ex. Poro) et structuration des pôles event/communication.' }
];

const bureau = [
  { 
    role: 'Président', 
    name: 'Alexandre',
    description: 'Étudiant en M1, passionné d\'esport et fondateur de Paris 1 Esport.',
    photo: '/photos/alexandre.jpg'
  },
  { 
    role: 'Vice-présidente', 
    name: 'Marylou',
    description: 'Étudiante engagée dans le développement de l\'association.',
    photo: '/photos/marylou.jpg'
  },
  { 
    role: 'Trésorier', 
    name: 'Théo',
    description: 'Gestion financière et partenariats de l\'association.',
    photo: '/photos/theo.jpg'
  },
  { 
    role: 'Secrétaire', 
    name: 'Carles',
    description: 'Organisation administrative et coordination interne.',
    photo: '/photos/carles.jpg'
  }
];

const poles = [
  {
    name: 'Pôle esport',
    desc: 'Managers équipes & encadrement',
    membres: [
      { name: 'Rilok', role: 'Responsable du pôle', description: 'Coordination du pôle esport et encadrement des managers LoL/CS/FGC.', photo: '/photos/rilok.jpg' },
      { name: 'Kalenz', role: 'Manager LoL', description: 'Suivi des équipes LoL et résultats en ligues.', photo: '/photos/kalenz.jpg' },
      { name: 'Baron', role: 'Manager CS', description: 'Encadrement des line-ups Counter-Strike.', photo: '/photos/baron.jpg' },
      { name: 'Serio', role: 'Manager FGC', description: 'Référent jeux de combat (FGC).', photo: '/photos/serio.jpg' }
    ]
  },
  {
    name: 'Pôle event',
    desc: 'Organisation tournois, viewing parties',
    membres: [
      { name: 'Julien', role: 'Responsable du pôle', description: 'Organisation des événements, tournois internes et viewing parties.', photo: '/photos/jade.jpg' },
      { name: 'Jade', role: 'Adjoint Events', description: 'Support logistique et planning.', photo: '/photos/rypper.jpg' },
      { name: 'Noufe', role: 'Adjoint Events', description: 'Coordination des inscriptions et brackets.', photo: '/photos/noufe.jpg' },
      { name: 'SkyOfPotatoes', role: 'Adjoint Events', description: 'Production et régie sur événements.', photo: '/photos/skyofpotatoes.jpg' },
      { name: 'Hitsuyiko', role: 'Adjoint Events', description: 'Gestion salle / accueil joueurs.', photo: '/photos/hitsuyiko.jpg' },
      { name: 'Avannah', role: 'Adjoint Events', description: 'Communication événementielle.', photo: '/photos/avannah.jpg' }
    ]
  },
  {
    name: 'Pôle communication',
    desc: 'Contenus, graphisme, réseaux',
    membres: [
      { name: 'Elias', role: 'Responsable du pôle', description: 'Stratégie de communication, contenus et gestion des réseaux sociaux.', photo: '/photos/elias.jpg' },
      { name: 'Charlotte', role: 'CM', description: 'Community management et rédaction.', photo: '/photos/charlotte.jpg' },
      { name: 'Tokids', role: 'Monteur vidéo', description: 'Montage et post-production vidéo.', photo: '/photos/tokids.jpg' },
      { name: 'Manon', role: 'Graphiste', description: 'Identité visuelle et supports print.', photo: '/photos/manon.jpg' },
      { name: 'Manon', role: 'Graphiste', description: 'Identité visuelle et supports print.', photo: '/photos/manon.jpg' },
      { name: 'Jade', role: 'Graphiste', description: 'Création graphique et déclinaisons.', photo: '/photos/jade-graphiste.jpg' }
    ]
  }
];

export default function AboutPage() {
  const [openPole, setOpenPole] = useState<string | null>(null);
  const [openBureau, setOpenBureau] = useState<string | null>(null);
  const [openMembre, setOpenMembre] = useState<string | null>(null);
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
      <div className="mb-10 space-y-4">
        <p className="text-xs font-semibold uppercase text-brand-primary">À propos</p>
        <h1 className="text-4xl font-semibold text-slate-900">L’association Paris 1 Esport</h1>
        <p className="max-w-3xl text-lg text-slate-700">
          Créée en novembre 2025, Paris 1 Esport rassemble les étudiant·e·s de P1 autour de League of Legends, d’événements campus
          et de rôles staff (cast, prod, graphisme, event). Objectif : apprendre, progresser et performer ensemble.
        </p>
        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
          <span className="rounded-full bg-brand-accent/60 px-3 py-2 font-semibold text-brand-primary">Association loi 1901</span>
          <span className="rounded-full bg-slate-100 px-3 py-2">Ouverte à tous niveaux</span>
          <span className="rounded-full bg-slate-100 px-3 py-2">Staff bénévole encadrant</span>
        </div>
      </div>

      <section className="grid gap-6 md:grid-cols-3">
        {values.map((item) => (
          <div key={item.title} className="card-surface rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm text-slate-700">{item.desc}</p>
          </div>
        ))}
      </section>

      <section className="mt-12 grid gap-6 md:grid-cols-2">
        <div className="card-surface rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-slate-900">Bureau</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {bureau.map((m) => (
              <li key={m.role}>
                <button
                  onClick={() => setOpenBureau(openBureau === m.name ? null : m.name)}
                  className="w-full flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 transition hover:bg-slate-100"
                >
                  <span className="font-semibold text-slate-900">{m.role}</span>
                  <div className="flex items-center gap-2">
                    <span>{m.name}</span>
                    <span className="text-brand-primary">{openBureau === m.name ? '−' : '+'}</span>
                  </div>
                </button>
                {openBureau === m.name && (
                  <div className="mt-2 rounded-lg bg-slate-100 px-3 py-3">
                    <div className="flex items-start gap-3">
                      <img src={m.photo} alt={m.name} className="h-16 w-16 rounded-lg object-cover" />
                      <div>
                        <p className="font-semibold text-slate-900">{m.name}</p>
                        <p className="text-xs text-slate-600">{m.description}</p>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="card-surface rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-slate-900">Pôles</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {poles.map((pole) => (
              <li key={pole.name}>
                <button
                  onClick={() => setOpenPole(openPole === pole.name ? null : pole.name)}
                  className="w-full rounded-lg bg-slate-50 px-3 py-2 text-left transition hover:bg-slate-100"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700">
                      <span className="font-semibold text-slate-900">{pole.name}</span> — {pole.desc}
                    </span>
                    <span className="text-brand-primary">{openPole === pole.name ? '−' : '+'}</span>
                  </div>
                </button>
                {openPole === pole.name && (
                  <div className="mt-2 rounded-lg bg-slate-100 px-3 py-2">
                    <p className="mb-1 text-xs font-semibold text-slate-600">Membres :</p>
                    <ul className="space-y-1">
                      {pole.membres.map((membre) => (
                        <li key={membre.name}>
                          <button
                            onClick={() => setOpenMembre(openMembre === membre.name ? null : membre.name)}
                            className="w-full flex items-center justify-between text-xs text-slate-700 py-1 hover:text-slate-900 transition"
                          >
                            <span>{membre.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">{membre.role}</span>
                              <span className="text-brand-primary text-sm">{openMembre === membre.name ? '−' : '+'}</span>
                            </div>
                          </button>
                          {openMembre === membre.name && (
                            <div className="mt-1 rounded-lg bg-white px-2 py-2">
                              <div className="flex items-start gap-2">
                                {membre.photo ? (
                                  <img src={membre.photo} alt={membre.name} className="h-12 w-12 rounded-lg object-cover" />
                                ) : (
                                  <div className="h-12 w-12 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-semibold">
                                    {membre.name.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold text-slate-900 text-xs">{membre.name}</p>
                                  <p className="text-[10px] text-slate-600">{membre.description ?? 'Profil à venir'}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-12 grid gap-8 md:grid-cols-[1fr_1.2fr]">
        <div className="card-surface rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-slate-900">Nos missions</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li>• Encadrer des équipes étudiantes en ligues universitaires et circuits open.</li>
            <li>• Organiser des tournois internes, LANs et viewing parties.</li>
            <li>• Former des bénévoles aux rôles staff : cast, analyse, production, event.</li>
            <li>• Nouer des partenariats pour l’accès au matériel et aux opportunités métier.</li>
          </ul>
        </div>
        <div className="card-surface rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-slate-900">Moments clés</h3>
          <ol className="mt-4 space-y-4">
            {milestones.map((m) => (
              <li key={m.year} className="border-l-2 border-brand-primary/30 pl-4">
                <p className="text-xs font-semibold uppercase text-brand-primary">{m.year}</p>
                <p className="text-sm text-slate-700">{m.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="mt-12 flex flex-wrap gap-4 rounded-2xl bg-gradient-to-r from-brand-primary to-[#102d47] px-6 py-6 text-white">
        <div>
          <h3 className="text-xl font-semibold">Envie de t’impliquer ?</h3>
          <p className="text-sm text-white/80">Staff, bénévolat événementiel, ou première expérience compétitive.</p>
        </div>
        <div className="flex gap-3">
          <Link href="https://discord.gg/gbnWXxxkqK" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-brand-primary" target="_blank" rel="noopener noreferrer">
            Nous contacter
          </Link>
          <Link href="mailto:contact@paris1esport.fr" className="rounded-full border border-white/40 px-5 py-3 text-sm font-semibold text-white">
            contact@paris1esport.fr
          </Link>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white px-6 py-6">
        <h3 className="text-lg font-semibold text-slate-900">Formulaire de contact</h3>
        <p className="text-sm text-slate-700">Envoyez-nous un message, on revient vers vous rapidement.</p>
        <form className="mt-4 grid gap-3 md:grid-cols-2" action="mailto:contact@paris1esport.fr" method="POST" encType="text/plain">
          <input name="nom" placeholder="Votre nom" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
          <input name="email" placeholder="Votre email" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
          <input name="sujet" placeholder="Sujet" className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
          <textarea name="message" placeholder="Message" rows={4} className="rounded-lg border border-slate-200 px-3 py-2 text-sm md:col-span-2" required />
          <button type="submit" className="md:col-span-2 rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-brand-primary/20">
            Envoyer
          </button>
        </form>
      </div>
    </div>
  );
}
