import { isAdminAuthenticated } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canUseDatabase, markDatabaseFailure } from '@/lib/dataDir';

export async function GET() {
  try {
    if (!canUseDatabase()) {
      return Response.json([], { status: 200 });
    }

    const competitions = await prisma.competition.findMany({
      select: { name: true },
      orderBy: { name: 'asc' }
    });

    return Response.json(competitions.map((c) => c.name));
  } catch (error) {
    console.error('[competitions API] GET failed', error);
    markDatabaseFailure();
    return Response.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canUseDatabase()) {
      return Response.json({ error: 'Database not available' }, { status: 503 });
    }

    const body = (await request.json()) as { name?: string };
    const name = String(body.name || '').trim();

    if (!name) {
      return Response.json({ error: 'Competition name required' }, { status: 400 });
    }

    const existing = await prisma.competition.findUnique({
      where: { name }
    });

    if (existing) {
      return Response.json({ error: 'Competition already exists' }, { status: 409 });
    }

    const created = await prisma.competition.create({
      data: { name }
    });

    return Response.json(created);
  } catch (error) {
    console.error('[competitions API] POST failed', error);
    markDatabaseFailure();
    return Response.json({ error: 'Failed to create competition' }, { status: 500 });
  }
}
