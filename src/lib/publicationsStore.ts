import { Prisma } from '@prisma/client';
import { ManagedPublicationsSettings } from '@/lib/types';
import { prisma } from '@/lib/prisma';

const PUBLICATIONS_SETTINGS_ID = 'default';

let dbSeedInitialized = false;

function toNullableJsonInput(value: ManagedPublicationsSettings['discordPatchNotes']) {
  return value ? (value as Prisma.InputJsonValue) : Prisma.DbNull;
}

const DEFAULT_SETTINGS: ManagedPublicationsSettings = {
  instagramPostUrl: 'https://www.instagram.com/p/DT-0LasDZD3/',
  youtubeChannelUrl: 'https://www.youtube.com/@Paris1Esport',
  youtubeVideoUrl: '',
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

function fromDbSettings(settings: {
  instagramPostUrl: string | null;
  youtubeChannelUrl: string | null;
  youtubeVideoUrl: string | null;
  discordInviteUrl: string | null;
  discordPatchNotes: Prisma.JsonValue | null;
  featuredEventId: string | null;
}): ManagedPublicationsSettings {
  return {
    instagramPostUrl: settings.instagramPostUrl || undefined,
    youtubeChannelUrl: settings.youtubeChannelUrl || undefined,
    youtubeVideoUrl: settings.youtubeVideoUrl || undefined,
    discordInviteUrl: settings.discordInviteUrl || undefined,
    discordPatchNotes: Array.isArray(settings.discordPatchNotes)
      ? (settings.discordPatchNotes as ManagedPublicationsSettings['discordPatchNotes'])
      : undefined,
    featuredEventId: settings.featuredEventId || undefined
  };
}

function normalizeSettings(input: ManagedPublicationsSettings): ManagedPublicationsSettings {
  return {
    instagramPostUrl: input.instagramPostUrl?.trim() || undefined,
    youtubeChannelUrl: input.youtubeChannelUrl?.trim() || undefined,
    youtubeVideoUrl: input.youtubeVideoUrl?.trim() || undefined,
    discordInviteUrl: input.discordInviteUrl?.trim() || undefined,
    discordPatchNotes: Array.isArray(input.discordPatchNotes) ? input.discordPatchNotes : undefined,
    featuredEventId: input.featuredEventId?.trim() || undefined
  };
}

async function ensureDbSeeded() {
  if (dbSeedInitialized) {
    return;
  }

  try {
    await prisma.publicationsSettings.upsert({
      where: { id: PUBLICATIONS_SETTINGS_ID },
      update: {},
      create: {
        id: PUBLICATIONS_SETTINGS_ID,
        instagramPostUrl: DEFAULT_SETTINGS.instagramPostUrl || null,
        youtubeChannelUrl: DEFAULT_SETTINGS.youtubeChannelUrl || null,
        youtubeVideoUrl: DEFAULT_SETTINGS.youtubeVideoUrl || null,
        discordInviteUrl: DEFAULT_SETTINGS.discordInviteUrl || null,
        discordPatchNotes: toNullableJsonInput(DEFAULT_SETTINGS.discordPatchNotes),
        featuredEventId: DEFAULT_SETTINGS.featuredEventId || null
      }
    });

    dbSeedInitialized = true;
  } catch {
    throw new Error('Base non initialisee. Executez npm run db:push apres avoir configure DATABASE_URL.');
  }
}

export async function getPublicationsSettings(): Promise<ManagedPublicationsSettings> {
  await ensureDbSeeded();
  const settings = await prisma.publicationsSettings.findUnique({
    where: { id: PUBLICATIONS_SETTINGS_ID }
  });

  if (!settings) {
    return DEFAULT_SETTINGS;
  }

  return {
    ...DEFAULT_SETTINGS,
    ...fromDbSettings(settings)
  };
}

export async function updatePublicationsSettings(
  patch: ManagedPublicationsSettings
): Promise<ManagedPublicationsSettings> {
  const current = await getPublicationsSettings();
  const next = normalizeSettings({
    ...current,
    ...patch
  });

  await ensureDbSeeded();
  const updated = await prisma.publicationsSettings.upsert({
    where: { id: PUBLICATIONS_SETTINGS_ID },
    update: {
      instagramPostUrl: next.instagramPostUrl || null,
      youtubeChannelUrl: next.youtubeChannelUrl || null,
      youtubeVideoUrl: next.youtubeVideoUrl || null,
      discordInviteUrl: next.discordInviteUrl || null,
      discordPatchNotes: toNullableJsonInput(next.discordPatchNotes),
      featuredEventId: next.featuredEventId || null
    },
    create: {
      id: PUBLICATIONS_SETTINGS_ID,
      instagramPostUrl: next.instagramPostUrl || null,
      youtubeChannelUrl: next.youtubeChannelUrl || null,
      youtubeVideoUrl: next.youtubeVideoUrl || null,
      discordInviteUrl: next.discordInviteUrl || null,
      discordPatchNotes: toNullableJsonInput(next.discordPatchNotes),
      featuredEventId: next.featuredEventId || null
    }
  });

  return {
    ...DEFAULT_SETTINGS,
    ...fromDbSettings(updated)
  };
}
