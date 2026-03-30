import { getManagedTeams } from '@/lib/teamStore';
import type { UpcomingMatch } from '@/lib/types';
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

export default async function MatchesPage() {
  const allMatches = await buildMatches();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
      <MatchesHubClient matches={allMatches} />
    </div>
  );
}
