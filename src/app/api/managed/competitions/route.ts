import { isAdminAuthenticated } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { canUseDatabase, markDatabaseFailure } from '@/lib/dataDir';

const ALLOWED_STATUSES = new Set(['upcoming', 'active', 'completed']);

function normalizeCompetitionName(value: string | undefined) {
  return String(value || '').trim();
}

function normalizeOptionalText(value: string | undefined) {
  const cleaned = String(value || '').trim();
  return cleaned || undefined;
}

function normalizeCompetitionStatus(value: string | undefined) {
  const cleaned = String(value || '').trim().toLowerCase();
  if (!cleaned) {
    return 'upcoming';
  }

  return ALLOWED_STATUSES.has(cleaned) ? cleaned : null;
}

function parseDateInput(value: string | undefined) {
  const cleaned = String(value || '').trim();
  if (!cleaned) {
    return undefined;
  }

  const date = new Date(cleaned);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function toNextMatchesInput(
  value: Prisma.JsonValue | null | undefined
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === null) {
    return Prisma.DbNull;
  }

  if (value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

function toCompetitionDto(competition: {
  id: string;
  name: string;
  status?: string | null;
  description?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  bracketUrl?: string | null;
  infoUrl?: string | null;
  createdAt: Date;
}) {
  return {
    id: competition.id,
    name: competition.name,
    status: competition.status || 'upcoming',
    description: competition.description || undefined,
    startDate: competition.startDate?.toISOString(),
    endDate: competition.endDate?.toISOString(),
    bracketUrl: competition.bracketUrl || undefined,
    infoUrl: competition.infoUrl || undefined,
    createdAt: competition.createdAt.toISOString()
  };
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
      competition: true,
      nextMatches: true
    }
  });

  const updates: Array<ReturnType<typeof prisma.team.update>> = teams
    .map((team) => {
      const mapped = mapNextMatches(team.nextMatches, (competition) => {
        if (!competition) {
          return competition;
        }

        return competition === previousName ? nextName : competition;
      });

      const shouldUpdateTeamCompetition = normalizeCompetitionName(team.competition || '') === previousName;
      const shouldUpdateMatches = Boolean(mapped?.changed);

      if (!shouldUpdateTeamCompetition && !shouldUpdateMatches) {
        return null;
      }

      return prisma.team.update({
        where: { id: team.id },
        data: {
          competition: shouldUpdateTeamCompetition ? nextName : team.competition,
          nextMatches: shouldUpdateMatches
            ? mapped!.nextMatches
            : toNextMatchesInput(team.nextMatches)
        }
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
      competition: true,
      nextMatches: true
    }
  });

  const updates: Array<ReturnType<typeof prisma.team.update>> = teams
    .map((team) => {
      const mapped = mapNextMatches(team.nextMatches, (competition) => {
        if (!competition) {
          return competition;
        }

        return competition === competitionToRemove ? undefined : competition;
      });

      const shouldClearTeamCompetition = normalizeCompetitionName(team.competition || '') === competitionToRemove;
      const shouldUpdateMatches = Boolean(mapped?.changed);

      if (!shouldClearTeamCompetition && !shouldUpdateMatches) {
        return null;
      }

      return prisma.team.update({
        where: { id: team.id },
        data: {
          competition: shouldClearTeamCompetition ? null : team.competition,
          nextMatches: shouldUpdateMatches
            ? mapped!.nextMatches
            : toNextMatchesInput(team.nextMatches)
        }
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
      select: {
        id: true,
        name: true,
        status: true,
        description: true,
        startDate: true,
        endDate: true,
        bracketUrl: true,
        infoUrl: true,
        createdAt: true
      },
      orderBy: [{ startDate: 'desc' }, { name: 'asc' }]
    });

    return Response.json(competitions.map(toCompetitionDto));
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

    const body = (await request.json()) as {
      name?: string;
      status?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      bracketUrl?: string;
      infoUrl?: string;
    };
    const name = normalizeCompetitionName(body.name);
    const status = normalizeCompetitionStatus(body.status);
    const description = normalizeOptionalText(body.description);
    const bracketUrl = normalizeOptionalText(body.bracketUrl);
    const infoUrl = normalizeOptionalText(body.infoUrl);
    const startDate = parseDateInput(body.startDate);
    const endDate = parseDateInput(body.endDate);

    if (!name) {
      return Response.json({ error: 'Competition name required' }, { status: 400 });
    }

    if (!status) {
      return Response.json({ error: 'Invalid competition status' }, { status: 400 });
    }

    if (startDate === null || endDate === null) {
      return Response.json({ error: 'Invalid competition date format' }, { status: 400 });
    }

    const existing = await prisma.competition.findUnique({
      where: { name }
    });

    if (existing) {
      return Response.json({ error: 'Competition already exists' }, { status: 409 });
    }

    const created = await prisma.competition.create({
      data: {
        name,
        status,
        description: description || null,
        startDate: startDate || null,
        endDate: endDate || null,
        bracketUrl: bracketUrl || null,
        infoUrl: infoUrl || null
      }
    });

    return Response.json(toCompetitionDto(created));
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

    const body = (await request.json()) as {
      id?: string;
      name?: string;
      nextName?: string;
      status?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      bracketUrl?: string;
      infoUrl?: string;
    };

    const id = String(body.id || '').trim();
    const requestedName = normalizeCompetitionName(body.name);
    const requestedNextName = normalizeCompetitionName(body.nextName);
    const nextName = requestedNextName || requestedName;
    const status = normalizeCompetitionStatus(body.status);
    const description = normalizeOptionalText(body.description);
    const bracketUrl = normalizeOptionalText(body.bracketUrl);
    const infoUrl = normalizeOptionalText(body.infoUrl);
    const startDate = parseDateInput(body.startDate);
    const endDate = parseDateInput(body.endDate);

    if (!id || !nextName) {
      return Response.json({ error: 'Competition id and name required' }, { status: 400 });
    }

    if (!status) {
      return Response.json({ error: 'Invalid competition status' }, { status: 400 });
    }

    if (startDate === null || endDate === null) {
      return Response.json({ error: 'Invalid competition date format' }, { status: 400 });
    }

    const existing = await prisma.competition.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: 'Competition not found' }, { status: 404 });
    }

    const conflict = await prisma.competition.findFirst({
      where: {
        name: nextName,
        NOT: { id }
      },
      select: { id: true }
    });
    if (conflict) {
      return Response.json({ error: 'Competition already exists' }, { status: 409 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      return tx.competition.update({
        where: { id },
        data: {
          name: nextName,
          status,
          description: description || null,
          startDate: startDate || null,
          endDate: endDate || null,
          bracketUrl: bracketUrl || null,
          infoUrl: infoUrl || null
        }
      });
    });

    if (existing.name !== nextName) {
      await renameCompetitionInTeams(existing.name, nextName);
    }

    return Response.json(toCompetitionDto(updated), { status: 200 });
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

    const body = (await request.json()) as { id?: string; name?: string };
    const id = String(body.id || '').trim();
    const name = normalizeCompetitionName(body.name);

    if (!id && !name) {
      return Response.json({ error: 'Competition id or name required' }, { status: 400 });
    }

    const existing = id
      ? await prisma.competition.findUnique({ where: { id } })
      : await prisma.competition.findUnique({ where: { name } });
    if (!existing) {
      return Response.json({ error: 'Competition not found' }, { status: 404 });
    }

    await prisma.competition.delete({ where: { id: existing.id } });
    await removeCompetitionFromTeams(existing.name);

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[competitions API] DELETE failed', error);
    markDatabaseFailure();
    return Response.json({ error: 'Failed to delete competition' }, { status: 500 });
  }
}
