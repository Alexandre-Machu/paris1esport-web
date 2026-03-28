import { NextResponse } from 'next/server';
import { reorderManagedTeams } from '@/lib/teamStore';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type ReorderPayload = {
  game?: string;
  orderedIds?: string[];
};

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as ReorderPayload;

    if (!body.game?.trim() || !Array.isArray(body.orderedIds)) {
      return NextResponse.json({ error: 'game et orderedIds sont requis.' }, { status: 400 });
    }

    const success = await reorderManagedTeams(body.game.trim(), body.orderedIds);

    if (!success) {
      return NextResponse.json({ error: 'Réorganisation impossible.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur interne.' },
      { status: 500 }
    );
  }
}
