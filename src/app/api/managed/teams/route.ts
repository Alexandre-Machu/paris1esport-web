import { NextResponse } from 'next/server';
import { addManagedTeam, getManagedTeams } from '@/lib/teamStore';
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

export async function GET() {
  const teams = await getManagedTeams();
  return NextResponse.json(teams, {
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const body = (await req.json()) as TeamPayload;
  if (!body.name?.trim() || !body.game?.trim() || !body.level?.trim() || !body.record?.trim()) {
    return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 });
  }

  const created = await addManagedTeam({
    name: body.name.trim(),
    game: body.game.trim(),
    level: body.level.trim(),
    record: body.record.trim(),
    description: body.description?.trim() || undefined,
    players: sanitizePlayers(body.players),
    nextMatches: sanitizeNextMatches(body.nextMatches)
  });

  return NextResponse.json(created, { status: 201 });
}
