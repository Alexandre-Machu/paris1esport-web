import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import type { DiscordPatchNote, ManagedOrgMember, ManagedPublicationsSettings } from '@/lib/types';
import { DEFAULT_ORG_MEMBERS } from '@/lib/orgDefaults';
import { getManagedOrgMembers } from '@/lib/orgStore';
import { getManagedOrgPoles } from '@/lib/orgPoleStore';
import { getManagedOrgContentSettings } from '@/lib/orgContentStore';
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

function splitContentBlocks(rawContent: string): string[] {
  const normalized = rawContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const blocks: string[] = [];
  let currentBlock: string[] = [];

  for (const line of lines) {
    if (line.trim().length === 0) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock.join('\n').trim());
        currentBlock = [];
      }
      continue;
    }

    currentBlock.push(line);
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join('\n').trim());
  }

  return blocks.filter(Boolean);
}

function renderInlineFormatting(text: string): ReactNode[] {
  const chunks = text.split(/(\*\*[^*]+\*\*|~~[^~]+~~|\+\+[^+]+\+\+)/g);

  return chunks.map((chunk, index) => {
    if (chunk.startsWith('**') && chunk.endsWith('**') && chunk.length > 4) {
      return <strong key={`bold-${index}`}>{chunk.slice(2, -2)}</strong>;
    }

    if (chunk.startsWith('~~') && chunk.endsWith('~~') && chunk.length > 4) {
      return <s key={`strike-${index}`}>{chunk.slice(2, -2)}</s>;
    }

    if (chunk.startsWith('++') && chunk.endsWith('++') && chunk.length > 4) {
      return <u key={`underline-${index}`}>{chunk.slice(2, -2)}</u>;
    }

    return <span key={`text-${index}`}>{chunk}</span>;
  });
}

function renderDescriptionBlock(block: string, key: string): ReactNode {
  const trimmed = block.trim();

  if (trimmed.startsWith('### ')) {
    return <h4 key={key} className="text-sm font-semibold text-slate-800">{renderInlineFormatting(trimmed.slice(4))}</h4>;
  }

  if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
    const title = trimmed.startsWith('## ') ? trimmed.slice(3) : trimmed.slice(2);
    return <h3 key={key} className="text-base font-semibold text-slate-800">{renderInlineFormatting(title)}</h3>;
  }

  const lines = trimmed.split('\n').filter((line) => line.trim().length > 0);

  return (
    <p key={key}>
      {lines.map((line, index) => (
        <span key={`${key}-line-${index}`}>
          {index > 0 && <br />}
          {renderInlineFormatting(line)}
        </span>
      ))}
    </p>
  );
}

function renderMemberDescription(description?: string): ReactNode {
  if (!description?.trim()) {
    return <p className="mt-2 text-sm text-slate-600">Presentation a venir.</p>;
  }

  const blocks = splitContentBlocks(description);
  return (
    <div className="mt-2 text-sm leading-7 text-slate-600">
      {blocks.map((block, index) => (
        <div key={`member-description-block-${index}`} className="mb-4 last:mb-0">
          {renderDescriptionBlock(block, `member-description-${index}`)}
        </div>
      ))}
    </div>
  );
}

function normalizeExternalUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M6.94 8.5v9H4.06v-9h2.88ZM5.5 7.28a1.67 1.67 0 1 1 0-3.34 1.67 1.67 0 0 1 0 3.34ZM20 12.04v5.46h-2.88v-5.05c0-1.27-.46-2.14-1.6-2.14-.87 0-1.4.6-1.63 1.17-.08.21-.11.5-.11.79v5.23h-2.88s.04-8.48 0-9h2.88v1.28c.38-.59 1.08-1.43 2.62-1.43 1.91 0 3.6 1.25 3.6 3.69Z" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.9-6.46L6.4 22H3.3l7.23-8.27L1.2 2h6.4l4.43 5.85L18.9 2Zm-1.1 18h1.73L6.7 3.9H4.85L17.8 20Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5Zm9.15 1.35a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8A3.2 3.2 0 1 0 12 15.2a3.2 3.2 0 0 0 0-6.4Z" />
    </svg>
  );
}

function TwitchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M3 2h18v12l-4 4h-4l-3 3H7v-3H3V2Zm1.8 1.8v12.4h3.6V19l2.56-2.8h5.29l2.95-2.95V3.8H4.8Zm9 3h1.8v4.8h-1.8V6.8Zm-4.8 0h1.8v4.8H9V6.8Z" />
    </svg>
  );
}

