import { promises as fs } from 'fs';
import path from 'path';
import { ManagedPublicationsSettings } from '@/lib/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const PUBLICATIONS_FILE = path.join(DATA_DIR, 'publications.json');

const DEFAULT_SETTINGS: ManagedPublicationsSettings = {
  instagramPostUrl: 'https://www.instagram.com/p/DT-0LasDZD3/',
  youtubeChannelUrl: 'https://www.youtube.com/@Paris1Esport',
  youtubeVideoUrl: '',
  discordChannelId: '1441202718956851220',
  discordInviteUrl: 'https://discord.gg/gbnWXxxkqK',
  discordPatchNotes: [
    {
      id: 'patch-1-0',
      title: 'Patch note 1.0',
      date: '21/11/2025',
      content: [
        'Organisation du serveur: création des rôles bureau (président, vice-président, trésorier, etc.).',
        'Création de nouveaux rôles/salons jeux et FAQ.',
        'Contacts référents: LoL (Kalenz) et FGC (Serio).'
      ]
    },
    {
      id: 'patch-1-1',
      title: 'Patch note 1.1',
      date: '23/11/2025',
      content: [
        'Annonce officielle du bureau et ajout des rôles/salons TFT et Overwatch.',
        'Ajout des campus et réorganisation esthétique du serveur.',
        'Ajout d’une référente VSS (Marylou) et rappel des salons FAQ/Suggestions.'
      ]
    },
    {
      id: 'patch-1-2',
      title: 'Patch note 1.2',
      date: '01/12/2025',
      content: [
        'Association officiellement créée, démarches d’affiliation Paris 1 en cours.',
        '400 membres sur Discord et recrutements ouverts (Graphiste, Event, Communication, Partenariats).',
        'Refonte des rôles/salons, nouvelles règles et notifications @Actus P1E / @Evenements.'
      ]
    },
    {
      id: 'patch-1-3',
      title: 'Patch note 1.3',
      date: '13/03/2026',
      content: [
        'Affiliation officielle Paris 1 + France Esport, demandes de subvention et premières adhésions.',
        'Lancement des réseaux sociaux et du site web, présence aux Matinales France Esport.',
        'Soirée du 10 février, table ronde en préparation, équipes LoL actives en Poroligue, recrutement ouvert.'
      ]
    }
  ]
};

async function ensureStoreFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(PUBLICATIONS_FILE);
  } catch {
    await fs.writeFile(PUBLICATIONS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
  }
}

export async function getPublicationsSettings(): Promise<ManagedPublicationsSettings> {
  await ensureStoreFile();
  const raw = await fs.readFile(PUBLICATIONS_FILE, 'utf-8');

  try {
    const parsed = JSON.parse(raw) as ManagedPublicationsSettings;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updatePublicationsSettings(
  patch: ManagedPublicationsSettings
): Promise<ManagedPublicationsSettings> {
  const current = await getPublicationsSettings();
  const next: ManagedPublicationsSettings = {
    ...current,
    ...patch
  };

  await fs.writeFile(PUBLICATIONS_FILE, JSON.stringify(next, null, 2), 'utf-8');
  return next;
}
