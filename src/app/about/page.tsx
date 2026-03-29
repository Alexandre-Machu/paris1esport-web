import Link from 'next/link';
import Image from 'next/image';
import type { DiscordPatchNote, ManagedOrgMember, ManagedPublicationsSettings } from '@/lib/types';
import { DEFAULT_ORG_MEMBERS, POLE_DESCRIPTIONS, POLE_LABELS } from '@/lib/orgDefaults';
import { getManagedOrgMembers } from '@/lib/orgStore';
import { getPublicationsSettings } from '@/lib/publicationsStore';

export const dynamic = 'force-dynamic';

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

const POLE_ORDER = ['Bureau Executif', 'Pole Esport', 'Pole Event', 'Pole Communication'];

function MemberCard({ member }: { member: ManagedOrgMember }) {
  return (
    <article className="card-surface rounded-2xl p-4 md:p-5">
      <div className="flex items-start gap-4">
        {member.photo ? (
          <Image
            src={member.photo}
            alt={member.name}
            width={96}
            height={96}
            className="h-20 w-20 rounded-xl object-cover md:h-24 md:w-24"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-200 text-lg font-semibold text-brand-primary md:h-24 md:w-24">
            {member.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <p className="font-display text-base font-semibold uppercase tracking-wide text-slate-900">{member.name}</p>
          <p className="text-sm font-semibold text-brand-primary">{member.role}</p>
          <p className="mt-2 text-sm text-slate-600">{member.description || 'Presentation a venir.'}</p>
        </div>
      </div>
    </article>
  );
}

export default async function AboutPage() {
  let managedMembers: ManagedOrgMember[] = DEFAULT_ORG_MEMBERS;
  let dynamicMilestones = milestones;

  try {
    managedMembers = await getManagedOrgMembers();
  } catch (error) {
    console.error('[about] Failed to load org members', error);
    managedMembers = DEFAULT_ORG_MEMBERS;
  }

  try {
    const settings = await getPublicationsSettings();
    const notes = Array.isArray(settings?.discordPatchNotes) ? settings.discordPatchNotes : [];
    if (notes.length > 0) {
      dynamicMilestones = buildMilestonesFromPatchNotes(notes);
    }
  } catch (error) {
    console.error('[about] Failed to load publications settings', error);
  }

  const visibleMembers = managedMembers.length > 0 ? managedMembers : DEFAULT_ORG_MEMBERS;
  const membersByPole = POLE_ORDER.map((pole) => ({
    pole,
    name: pole === 'Bureau Executif' ? 'Bureau Executif' : POLE_LABELS[pole] ?? pole,
    desc: pole === 'Bureau Executif' ? 'Pilotage strategique, administratif et financier.' : POLE_DESCRIPTIONS[pole] ?? '',
    members: visibleMembers.filter((member) => member.pole === pole)
  })).filter((entry) => entry.members.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
      <div className="mb-10 space-y-4">
        <p className="section-title text-[11px] font-semibold text-brand-primary">A propos</p>
        <h1 className="font-display text-4xl font-semibold text-slate-900 md:text-5xl">L&apos;association Paris 1 Esport</h1>
        <p className="max-w-3xl text-lg text-slate-600">
          Creee en novembre 2025, Paris 1 Esport rassemble les etudiant.e.s de P1 autour de League of Legends, d&apos;evenements
          campus et de roles staff. Objectif: apprendre, progresser, performer ensemble.
        </p>
        <div className="flex flex-wrap gap-3 text-sm text-slate-700">
          <span className="rounded-full border border-brand-primary/25 bg-brand-primary/10 px-3 py-2 font-semibold text-brand-primary">Association loi 1901</span>
          <span className="rounded-full border border-slate-300 bg-white px-3 py-2">Ouverte a tous niveaux</span>
          <span className="rounded-full border border-slate-300 bg-white px-3 py-2">Staff benevole encadrant</span>
        </div>
      </div>

      <section className="grid gap-6 md:grid-cols-3">
        {values.map((item) => (
          <div key={item.title} className="card-surface rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
          </div>
        ))}
      </section>

      <section className="mt-12 space-y-10">
        {membersByPole.map((entry) => (
          <div key={entry.pole}>
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-display text-2xl font-semibold text-slate-900 md:text-3xl">{entry.name}</p>
                <p className="text-sm text-slate-600">{entry.desc}</p>
              </div>
              <p className="text-xs uppercase tracking-[0.14em] text-brand-primary">{entry.members.length} membre(s)</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {entry.members.map((member) => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="mt-12 grid gap-8 md:grid-cols-[1fr_1.2fr]">
        <div className="card-surface rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-slate-900">Nos missions</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            <li>• Encadrer des equipes etudiantes en ligues universitaires et circuits open.</li>
            <li>• Organiser des tournois internes, LANs et viewing parties.</li>
            <li>• Former des benevoles aux roles staff: cast, analyse, production, event.</li>
            <li>• Nouer des partenariats pour l&apos;acces au materiel et aux opportunites metier.</li>
          </ul>
        </div>
        <div className="card-surface rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-slate-900">Moments cles</h3>
          <ol className="mt-4 space-y-4">
            {dynamicMilestones.map((m, index) => (
              <li key={`${m.year}-${index}`} className="border-l-2 border-brand-primary/40 pl-4">
                <p className="text-xs font-semibold uppercase text-brand-primary">{m.year}</p>
                <p className="text-sm text-slate-600">{m.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="mt-12 flex flex-wrap gap-4 rounded-2xl border border-cyan-300/25 bg-gradient-to-r from-[#103454] to-[#135969] px-6 py-6 text-white">
        <div>
          <h3 className="font-display text-xl font-semibold">Envie de t&apos;impliquer ?</h3>
          <p className="text-sm text-white/85">Staff, benevolat evenementiel, ou premiere experience competitive.</p>
        </div>
        <div className="flex gap-3">
          <Link href="https://discord.gg/gbnWXxxkqK" className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900" target="_blank" rel="noopener noreferrer">
            Nous contacter
          </Link>
          <Link href="mailto:contact@paris1esport.fr" className="rounded-full border border-white/40 px-5 py-3 text-sm font-semibold text-white">
            contact@paris1esport.fr
          </Link>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-300 bg-white px-6 py-6">
        <h3 className="text-lg font-semibold text-slate-900">Formulaire de contact</h3>
        <p className="text-sm text-slate-600">Envoyez-nous un message, on revient vers vous rapidement.</p>
        <form className="mt-4 grid gap-3 md:grid-cols-2" action="mailto:contact@paris1esport.fr" method="POST" encType="text/plain">
          <input name="nom" placeholder="Votre nom" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500" required />
          <input name="email" placeholder="Votre email" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500" required />
          <input name="sujet" placeholder="Sujet" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 md:col-span-2" />
          <textarea name="message" placeholder="Message" rows={4} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 md:col-span-2" required />
          <button type="submit" className="md:col-span-2 rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white">
            Envoyer
          </button>
        </form>
      </div>

    </div>
  );
}
