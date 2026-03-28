import { NextResponse } from 'next/server';
import { addManagedGame, getManagedGames } from '@/lib/gameStore';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
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
