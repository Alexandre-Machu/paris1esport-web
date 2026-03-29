import { NextResponse } from 'next/server';
import { deleteManagedTeam, getManagedTeams, updateManagedTeam } from '@/lib/teamStore';
import { isAdminAuthenticated } from '@/lib/auth';
import type { TeamPlayer, UpcomingMatch } from '@/lib/types';

export const dynamic = 'force-dynamic';

type TeamPayload = {
  name?: string;
  game?: string;
  level?: string;
  record?: string;
  description?: string;
  players?: TeamPlayer[];
  nextMatches?: UpcomingMatch[];
};

function sanitizePlayers(players: TeamPayload['players']): TeamPlayer[] | undefined {
  if (!Array.isArray(players)) {
    return undefined;
  }

  const cleaned = players
    .map((player) => ({
      name: String(player?.name || '').trim(),
      role: String(player?.role || '').trim() || undefined,
      elo: String(player?.elo || '').trim() || undefined,
      opgg: String(player?.opgg || '').trim() || undefined,
      note: String(player?.note || '').trim() || undefined,
      favoriteChampion: String(player?.favoriteChampion || '').trim() || undefined
    }))
    .filter((player) => player.name.length > 0);

  return cleaned.length > 0 ? cleaned : undefined;
}

function sanitizeNextMatches(nextMatches: TeamPayload['nextMatches']): UpcomingMatch[] | undefined {
  if (!Array.isArray(nextMatches)) {
    return undefined;
  }

  const cleaned = nextMatches
    .map((match) => ({
      id: String(match?.id || '').trim(),
      opponent: String(match?.opponent || '').trim(),
      datetime: String(match?.datetime || '').trim(),
      competition: String(match?.competition || '').trim() || undefined,
      stage: String(match?.stage || '').trim() || undefined,
      streamUrl: String(match?.streamUrl || '').trim() || undefined
    }))
    .filter((match) => match.id.length > 0 && match.opponent.length > 0 && match.datetime.length > 0);

  return cleaned.length > 0 ? cleaned : undefined;
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const body = (await req.json()) as TeamPayload;
  if (!body.name?.trim() || !body.game?.trim() || !body.level?.trim() || !body.record?.trim()) {
    return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 });
  }

  const updated = await updateManagedTeam(params.id, {
    name: body.name.trim(),
    game: body.game.trim(),
    level: body.level.trim(),
    record: body.record.trim(),
    description: body.description?.trim() || undefined,
    players: sanitizePlayers(body.players),
    nextMatches: sanitizeNextMatches(body.nextMatches)
  });

  if (!updated) {
    return NextResponse.json({ error: 'Équipe introuvable.' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const removed = await deleteManagedTeam(params.id);
  if (!removed) {
    return NextResponse.json({ error: 'Équipe introuvable.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const teams = await getManagedTeams();
  const team = teams.find((item) => item.id === params.id);
  if (!team) {
    return NextResponse.json({ error: 'Équipe introuvable.' }, { status: 404 });
  }
  return NextResponse.json(team);
}
