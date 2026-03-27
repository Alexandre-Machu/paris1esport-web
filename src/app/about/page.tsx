'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useEffect } from 'react';
import type { DiscordPatchNote, ManagedOrgMember, ManagedPublicationsSettings } from '@/lib/types';
import { DEFAULT_ORG_MEMBERS, POLE_DESCRIPTIONS, POLE_LABELS } from '@/lib/orgDefaults';

const values = [
  { title: 'Esprit campus', desc: 'Créer des ponts entre filières autour du jeu et de la compétition.' },
  { title: 'Progression', desc: 'Accompagnement des joueurs et des rôles staff (coaching, analyses, ateliers).' },
  { title: 'Ouverture', desc: 'Événements grand public, inclusivité et parité au sein des équipes.' }
];

const milestones = [
  { year: 'Nov. 2025', text: 'Création de Paris 1 Esport et premières équipes LoL.' },
  { year: 'Déc. 2025', text: 'Engagement en ligues (ex. Poro) et structuration des pôles event/communication.' }
];

function toDateValue(rawDate: string): number {
  const match = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return 0;
  }
  const [, day, month, year] = match;
  return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
}

function toMonthYearLabel(rawDate: string): string {
  const match = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return rawDate;
  }

  const months = ['Jan.', 'Fév.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sep.', 'Oct.', 'Nov.', 'Déc.'];
  const monthIndex = Number(match[2]) - 1;
  const year = match[3];
  const month = months[monthIndex] || match[2];
  return `${month} ${year}`;
}

function buildMilestoneText(note: DiscordPatchNote): string {
  const rankedKeywords = [
    'affiliation',
    'officielle',
    'subvention',
    'adhésion',
    'soirée',
    'événement',
    'poroligue',
    'réseaux sociaux',
    'site web',
    'recrutement',
    'membres'
  ];

  const importantLine = note.content.find((line) =>
    rankedKeywords.some((keyword) => line.toLowerCase().includes(keyword))
  );
  const fallback = note.content[0] || 'Mise à jour de l’association et de la communauté.';
  return `${note.title}: ${importantLine || fallback}`;
}

function buildMilestonesFromPatchNotes(notes: DiscordPatchNote[]) {
  return [...notes]
    .sort((a, b) => toDateValue(b.date) - toDateValue(a.date))
    .slice(0, 4)
    .map((note) => ({
      year: toMonthYearLabel(note.date),
      text: buildMilestoneText(note)
    }));
}

const POLE_ORDER = ['Pole Esport', 'Pole Event', 'Pole Communication'];

export default function AboutPage() {
  const [openPole, setOpenPole] = useState<string | null>(null);
  const [openBureau, setOpenBureau] = useState<string | null>(null);
  const [openMembre, setOpenMembre] = useState<string | null>(null);
  const [managedMembers, setManagedMembers] = useState<ManagedOrgMember[]>([]);
  const [dynamicMilestones, setDynamicMilestones] = useState(milestones);

  useEffect(() => {
    let mounted = true;

    fetch('/api/managed/org-members')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (mounted) {
          setManagedMembers(Array.isArray(data) ? data : DEFAULT_ORG_MEMBERS);
        }
      })
      .catch(() => {
        if (mounted) {
          setManagedMembers(DEFAULT_ORG_MEMBERS);
        }
      });

    fetch('/api/managed/publications')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ManagedPublicationsSettings | null) => {
        if (!mounted) {
          return;
        }
        const notes = Array.isArray(data?.discordPatchNotes) ? data.discordPatchNotes : [];
        if (notes.length > 0) {
          setDynamicMilestones(buildMilestonesFromPatchNotes(notes));
        }
      })
      .catch(() => {
        if (mounted) {
          setDynamicMilestones(milestones);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const visibleMembers = managedMembers.length > 0 ? managedMembers : DEFAULT_ORG_MEMBERS;
  const visibleBureau = visibleMembers.filter((member) => member.pole === 'Bureau Executif');
  const visiblePoles = POLE_ORDER.map((pole) => ({
    name: POLE_LABELS[pole] ?? pole,
    desc: POLE_DESCRIPTIONS[pole] ?? '',
    membres: visibleMembers.filter((member) => member.pole === pole)
  })).filter((pole) => pole.membres.length > 0);

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
          <h3 className="text-xl font-semibold text-slate-900">Bureau Executif</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {visibleBureau.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => setOpenBureau(openBureau === m.id ? null : m.id)}
                  className="w-full flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 transition hover:bg-slate-100"
                >
                  <span className="font-semibold text-slate-900">{m.role}</span>
                  <div className="flex items-center gap-2">
                    <span>{m.name}</span>
                    <span className="text-brand-primary">{openBureau === m.id ? '−' : '+'}</span>
                  </div>
                </button>
                {openBureau === m.id && (
                  <div className="mt-2 rounded-lg bg-slate-100 px-3 py-3">
                    <div className="flex items-start gap-3">
                      {m.photo ? (
                        <Image src={m.photo} alt={m.name} width={64} height={64} className="h-16 w-16 rounded-lg object-cover" />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-semibold">
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
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
            {visiblePoles.map((pole) => (
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
                        <li key={membre.id}>
                          <button
                            onClick={() => setOpenMembre(openMembre === membre.id ? null : membre.id)}
                            className="w-full flex items-center justify-between text-xs text-slate-700 py-1 hover:text-slate-900 transition"
                          >
                            <span>{membre.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500">{membre.role}</span>
                              <span className="text-brand-primary text-sm">{openMembre === membre.id ? '−' : '+'}</span>
                            </div>
                          </button>
                          {openMembre === membre.id && (
                            <div className="mt-1 rounded-lg bg-white px-2 py-2">
                              <div className="flex items-start gap-2">
                                {membre.photo ? (
                                  <Image
                                    src={membre.photo}
                                    alt={membre.name}
                                    width={48}
                                    height={48}
                                    className="h-12 w-12 rounded-lg object-cover"
                                  />
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
            {dynamicMilestones.map((m, index) => (
              <li key={`${m.year}-${index}`} className="border-l-2 border-brand-primary/30 pl-4">
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
