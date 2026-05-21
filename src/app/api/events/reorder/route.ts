import { NextResponse } from 'next/server';
import { reorderEvents } from '@/lib/eventStore';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { orderedIds?: string[] };

    if (!Array.isArray(body.orderedIds) || body.orderedIds.length === 0) {
      return NextResponse.json({ error: 'orderedIds manquant.' }, { status: 400 });
    }

    const success = await reorderEvents(body.orderedIds);

    if (!success) {
      return NextResponse.json({ error: 'Réorganisation échouée.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'Stockage indisponible. Verifiez DATABASE_URL.' },
      { status: 500 }
    );
  }
}
