'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import type { ManagedTeamItem, UpcomingMatch } from '@/lib/types';

const DDRAGON_VERSION = process.env.NEXT_PUBLIC_DDRAGON_VERSION || '15.20.1';

function gameKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectInitialGame(games: string[]): string {
  if (typeof window === 'undefined') return games[0] || 'League Of Legends';
  const params = new URL(window.location.href).searchParams;
  const selected = params.get('game');
  if (selected) {
    const selectedKey = gameKey(selected);
    const exact = games.find((game) => gameKey(game) === selectedKey);
    if (exact) {
      return exact;
    }
  }
  return games[0] || 'League Of Legends';
}

function isLeagueOfLegends(game: string): boolean {
  return gameKey(game) === gameKey('League of Legends');
}

function toChampionAssetKey(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '');
}

function getChampionIconUrl(championKey: string): string {
  return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${championKey}.png`;
}

type CompetitionStats = {
  [competition: string]: {
    wins: number;
    losses: number;
    winrate: number;
  };
};

function calculateCompetitionStats(matches: UpcomingMatch[] | undefined): CompetitionStats {
  if (!matches) return {};

  const stats: CompetitionStats = {};

  matches.forEach((match) => {
    // Vérifier que le match est passé (a un score)
    if (typeof match.teamScore === 'number' && typeof match.opponentScore === 'number') {
      const competition = match.competition || 'Autres';
      
      if (!stats[competition]) {
        stats[competition] = { wins: 0, losses: 0, winrate: 0 };
      }

      if (match.teamScore > match.opponentScore) {
        stats[competition].wins++;
      } else {
        stats[competition].losses++;
      }
    }
  });

  // Calculer les winrates
  Object.keys(stats).forEach((competition) => {
    const { wins, losses } = stats[competition];
    const total = wins + losses;
    stats[competition].winrate = total > 0 ? wins / total : 0;
  });

  return stats;
}

function ChampionIcon({ champion, playerName }: { champion: string; playerName: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-slate-800 text-[10px] font-semibold text-slate-200">
        ?
      </span>
    );
  }

  return (
    <Image
      src={getChampionIconUrl(toChampionAssetKey(champion))}
      alt={`Champion préféré de ${playerName}: ${champion}`}
      width={24}
      height={24}
      className="h-6 w-6 rounded object-cover"
      unoptimized
      onError={() => setHasError(true)}
    />
  );
}

function normalizeRoleKey(value?: string): 'top' | 'jungle' | 'mid' | 'bot' | 'support' | null {
  if (!value) return null;
  const cleaned = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  if (['top', 'toplane', 't'].includes(cleaned)) return 'top';
  if (['jungle', 'jungler', 'jgl', 'jg'].includes(cleaned)) return 'jungle';
  if (['mid', 'middle', 'midlane', 'm'].includes(cleaned)) return 'mid';
  if (['bot', 'bottom', 'botlane', 'adc', 'marksman'].includes(cleaned)) return 'bot';
  if (['support', 'sup', 'supp'].includes(cleaned)) return 'support';

  return null;
}

function getRoleIconUrl(role?: string): string | null {
  const key = normalizeRoleKey(role);
  return key ? `/roles/${key}.svg` : null;
}

function getEloIconPath(elo?: string): string | null {
  if (!elo) return null;
  const normalized = elo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalized.includes('challenger')) return '/elo/challenger.svg';
  if (normalized.includes('grandmaster')) return '/elo/grandmaster.svg';
  if (normalized.includes('master')) return '/elo/master.svg';
  if (normalized.includes('diamond')) return '/elo/diamond.svg';
  if (normalized.includes('emeraude') || normalized.includes('emerald')) return '/elo/emerald.svg';
  if (normalized.includes('platine') || normalized.includes('platinum')) return '/elo/platinum.svg';
  if (normalized.includes('gold')) return '/elo/gold.svg';
  if (normalized.includes('silver')) return '/elo/silver.svg';
  if (normalized.includes('bronze')) return '/elo/bronze.svg';
  if (normalized.includes('iron') || normalized.includes('fer')) return '/elo/iron.svg';
  return null;
}

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

export default function TeamsPage() {
  const [teams, setTeams] = useState<ManagedTeamItem[]>([]);
  const [games, setGames] = useState<string[]>([]);
  const [openGame, setOpenGame] = useState('League Of Legends');

  async function loadTeams() {
    const res = await fetch('/api/managed/teams', { cache: 'no-store' });
    const data = (await res.json()) as ManagedTeamItem[];
    setTeams(Array.isArray(data) ? data : []);
  }

  async function loadGames() {
    const res = await fetch('/api/managed/games');
    const data = (await res.json()) as string[];
    const normalized = Array.isArray(data) ? data : [];
    setGames(normalized);
    setOpenGame((current) => {
      const currentKey = gameKey(current);
      const existing = normalized.find((game) => gameKey(game) === currentKey);
      return existing || detectInitialGame(normalized);
    });
  }

  useEffect(() => {
    loadTeams().catch(() => setTeams([]));
    loadGames().catch(() => setGames([]));
  }, []);

  const filteredTeams = useMemo(() => {
    const activeKey = gameKey(openGame);
    return teams
      .filter((team) => gameKey(team.game) === activeKey)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [teams, openGame]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
      <div className="mb-6 space-y-3">
        <p className="section-title text-[11px] font-semibold text-brand-primary">Equipes & joueur·euse·s</p>
        <h1 className="font-display text-4xl font-semibold text-slate-900">Rosters par jeu</h1>
        <p className="max-w-3xl text-lg text-slate-600">Selectionne un jeu pour voir les equipes.</p>
      </div>

      <div className="mb-6 grid gap-2 rounded-2xl border border-slate-300 bg-white p-3 md:grid-cols-4">
        {games.map((game) => (
          <button
            key={game}
            onClick={() => setOpenGame(game)}
            className={`rounded-xl px-4 py-3 text-sm font-semibold ${
              openGame === game ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {game}
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {filteredTeams.map((team) => (
          <TeamCard key={team.id} team={team} />
        ))}
      </div>

      {filteredTeams.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-6 text-sm text-slate-600">
          Ce jeu n&apos;a couramment pas de roster.
        </div>
      )}
    </div>
  );
}

