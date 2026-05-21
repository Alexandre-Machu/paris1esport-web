import { NextResponse } from 'next/server';
import { getManagedPlayers, addManagedPlayer } from '@/lib/playerStore';
import { isAdminAuthenticated } from '@/lib/auth';
import type { ManagedPlayer } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { resolveChampionName } from '@/lib/champions';

export const dynamic = 'force-dynamic';

type PlayerPayload = {
  name?: string;
  teamStatus?: string;
  role?: string;
  elo?: string;
  opgg?: string;
  note?: string;
  favoriteChampion?: string;
  discord?: string;
  twitter?: string;
  twitch?: string;
  instagram?: string;
  linkedin?: string;
};

function normalizeTeamStatus(value: string | undefined): 'captain' | 'sub' | undefined | null {
  const cleaned = String(value || '').trim().toLowerCase();
  if (!cleaned) {
    return undefined;
  }

  if (cleaned === 'captain' || cleaned === 'sub') {
    return cleaned;
  }

  return null;
}

export async function GET() {
  try {
    const players = await getManagedPlayers();
    return NextResponse.json(players, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error('[players GET]', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const body = (await req.json()) as PlayerPayload;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Le nom du joueur est requis.' }, { status: 400 });
  }

  const normalizedTeamStatus = normalizeTeamStatus(body.teamStatus);
  if (normalizedTeamStatus === null) {
    return NextResponse.json({ error: 'Statut joueur invalide.' }, { status: 400 });
  }

  const resolvedChampion = resolveChampionName(body.favoriteChampion);
  if (body.favoriteChampion?.trim() && !resolvedChampion) {
    return NextResponse.json({ error: 'Champion favori invalide.' }, { status: 400 });
  }

  try {
    const created = await addManagedPlayer({
      name: body.name.trim(),
      teamStatus: normalizedTeamStatus,
      role: body.role?.trim() || undefined,
      elo: body.elo?.trim() || undefined,
      opgg: body.opgg?.trim() || undefined,
      note: body.note?.trim() || undefined,
      favoriteChampion: resolvedChampion,
      discord: body.discord?.trim() || undefined,
      twitter: body.twitter?.trim() || undefined,
      twitch: body.twitch?.trim() || undefined,
      instagram: body.instagram?.trim() || undefined,
      linkedin: body.linkedin?.trim() || undefined
    });

    revalidatePath('/admin/esport');
    revalidatePath('/teams');

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[players POST]', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
