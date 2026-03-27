'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ManagedTeamItem } from '@/lib/types';

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

export default function TeamsPage() {
  const [teams, setTeams] = useState<ManagedTeamItem[]>([]);
  const [games, setGames] = useState<string[]>([]);
  const [openGame, setOpenGame] = useState('League Of Legends');
  const [adminActive, setAdminActive] = useState(false);

  async function loadTeams() {
    const res = await fetch('/api/managed/teams');
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

    fetch('/api/auth/session')
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then((data: { authenticated?: boolean }) => setAdminActive(Boolean(data.authenticated)))
      .catch(() => setAdminActive(false));
  }, []);

  const filteredTeams = useMemo(() => {
    const activeKey = gameKey(openGame);
    return teams.filter((team) => gameKey(team.game) === activeKey);
  }, [teams, openGame]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
      <div className="mb-6 space-y-3">
        <p className="text-xs font-semibold uppercase text-brand-primary">Equipes & joueur·euse·s</p>
        <h1 className="text-4xl font-semibold text-slate-900">Rosters par jeu</h1>
        <p className="max-w-3xl text-lg text-slate-700">
          Selectionne un jeu pour voir les equipes. En mode admin, tu peux modifier directement chaque fiche equipe.
        </p>
      </div>

      <div className="mb-6 grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-4">
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
          <TeamCard key={team.id} team={team} adminActive={adminActive} onChanged={loadTeams} games={games} />
        ))}
      </div>

      {filteredTeams.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-brand-primary/30 bg-white px-6 py-6 text-sm text-slate-700">
          Ce jeu n&apos;a couramment pas de roster.
        </div>
      )}
    </div>
  );
}

function TeamCard({
  team,
  adminActive,
  onChanged,
  games
}: {
  team: ManagedTeamItem;
  adminActive: boolean;
  onChanged: () => Promise<void>;
  games: string[];
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: team.name,
    game: team.game,
    level: team.level,
    record: team.record,
    description: team.description
  });
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    try {
      const res = await fetch(`/api/managed/teams/${team.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft)
      });
      if (res.ok) {
        setEditing(false);
        await onChanged();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card-surface rounded-2xl p-6">
      <p className="text-xs font-semibold uppercase text-brand-primary">{team.game}</p>
      <h2 className="text-xl font-semibold text-slate-900">{team.name}</h2>
      <p className="text-sm text-slate-600">Niveau : {team.level}</p>
      <p className="text-sm text-slate-600">{team.record}</p>
      {team.description && <p className="mt-2 text-sm text-slate-700">{team.description}</p>}

      {team.players && team.players.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {team.players.map((player) => (
            <div key={`${team.id}-${player.name}`} className="flex items-start justify-between rounded-xl bg-slate-50 px-4 py-3">
              <div>
                <p className="font-semibold text-slate-900">{player.name}</p>
                <p className="text-xs text-slate-600">{player.role || 'Role non precise'}</p>
                {player.elo && <p className="text-xs text-slate-600">Elo : {player.elo}</p>}
                {player.note && <p className="text-xs text-slate-500">{player.note}</p>}
              </div>
              {player.opgg && (
                <a href={player.opgg} className="text-xs font-semibold text-brand-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  OPGG
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">Ce jeu n&apos;a couramment pas de roster.</div>
      )}

      {adminActive && (
        <div className="mt-4 rounded-xl border border-brand-primary/30 bg-brand-accent/20 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-brand-primary">Edition admin</p>
            <button onClick={() => setEditing((v) => !v)} className="text-xs font-semibold text-brand-primary hover:underline">
              {editing ? 'Annuler' : 'Modifier cette equipe'}
            </button>
          </div>

          {editing && (
            <div className="grid gap-2">
              <input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <select value={draft.game} onChange={(e) => setDraft((p) => ({ ...p, game: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                {games.map((game) => (
                  <option key={game} value={game}>
                    {game}
                  </option>
                ))}
              </select>
              <input value={draft.level} onChange={(e) => setDraft((p) => ({ ...p, level: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={draft.record} onChange={(e) => setDraft((p) => ({ ...p, record: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <textarea value={draft.description || ''} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} rows={3} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <button onClick={save} disabled={loading} className="mt-1 rounded-full bg-brand-primary px-4 py-2 text-xs font-semibold text-white">
                {loading ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
