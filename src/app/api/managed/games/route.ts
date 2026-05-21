import { NextResponse } from 'next/server';
import { addManagedGame, getManagedGames, getManagedGamesWithTeamSize, updateGameTeamSize } from '@/lib/gameStore';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const withTeamSize = url.searchParams.get('withTeamSize') === 'true';

  if (withTeamSize) {
    const games = await getManagedGamesWithTeamSize();
    return NextResponse.json(games, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    });
  }

  const games = await getManagedGames();
  return NextResponse.json(games, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
    }
  });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const body = (await req.json()) as { name?: string };
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: 'Nom du jeu requis.' }, { status: 400 });
  }

  const games = await addManagedGame(name);
  return NextResponse.json(games);
}

export async function PUT(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const body = (await req.json()) as { gameName?: string; teamSize?: number };
  const gameName = body.gameName?.trim();
  const teamSize = body.teamSize;

  if (!gameName || teamSize === undefined || teamSize < 1) {
    return NextResponse.json({ error: 'gameName et teamSize (min 1) requis.' }, { status: 400 });
  }

  const updated = await updateGameTeamSize(gameName, teamSize);
  if (!updated) {
    return NextResponse.json({ error: 'Jeu non trouvé.' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