function TeamCard({
  team
}: {
  team: ManagedTeamItem;
}) {
  const competitionStats = calculateCompetitionStats(team.nextMatches);
  const hasStats = Object.keys(competitionStats).length > 0;

  return (
    <section className="card-surface rounded-2xl p-6">
      <p className="text-xs font-semibold uppercase text-brand-primary">{team.game}</p>
      <h2 className="text-xl font-semibold text-slate-900">{team.name}</h2>
      
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">Niveau : {team.level}</p>
        
        {/* Résultats par compétition */}
        {hasStats && (
          <div className="flex gap-4 text-xs text-slate-600">
            {Object.entries(competitionStats)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([competition, stats]) => {
                const winratePercent = Math.round(stats.winrate * 100);
                return (
                  <div key={competition} className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{competition}</span>
                    <span>{stats.wins}V/{stats.losses}D</span>
                    <span className={`font-semibold ${
                      winratePercent >= 60 ? 'text-green-600' :
                      winratePercent >= 40 ? 'text-slate-600' :
                      'text-red-600'
                    }`}>
                      {winratePercent}%
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {(team.multiopggUrl || team.twitchLinks?.length) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {team.multiopggUrl && (
            <a
              href={team.multiopggUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-brand-primary/30 bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-brand-primary hover:border-brand-primary hover:bg-brand-primary/20"
            >
              Multi OP.GG
            </a>
          )}
          {team.twitchLinks?.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-purple-300 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 hover:border-purple-500 hover:bg-purple-100"
            >
              {link.name}
            </a>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Prochain match</p>
        {team.nextMatches && team.nextMatches.length > 0 ? (() => {
          const now = Date.now();
          const nextMatch = team.nextMatches.find(match => {
            const matchTime = new Date(match.datetime).getTime();
            return matchTime >= now;
          });
          return nextMatch ? (
            <div className="mt-2">
              <div className="rounded-lg border border-slate-300 bg-white px-3 py-2">
                <p className="text-sm font-semibold text-slate-900">vs {nextMatch.opponent}</p>
                <p className="text-xs text-slate-600">{formatMatchDateTime(nextMatch.datetime)}</p>
                <p className="text-xs text-slate-500">
                  {nextMatch.competition ? `${nextMatch.competition}` : ''}
                  {nextMatch.competition && nextMatch.stage ? ' - ' : ''}
                  {nextMatch.stage || ''}
                </p>
                {nextMatch.streamUrl ? (
                  <a
                    href={nextMatch.streamUrl}
                    className="mt-1 inline-block text-xs font-semibold text-brand-primary hover:text-brand-secondary"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Voir le lien match
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-500">Pas de match a venir.</p>
          );
        })() : (
          <p className="mt-2 text-xs text-slate-500">Pas encore de match programme.</p>
        )}
      </div>

      {team.players && team.players.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {team.players.map((player) => {
            const roleIconUrl = getRoleIconUrl(player.role);
            const eloIconPath = getEloIconPath(player.elo);
            return (
              <div key={`${team.id}-${player.name}`} className="flex items-start justify-between rounded-xl border border-slate-300 bg-white px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-900">{player.name}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    {roleIconUrl && (
                      <Image src={roleIconUrl} alt={`Role ${player.role || 'inconnu'}`} width={16} height={16} className="h-4 w-4" />
                    )}
                    <p className="text-xs text-slate-600">{player.role || 'Role non precise'}</p>
                  </div>
                  {player.elo && (
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                      {eloIconPath ? (
                        <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-300">
                          <Image src={eloIconPath} alt={`Rang ${player.elo}`} width={14} height={14} className="h-3.5 w-3.5 object-contain" />
                        </span>
                      ) : null}
                      <p>Elo : {player.elo}</p>
                    </div>
                  )}
                  {isLeagueOfLegends(team.game) && player.favoriteChampion && (
                    <div className="mt-1 flex items-center gap-2">
                      <ChampionIcon champion={player.favoriteChampion} playerName={player.name} />
                      <p className="text-xs text-slate-600">Champion prefere : {player.favoriteChampion}</p>
                    </div>
                  )}
                  {player.note && <p className="text-xs text-slate-500">{player.note}</p>}
                </div>
                {player.opgg && (
                  <a href={player.opgg} className="text-xs font-semibold text-brand-primary hover:text-brand-secondary" target="_blank" rel="noopener noreferrer">
                    OPGG
                  </a>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-600">Ce jeu n&apos;a couramment pas de roster.</div>
      )}
    </section>
  );
}
