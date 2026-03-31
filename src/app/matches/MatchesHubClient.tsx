'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { UpcomingMatch } from '@/lib/types';

export type HubMatch = UpcomingMatch & {
  teamId: string;
  teamName: string;
  teamGame: string;
};

type ViewMode = 'all' | 'upcoming' | 'results';

function formatMatchDateTime(datetime: string): string {
  const parsed = new Date(datetime);
  if (Number.isNaN(parsed.getTime())) return datetime;
  return parsed.toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function isPast(datetime: string): boolean {
  const parsed = new Date(datetime);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() < Date.now();
}

function hasScore(match: HubMatch): boolean {
  return typeof match.teamScore === 'number' && typeof match.opponentScore === 'number';
}

function toParisDayKey(date: Date): string {
  return new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function isTodayInParis(datetime: string): boolean {
  const parsed = new Date(datetime);
  if (Number.isNaN(parsed.getTime())) return false;
  return toParisDayKey(parsed) === toParisDayKey(new Date());
}

function isUpcomingByRule(match: HubMatch): boolean {
  const parsed = new Date(match.datetime);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  if (parsed.getTime() >= Date.now()) {
    return true;
  }

  // Keep same-day matches visible until a score is entered.
  return isTodayInParis(match.datetime) && !hasScore(match);
}

function getStatus(match: HubMatch): { label: string; className: string } {
  if (isUpcomingByRule(match)) {
    return {
      label: 'A jouer',
      className: 'bg-slate-100 text-slate-700'
    };
  }

  if (!hasScore(match)) {
    return {
      label: 'Joue',
      className: 'bg-amber-100 text-amber-700'
    };
  }

  if ((match.teamScore || 0) > (match.opponentScore || 0)) {
    return {
      label: 'Victoire',
      className: 'bg-emerald-100 text-emerald-700'
    };
  }

  if ((match.teamScore || 0) < (match.opponentScore || 0)) {
    return {
      label: 'Defaite',
      className: 'bg-rose-100 text-rose-700'
    };
  }

  return {
    label: 'Nul',
    className: 'bg-blue-100 text-blue-700'
  };
}

function MatchCard({ match }: { match: HubMatch }) {
  const upcoming = isUpcomingByRule(match);
  const showScore = hasScore(match);
  const status = getStatus(match);

  return (
    <article className="card-surface rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-primary">{match.teamGame}</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">
            <span className="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">{match.teamName}</span>{' '}
            vs {match.opponent}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${status.className}`}>
            {status.label}
          </span>
          <Link
            href={`/teams?game=${encodeURIComponent(match.teamGame)}`}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-brand-primary hover:text-brand-primary"
          >
            Voir equipe
          </Link>
        </div>
      </div>

      <p className="mt-2 text-sm text-slate-600">{formatMatchDateTime(match.datetime)}</p>
      {(match.competition || match.stage) && (
        <p className="mt-1 text-xs text-slate-500">
          {match.competition || ''}
          {match.competition && match.stage ? ' - ' : ''}
          {match.stage || ''}
        </p>
      )}

      {showScore ? (
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
          <span>{match.teamScore}</span>
          <span>-</span>
          <span>{match.opponentScore}</span>
        </div>
      ) : (
        !upcoming && <p className="mt-3 text-xs text-slate-500">Score non renseigne.</p>
      )}

      {match.mvp && <p className="mt-2 text-sm text-slate-700">MVP: <span className="font-semibold">{match.mvp}</span></p>}

      <div className="mt-3 flex flex-wrap gap-3">
        {upcoming && match.streamUrl && (
          <Link
            href={match.streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-brand-primary hover:text-brand-secondary"
          >
            Suivre le stream -&gt;
          </Link>
        )}
        {!upcoming && match.vodUrl && (
          <Link
            href={match.vodUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-brand-primary hover:text-brand-secondary"
          >
            Voir la VOD/clip -&gt;
          </Link>
        )}
      </div>
    </article>
  );
}

export default function MatchesHubClient({ matches }: { matches: HubMatch[] }) {
  const [view, setView] = useState<ViewMode>('all');
  const [selectedGame, setSelectedGame] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedCompetition, setSelectedCompetition] = useState('all');

  const gameOptions = useMemo(
    () => Array.from(new Set(matches.map((match) => match.teamGame))).sort((a, b) => a.localeCompare(b)),
    [matches]
  );

  const teamOptions = useMemo(
    () => Array.from(new Set(matches.map((match) => match.teamName))).sort((a, b) => a.localeCompare(b)),
    [matches]
  );

  const competitionOptions = useMemo(
    () => Array.from(new Set(matches.map((match) => match.competition).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b)),
    [matches]
  );

  const baseFiltered = useMemo(
    () =>
      matches.filter((match) => {
        if (selectedGame !== 'all' && match.teamGame !== selectedGame) return false;
        if (selectedTeam !== 'all' && match.teamName !== selectedTeam) return false;
        if (selectedCompetition !== 'all' && (match.competition || '') !== selectedCompetition) return false;
        return true;
      }),
    [matches, selectedGame, selectedTeam, selectedCompetition]
  );

  const allCount = baseFiltered.length;
  const upcomingCount = baseFiltered.filter((match) => isUpcomingByRule(match)).length;
  const resultsCount = baseFiltered.filter((match) => !isUpcomingByRule(match)).length;

  const displayedMatches = useMemo(() => {
    const filteredByView = baseFiltered.filter((match) => {
      if (view === 'upcoming') return isUpcomingByRule(match);
      if (view === 'results') return !isUpcomingByRule(match);
      return true;
    });

    // Tri par date: plus récente en premier (décroissant pour tous les views)
    return filteredByView.sort((a, b) => {
      const left = new Date(a.datetime).getTime();
      const right = new Date(b.datetime).getTime();
      return right - left;
    });
  }, [baseFiltered, view]);

  const stats = useMemo(() => {
    const played = baseFiltered.filter((match) => isPast(match.datetime));
    const playedWithScore = played.filter((match) => hasScore(match));
    const wins = playedWithScore.filter((match) => (match.teamScore || 0) > (match.opponentScore || 0)).length;
    const winrate = playedWithScore.length > 0 ? Math.round((wins / playedWithScore.length) * 100) : 0;

    const mvpFrequency = played.reduce<Record<string, number>>((acc, match) => {
      if (!match.mvp) return acc;
      acc[match.mvp] = (acc[match.mvp] || 0) + 1;
      return acc;
    }, {});

    const topMvp = Object.entries(mvpFrequency).sort((a, b) => b[1] - a[1])[0];

    return {
      played: played.length,
      wins,
      winrate,
      topMvp: topMvp ? `${topMvp[0]} (${topMvp[1]})` : '-'
    };
  }, [baseFiltered]);

  return (
    <>
      <div className="mb-8 space-y-3">
        <p className="section-title text-[11px] font-semibold text-brand-primary">Competition</p>
        <h1 className="font-display text-4xl font-semibold text-slate-900">Hub matchs &amp; resultats</h1>
        <p className="max-w-3xl text-lg text-slate-600">
          Retrouve tout le calendrier des equipes, les scores, les MVP et les liens VOD/clip apres les rencontres.
        </p>
      </div>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-surface rounded-xl border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Matchs joues</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.played}</p>
        </div>
        <div className="card-surface rounded-xl border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Victoires</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">{stats.wins}</p>
        </div>
        <div className="card-surface rounded-xl border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Winrate</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.winrate}%</p>
        </div>
        <div className="card-surface rounded-xl border border-slate-200 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">MVP dominant</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{stats.topMvp}</p>
        </div>
      </section>

      <section className="card-surface mb-8 rounded-2xl border border-slate-200 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={selectedGame}
            onChange={(event) => setSelectedGame(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">Tous les jeux</option>
            {gameOptions.map((game) => (
              <option key={game} value={game}>
                {game}
              </option>
            ))}
          </select>

          <select
            value={selectedTeam}
            onChange={(event) => setSelectedTeam(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">Toutes les equipes</option>
            {teamOptions.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>

          <select
            value={selectedCompetition}
            onChange={(event) => setSelectedCompetition(event.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">Toutes les competitions</option>
            {competitionOptions.map((competition) => (
              <option key={competition} value={competition}>
                {competition}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView('all')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              view === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Tout ({allCount})
          </button>
          <button
            type="button"
            onClick={() => setView('upcoming')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              view === 'upcoming' ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            A venir ({upcomingCount})
          </button>
          <button
            type="button"
            onClick={() => setView('results')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              view === 'results' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Resultats ({resultsCount})
          </button>
        </div>
      </section>

      {displayedMatches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-5 text-sm text-slate-600">
          Aucun match pour ces filtres.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {displayedMatches.map((match) => (
            <MatchCard key={`${match.teamId}-${match.id}`} match={match} />
          ))}
        </div>
      )}
    </>
  );
}
