import { NextResponse } from 'next/server';
import { addManagedTeam, getManagedTeams } from '@/lib/teamStore';
import { isAdminAuthenticated } from '@/lib/auth';
import type { UpcomingMatch, TwitchLink } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

type TeamPayload = {
  name?: string;
  game?: string;
  competition?: string;
  level?: string;
  record?: string;
  description?: string;
  playerIds?: string[];
  playerAssignments?: Array<{ id?: string; role?: string; isCaptain?: boolean }>;
  nextMatches?: UpcomingMatch[];
  twitchLinks?: TwitchLink[];
  multiopggUrl?: string;
};

function sanitizePlayerIds(playerIds: TeamPayload['playerIds']): string[] | undefined {
  if (!Array.isArray(playerIds)) {
    return undefined;
  }

  const cleaned = playerIds.map((id) => String(id || '').trim()).filter((id) => id.length > 0);
  return cleaned.length > 0 ? cleaned : undefined;
}

function sanitizeNextMatches(nextMatches: TeamPayload['nextMatches']): UpcomingMatch[] | undefined {
  if (!Array.isArray(nextMatches)) {
    return undefined;
  }

  const normalizeScore = (value: unknown): number | undefined => {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return undefined;
    }

    return Math.floor(parsed);
  };

  const cleaned = nextMatches
    .map((match) => ({
      id: String(match?.id || '').trim(),
      opponent: String(match?.opponent || '').trim(),
      datetime: String(match?.datetime || '').trim(),
      competition: String(match?.competition || '').trim() || undefined,
      stage: String(match?.stage || '').trim() || undefined,
      streamUrl: String(match?.streamUrl || '').trim() || undefined,
      teamScore: normalizeScore(match?.teamScore),
      opponentScore: normalizeScore(match?.opponentScore),
      mvp: String(match?.mvp || '').trim() || undefined,
      vodUrl: String(match?.vodUrl || '').trim() || undefined
    }))
    .filter((match) => match.id.length > 0 && match.opponent.length > 0 && match.datetime.length > 0);

  return cleaned.length > 0 ? cleaned : undefined;
}

function sanitizeTwitchLinks(links: TeamPayload['twitchLinks']): TwitchLink[] | undefined {
  if (!Array.isArray(links)) {
    return undefined;
  }

  const cleaned = links
    .map((link) => ({
      name: String(link?.name || '').trim(),
      url: String(link?.url || '').trim()
    }))
    .filter((link) => link.name.length > 0 && link.url.length > 0);

  return cleaned.length > 0 ? cleaned : undefined;
}

function sanitizePlayerAssignments(assignments: TeamPayload['playerAssignments']) {
  if (!Array.isArray(assignments)) return undefined;
  const cleaned = assignments
    .map((a) => ({ id: String(a?.id || '').trim(), role: String(a?.role || '').trim() || undefined, isCaptain: Boolean(a?.isCaptain) }))
    .filter((a) => a.id.length > 0);
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
    competition: body.competition?.trim() || undefined,
    level: body.level.trim(),
    record: body.record.trim(),
    description: body.description?.trim() || undefined,
    playerIds: sanitizePlayerIds(body.playerIds),
    playerAssignments: sanitizePlayerAssignments(body.playerAssignments),
    nextMatches: sanitizeNextMatches(body.nextMatches),
    twitchLinks: sanitizeTwitchLinks(body.twitchLinks),
    multiopggUrl: String(body.multiopggUrl || '').trim() || undefined
  });

  revalidatePath('/');
  revalidatePath('/teams');
  revalidatePath('/admin/esport');

  return NextResponse.json(created, { status: 201 });
}
