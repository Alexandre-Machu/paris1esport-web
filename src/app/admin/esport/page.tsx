'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import type { ManagedTeamItem } from '@/lib/types';

const initialForm = { name: '', game: 'League Of Legends', level: '', record: '', description: '' };

export default function AdminEsportPage() {
  const [teams, setTeams] = useState<ManagedTeamItem[]>([]);
  const [games, setGames] = useState<string[]>([]);
  const [form, setForm] = useState(initialForm);
  const [newGameName, setNewGameName] = useState('');
  const [saving, setSaving] = useState(false);

  const loadTeams = useCallback(async () => {
    const res = await fetch('/api/managed/teams');
    const data = (await res.json()) as ManagedTeamItem[];
    setTeams(Array.isArray(data) ? data : []);
  }, []);

  const loadGames = useCallback(async () => {
    const res = await fetch('/api/managed/games');
    const data = (await res.json()) as string[];
    const normalized = Array.isArray(data) ? data : [];
    setGames(normalized);
    if (normalized.length > 0) {
      setForm((prev) => (normalized.includes(prev.game) ? prev : { ...prev, game: normalized[0] }));
    }
  }, []);

  useEffect(() => {
    loadTeams().catch(() => setTeams([]));
    loadGames().catch(() => setGames([]));
  }, [loadTeams, loadGames]);

  async function createTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/managed/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setForm((prev) => ({ ...initialForm, game: prev.game }));
        await loadTeams();
      }
    } finally {
      setSaving(false);
    }
  }

  async function addGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newGameName.trim();
    if (!name) {
      return;
    }

    const res = await fetch('/api/managed/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    if (res.ok) {
      setNewGameName('');
      await loadGames();
      setForm((prev) => ({ ...prev, game: name }));
    }
  }

  async function updateTeam(id: string, payload: Omit<ManagedTeamItem, 'id'>) {
    const res = await fetch(`/api/managed/teams/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      await loadTeams();
    }
  }

  async function deleteTeam(id: string) {
    const res = await fetch(`/api/managed/teams/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadTeams();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Equipes esport</h1>
        <p className="mt-2 text-sm text-slate-700">Ajoute, modifie et supprime les equipes existantes.</p>
      </div>

      <form onSubmit={createTeam} className="card-surface rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-slate-900">Ajouter une equipe</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required placeholder="Nom" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <select value={form.game} onChange={(e) => setForm((p) => ({ ...p, game: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" required>
            {games.map((game) => (
              <option key={game} value={game}>
                {game}
              </option>
            ))}
          </select>
          <input value={form.level} onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))} required placeholder="Niveau" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input value={form.record} onChange={(e) => setForm((p) => ({ ...p, record: e.target.value }))} required placeholder="Bilan" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description (ex: OPGG, infos roster...)" rows={3} className="md:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <button disabled={saving} className="mt-4 rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white">
          {saving ? 'Ajout...' : 'Ajouter'}
        </button>
      </form>

      <form onSubmit={addGame} className="card-surface rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-slate-900">Ajouter un jeu a la liste</h2>
        <div className="mt-3 flex flex-col gap-3 md:flex-row">
          <input value={newGameName} onChange={(e) => setNewGameName(e.target.value)} placeholder="Ex: Apex Legends" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Ajouter le jeu</button>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {teams.map((team) => (
          <TeamEditorCard key={team.id} team={team} games={games} onUpdate={updateTeam} onDelete={deleteTeam} />
        ))}
      </div>
    </div>
  );
}

function TeamEditorCard({
  team,
  games,
  onUpdate,
  onDelete
}: {
  team: ManagedTeamItem;
  games: string[];
  onUpdate: (id: string, payload: Omit<ManagedTeamItem, 'id'>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Omit<ManagedTeamItem, 'id'>>({
    name: team.name,
    game: team.game,
    level: team.level,
    record: team.record,
    description: team.description,
    players: team.players
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdate(team.id, draft);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card-surface rounded-2xl p-5">
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
      </div>
      <div className="mt-3 flex gap-3">
        <button onClick={handleSave} disabled={saving} className="rounded-full bg-brand-primary px-4 py-2 text-xs font-semibold text-white">
          {saving ? 'Sauvegarde...' : 'Modifier'}
        </button>
        <button onClick={() => onDelete(team.id)} className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-600">
          Supprimer
        </button>
      </div>
    </div>
  );
}
