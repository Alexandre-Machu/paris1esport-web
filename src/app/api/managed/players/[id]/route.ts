import { NextResponse } from 'next/server';
import { updateManagedPlayer, deleteManagedPlayer, getPlayerById } from '@/lib/playerStore';
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

async function readApiError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const player = await getPlayerById(params.id);
    if (!player) {
      return NextResponse.json({ error: 'Joueur non trouvé.' }, { status: 404 });
    }
    return NextResponse.json(player, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error('[player GET]', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
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
    const updated = await updateManagedPlayer(params.id, {
      name: body.name.trim(),
      teamStatus: normalizedTeamStatus,
      role: body.role?.trim() || undefined,
      elo: body.elo?.trim() || undefined,
      opgg: body.opgg?.trim() || undefined,
      note: body.note?.trim() || undefined,
      favoriteChampion: resolvedChampion,
      twitter: body.twitter?.trim() || undefined,
      twitch: body.twitch?.trim() || undefined,
      instagram: body.instagram?.trim() || undefined,
      linkedin: body.linkedin?.trim() || undefined
    });

    if (!updated) {
      return NextResponse.json({ error: 'Joueur non trouvé.' }, { status: 404 });
    }

    revalidatePath('/admin/esport');
    revalidatePath('/teams');

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('[player PUT]', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const deleted = await deleteManagedPlayer(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Joueur non trouvé.' }, { status: 404 });
    }

    revalidatePath('/admin/esport');
    revalidatePath('/teams');

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[player DELETE]', error);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