function MemberSocialLinks({ member, className = '' }: { member: ManagedOrgMember; className?: string }) {
  const socials = [
    {
      key: 'linkedin',
      label: 'LinkedIn',
      href: member.linkedin ? normalizeExternalUrl(member.linkedin) : '',
      icon: <LinkedinIcon />
    },
    {
      key: 'twitter',
      label: 'Twitter',
      href: member.twitter ? normalizeExternalUrl(member.twitter) : '',
      icon: <TwitterIcon />
    },
    {
      key: 'instagram',
      label: 'Instagram',
      href: member.instagram ? normalizeExternalUrl(member.instagram) : '',
      icon: <InstagramIcon />
    },
    {
      key: 'twitch',
      label: 'Twitch',
      href: member.twitch ? normalizeExternalUrl(member.twitch) : '',
      icon: <TwitchIcon />
    }
  ].filter((social) => social.href.length > 0);

  if (socials.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {socials.map((social) => (
        <a
          key={`${member.id}-${social.key}`}
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${social.label} de ${member.name}`}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-slate-700 transition hover:border-brand-primary hover:text-brand-primary"
        >
          {social.icon}
        </a>
      ))}
    </div>
  );
}

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
          <div className="flex items-start justify-between gap-3">
            <p className="font-display text-base font-semibold uppercase tracking-wide text-slate-900">{member.name}</p>
            <MemberSocialLinks member={member} className="shrink-0" />
          </div>
          <p className="text-sm font-semibold text-brand-primary">{member.role}</p>
          {renderMemberDescription(member.description)}
        </div>
      </div>
    </article>
  );
}

export default async function AboutPage() {
  let managedMembers: ManagedOrgMember[] = DEFAULT_ORG_MEMBERS;
  let managedPoles: string[] = [];
  let dynamicMilestones = milestones;
  let aboutDescription =
    'Creee en novembre 2025, Paris 1 Esport rassemble les etudiant.e.s de P1 autour de League of Legends, d\'evenements campus et de roles staff. Objectif: apprendre, progresser, performer ensemble.';
  let poleDescriptions: Record<string, string> = {
    'Bureau Executif': 'Pilotage strategique, administratif et financier.'
  };

  try {
    managedMembers = await getManagedOrgMembers();
  } catch (error) {
    console.error('[about] Failed to load org members', error);
    managedMembers = DEFAULT_ORG_MEMBERS;
  }

  try {
    managedPoles = await getManagedOrgPoles();
  } catch (error) {
    console.error('[about] Failed to load org poles', error);
    managedPoles = [];
  }

  try {
    const settings = await getManagedOrgContentSettings();
    if (settings.aboutDescription?.trim()) {
      aboutDescription = settings.aboutDescription;
    }

    if (settings.poleDescriptions && typeof settings.poleDescriptions === 'object') {
      poleDescriptions = {
        ...poleDescriptions,
        ...settings.poleDescriptions
      };
    }
  } catch (error) {
    console.error('[about] Failed to load org content settings', error);
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
  const normalizedKey = (value: string) => value.trim().toLowerCase();
  const groupedMembers = new Map<string, { pole: string; members: ManagedOrgMember[] }>();

  for (const member of visibleMembers) {
    const key = normalizedKey(member.pole);
    if (!key) {
      continue;
    }

    const existing = groupedMembers.get(key);
    if (existing) {
      existing.members.push(member);
      continue;
    }

    groupedMembers.set(key, { pole: member.pole.trim(), members: [member] });
  }

  for (const group of groupedMembers.values()) {
    group.members.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  const orderedPoleKeys: string[] = [];
  const orderedPoleLabels: Record<string, string> = {};
  for (const pole of managedPoles) {
    const key = normalizedKey(pole);
    if (!key || orderedPoleKeys.includes(key)) {
      continue;
    }

    orderedPoleKeys.push(key);
    orderedPoleLabels[key] = pole;
  }

  for (const group of groupedMembers.values()) {
    const key = normalizedKey(group.pole);
    if (orderedPoleKeys.includes(key)) {
      continue;
    }

    orderedPoleKeys.push(key);
    orderedPoleLabels[key] = group.pole;
  }

  const membersByPole = orderedPoleKeys
    .map((key) => {
      const group = groupedMembers.get(key);
      if (!group || group.members.length === 0) {
        return null;
      }

      const displayPole = orderedPoleLabels[key] || group.pole;

      return {
        pole: displayPole,
        name: displayPole,
        desc: poleDescriptions[displayPole] || '',
        members: group.members
      };
    })
    .filter((entry): entry is { pole: string; name: string; desc: string; members: ManagedOrgMember[] } => Boolean(entry));

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
      <div className="mb-10 space-y-4">
        <p className="section-title text-[11px] font-semibold text-brand-primary">A propos</p>
        <h1 className="font-display text-4xl font-semibold text-slate-900 md:text-5xl">L&apos;association Paris 1 Esport</h1>
        <p className="max-w-3xl text-lg text-slate-600">
          {aboutDescription}
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
