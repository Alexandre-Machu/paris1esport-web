import { getManagedTeams } from '@/lib/teamStore';
import type { ManagedCompetition, UpcomingMatch } from '@/lib/types';
import { canUseDatabase } from '@/lib/dataDir';
import { prisma } from '@/lib/prisma';
import MatchesHubClient, { type HubMatch } from './MatchesHubClient';

export const dynamic = 'force-dynamic';

function buildMatches(): Promise<HubMatch[]> {
  return getManagedTeams().then((teams) => {
    const allMatches: HubMatch[] = [];

    teams.forEach((team) => {
      (team.nextMatches || []).forEach((match) => {
        allMatches.push({
          ...match,
          teamId: team.id,
          teamName: team.name,
          teamGame: team.game
        });
      });
    });

    return allMatches;
  });
}

async function loadCompetitions(): Promise<ManagedCompetition[]> {
  if (!canUseDatabase()) {
    return [];
  }

  try {
    const competitions = (await prisma.competition.findMany({
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
    })) as Array<{
      id: string;
      name: string;
      status: string;
      description: string | null;
      startDate: Date | null;
      endDate: Date | null;
      bracketUrl: string | null;
      infoUrl: string | null;
      createdAt: Date;
    }>;

    return competitions.map((competition) => ({
      id: competition.id,
      name: competition.name,
      status: (competition.status || 'upcoming') as 'upcoming' | 'active' | 'completed',
      description: competition.description || undefined,
      startDate: competition.startDate?.toISOString(),
      endDate: competition.endDate?.toISOString(),
      bracketUrl: competition.bracketUrl || undefined,
      infoUrl: competition.infoUrl || undefined,
      createdAt: competition.createdAt.toISOString()
    }));
  } catch {
    return [];
  }
}

export default async function MatchesPage() {
  const [allMatches, competitions] = await Promise.all([buildMatches(), loadCompetitions()]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
      <MatchesHubClient matches={allMatches} competitions={competitions} />
    </div>
  );
}
