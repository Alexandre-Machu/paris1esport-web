import { isAdminAuthenticated } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { canUseDatabase, markDatabaseFailure } from '@/lib/dataDir';

function normalizeCompetitionName(value: string | undefined) {
  return String(value || '').trim();
}

function mapNextMatches(
  nextMatches: Prisma.JsonValue | null,
  mapper: (competition: string | undefined) => string | undefined
): { nextMatches: Prisma.InputJsonValue; changed: boolean } | null {
  if (!Array.isArray(nextMatches)) {
    return null;
  }

  let changed = false;
  const mapped = nextMatches.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return entry;
    }

    const match = entry as Record<string, unknown>;
    const currentCompetition = normalizeCompetitionName(String(match.competition || '')) || undefined;
    const nextCompetition = mapper(currentCompetition);

    if (currentCompetition === nextCompetition) {
      return match;
    }

    changed = true;
    if (!nextCompetition) {
      const { competition, ...withoutCompetition } = match;
      return withoutCompetition;
    }

    return {
      ...match,
      competition: nextCompetition
    };
  });

  if (!changed) {
    return null;
  }

  return {
    nextMatches: mapped as Prisma.InputJsonValue,
    changed: true
  };
}

async function renameCompetitionInTeams(previousName: string, nextName: string) {
  const teams = await prisma.team.findMany({
    select: {
      id: true,
      nextMatches: true
    }
  });

  const updates = teams
    .map((team) => {
      const mapped = mapNextMatches(team.nextMatches, (competition) => {
        if (!competition) {
          return competition;
        }

        return competition === previousName ? nextName : competition;
      });

      if (!mapped?.changed) {
        return null;
      }

      return prisma.team.update({
        where: { id: team.id },
        data: { nextMatches: mapped.nextMatches }
      });
    })
    .filter((value): value is ReturnType<typeof prisma.team.update> => Boolean(value));

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }
}

async function removeCompetitionFromTeams(competitionToRemove: string) {
  const teams = await prisma.team.findMany({
    select: {
      id: true,
      nextMatches: true
    }
  });

  const updates = teams
    .map((team) => {
      const mapped = mapNextMatches(team.nextMatches, (competition) => {
        if (!competition) {
          return competition;
        }

        return competition === competitionToRemove ? undefined : competition;
      });

      if (!mapped?.changed) {
        return null;
      }

      return prisma.team.update({
        where: { id: team.id },
        data: { nextMatches: mapped.nextMatches }
      });
    })
    .filter((value): value is ReturnType<typeof prisma.team.update> => Boolean(value));

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }
}

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

export async function PUT(request: Request) {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canUseDatabase()) {
      return Response.json({ error: 'Database not available' }, { status: 503 });
    }

    const body = (await request.json()) as { name?: string; nextName?: string };
    const name = normalizeCompetitionName(body.name);
    const nextName = normalizeCompetitionName(body.nextName);

    if (!name || !nextName) {
      return Response.json({ error: 'Competition names required' }, { status: 400 });
    }

    if (name === nextName) {
      return Response.json({ name: nextName }, { status: 200 });
    }

    const existing = await prisma.competition.findUnique({ where: { name } });
    if (!existing) {
      return Response.json({ error: 'Competition not found' }, { status: 404 });
    }

    const conflict = await prisma.competition.findUnique({ where: { name: nextName } });
    if (conflict) {
      return Response.json({ error: 'Competition already exists' }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.competition.update({
        where: { name },
        data: { name: nextName }
      });
    });

    await renameCompetitionInTeams(name, nextName);
    return Response.json({ name: nextName }, { status: 200 });
  } catch (error) {
    console.error('[competitions API] PUT failed', error);
    markDatabaseFailure();
    return Response.json({ error: 'Failed to update competition' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authenticated = await isAdminAuthenticated();
    if (!authenticated) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canUseDatabase()) {
      return Response.json({ error: 'Database not available' }, { status: 503 });
    }

    const body = (await request.json()) as { name?: string };
    const name = normalizeCompetitionName(body.name);
    if (!name) {
      return Response.json({ error: 'Competition name required' }, { status: 400 });
    }

    const existing = await prisma.competition.findUnique({ where: { name } });
    if (!existing) {
      return Response.json({ error: 'Competition not found' }, { status: 404 });
    }

    await prisma.competition.delete({ where: { name } });
    await removeCompetitionFromTeams(name);

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[competitions API] DELETE failed', error);
    markDatabaseFailure();
    return Response.json({ error: 'Failed to delete competition' }, { status: 500 });
  }
}
