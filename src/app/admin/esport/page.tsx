'use client';

import { DragEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { searchChampions } from '@/lib/champions';
import type { ManagedTeamItem, TeamPlayer, UpcomingMatch } from '@/lib/types';

const initialForm: Omit<ManagedTeamItem, 'id'> = {
  name: '',
  game: 'League Of Legends',
  level: '',
  record: '',
  description: '',
  players: [],
  nextMatches: [],
  twitchLinks: [],
  multiopggUrl: ''
};

function formatDatetimeForInput(datetime: string): string {
  if (!datetime) return '';
  try {
    const date = new Date(datetime);
    if (isNaN(date.getTime())) return '';
    // Utiliser l'heure locale du navigateur, pas UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
}

function parseDatetimeToISO(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toISOString();
  } catch {
    return '';
  }
}

function createUpcomingMatch(): UpcomingMatch {
  return {
    id: globalThis.crypto?.randomUUID?.() || `match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    opponent: '',
    datetime: '',
    competition: '',
    stage: '',
    streamUrl: '',
    teamScore: undefined,
    opponentScore: undefined,
    mvp: '',
    vodUrl: ''
  };
}

function gameKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function readApiError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export default function AdminEsportPage() {
  const [teams, setTeams] = useState<ManagedTeamItem[]>([]);
  const [games, setGames] = useState<string[]>([]);
  const [competitions, setCompetitions] = useState<string[]>([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [newGameName, setNewGameName] = useState('');
  const [newCompetitionName, setNewCompetitionName] = useState('');
  const [editingCompetitionName, setEditingCompetitionName] = useState<string | null>(null);
  const [competitionDraftName, setCompetitionDraftName] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [draggedTeamId, setDraggedTeamId] = useState<string | null>(null);
  const [dragOverTeamId, setDragOverTeamId] = useState<string | null>(null);

  const loadTeams = useCallback(async () => {
    const res = await fetch('/api/managed/teams', { cache: 'no-store' });
    const data = (await res.json()) as ManagedTeamItem[];
    setTeams(Array.isArray(data) ? data : []);
  }, []);

  const loadGames = useCallback(async () => {
    const res = await fetch('/api/managed/games', { cache: 'no-store' });
    const data = (await res.json()) as string[];
    const normalized = Array.isArray(data) ? data : [];
    setGames(normalized);
    setSelectedGame((current) => {
      if (current || normalized.length === 0) {
        return current;
      }
      const firstGame = normalized[0];
      setForm((prev) => ({ ...prev, game: firstGame }));
      return firstGame;
    });
  }, []);

  const loadCompetitions = useCallback(async () => {
    const res = await fetch('/api/managed/competitions', { cache: 'no-store' });
    const data = (await res.json()) as string[];
    setCompetitions(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    loadTeams().catch(() => setTeams([]));
    loadGames().catch(() => setGames([]));
    loadCompetitions().catch(() => setCompetitions([]));
  }, [loadGames, loadTeams, loadCompetitions]);

  const teamsByGame = useMemo(() => {
    const selectedKey = gameKey(selectedGame);
    return teams
      .filter((t) => gameKey(t.game) === selectedKey)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [teams, selectedGame]);

  async function handleSubmitTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback('');
    setError('');
    setSaving(true);

    try {
      const endpoint = editingTeamId ? `/api/managed/teams/${editingTeamId}` : '/api/managed/teams';
      const method = editingTeamId ? 'PUT' : 'POST';
      const isEditing = Boolean(editingTeamId);
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (!res.ok) {
        throw new Error(editingTeamId ? 'Modification impossible.' : 'Ajout impossible.');
      }

      const savedTeam = (await res.json()) as ManagedTeamItem;

      if (editingTeamId) {
        setFeedback('Équipe modifiée avec succès.');
      } else {
        setFeedback('Équipe ajoutée avec succès.');
      }

      await loadTeams();

      if (isEditing) {
        setSelectedGame(savedTeam.game);
        setForm({
          name: savedTeam.name,
          game: savedTeam.game,
          level: savedTeam.level,
          record: savedTeam.record,
          description: savedTeam.description || '',
          players: savedTeam.players || [],
          nextMatches: savedTeam.nextMatches || [],
          twitchLinks: savedTeam.twitchLinks || [],
          multiopggUrl: savedTeam.multiopggUrl || ''
        });
        setEditingTeamId(savedTeam.id);
      } else {
        setForm({ ...initialForm, game: selectedGame });
        setEditingTeamId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
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

    try {
      const res = await fetch('/api/managed/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (!res.ok) throw new Error('Ajout impossible.');

      setNewGameName('');
      await loadGames();
      setSelectedGame(name);
      setForm((prev) => ({ ...prev, game: name }));
      setFeedback('Jeu ajouté avec succès.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    }
  }

  async function addCompetition() {
    setFeedback('');
    setError('');

    const name = newCompetitionName.trim();
    if (!name) {
      return;
    }

    try {
      const res = await fetch('/api/managed/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (!res.ok) throw new Error('Ajout impossible.');

      setNewCompetitionName('');
      await loadCompetitions();
      setFeedback('Compétition ajoutée avec succès.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    }
  }

  async function saveCompetitionEdit(previousName: string) {
    const nextName = competitionDraftName.trim();
    if (!nextName) {
      setError('Le nom de la competition est requis.');
      return;
    }

    setFeedback('');
    setError('');

    try {
      const res = await fetch('/api/managed/competitions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: previousName, nextName })
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, 'Modification impossible.'));
      }

      setEditingCompetitionName(null);
      setCompetitionDraftName('');
      await loadCompetitions();
      setForm((prev) => ({
        ...prev,
        nextMatches: (prev.nextMatches || []).map((match) => ({
          ...match,
          competition: match.competition === previousName ? nextName : match.competition
        }))
      }));
      setFeedback('Competition modifiee avec succes.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    }
  }

  async function deleteCompetition(name: string) {
    if (!window.confirm(`Supprimer la competition "${name}" ?`)) {
      return;
    }

    setFeedback('');
    setError('');

    try {
      const res = await fetch('/api/managed/competitions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, 'Suppression impossible.'));
      }

      if (editingCompetitionName === name) {
        setEditingCompetitionName(null);
        setCompetitionDraftName('');
      }

      await loadCompetitions();
      setForm((prev) => ({
        ...prev,
        nextMatches: (prev.nextMatches || []).map((match) => ({
          ...match,
          competition: match.competition === name ? undefined : match.competition
        }))
      }));
      setFeedback('Competition supprimee avec succes.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    }
  }

  function startCreateTeam() {
    setForm({ ...initialForm, game: selectedGame });
    setEditingTeamId(null);
  }

  async function handleDeleteTeam(id: string) {
    const confirmed = window.confirm('Supprimer cette equipe ?');
    if (!confirmed) {
      return;
    }

    setFeedback('');
    setError('');
    setSaving(true);

    try {
      const res = await fetch(`/api/managed/teams/${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, 'Suppression impossible.'));
      }

      setForm({ ...initialForm, game: selectedGame });
      setEditingTeamId(null);
      await loadTeams();
      setFeedback('Equipe supprimee avec succes.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setSaving(false);
    }
  }

  function handleDragStart(teamId: string) {
    setDraggedTeamId(teamId);
  }

  function handleDragOver(event: DragEvent<HTMLButtonElement>, teamId: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverTeamId(teamId);
  }

  async function handleDrop(event: DragEvent<HTMLButtonElement>, droppedOnTeamId: string) {
    event.preventDefault();

    if (!draggedTeamId || draggedTeamId === droppedOnTeamId) {
      setDraggedTeamId(null);
      setDragOverTeamId(null);
      return;
    }

    const newOrder = [...teamsByGame];
    const draggedIndex = newOrder.findIndex((team) => team.id === draggedTeamId);
    const dropIndex = newOrder.findIndex((team) => team.id === droppedOnTeamId);

    if (draggedIndex === -1 || dropIndex === -1) {
      setDraggedTeamId(null);
      setDragOverTeamId(null);
      return;
    }

    const [draggedTeam] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedTeam);

    const updatedTeams = teams.map((team) => {
      if (gameKey(team.game) !== gameKey(selectedGame)) {
        return team;
      }

      const index = newOrder.findIndex((item) => item.id === team.id);
      return index === -1 ? team : { ...team, order: index };
    });

    setTeams(updatedTeams);

    try {
      const res = await fetch('/api/managed/teams/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game: selectedGame,
          orderedIds: newOrder.map((team) => team.id)
        })
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, 'Réorganisation impossible.'));
      }

      await loadTeams();
      setFeedback('Ordre sauvegardé avec succès.');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
      await loadTeams();
    } finally {
      setDraggedTeamId(null);
      setDragOverTeamId(null);
    }
  }

  function handleDragEnd() {
    setDraggedTeamId(null);
    setDragOverTeamId(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin - Esport</h1>
          <p className="mt-1 text-sm text-slate-600">Gère les équipes par jeu. Tu peux modifier les joueurs directement après création.</p>
        </div>

        {feedback && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{feedback}</p>}
        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {/* Jeux */}
        <div className="card-surface rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Jeux</h2>
            <form onSubmit={addGame} className="flex gap-2">
              <input
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                placeholder="Nouveau jeu..."
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <button type="submit" className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                +
              </button>
            </form>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {games.map((game) => (
              <button
                key={game}
                onClick={() => {
                  setSelectedGame(game);
                  setForm((prev) => ({ ...prev, game }));
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  selectedGame === game ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {game}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Équipes du jeu sélectionné */}
          <div className="lg:col-span-1">
            <div className="card-surface rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  Équipes <span className="text-sm text-slate-500">({teamsByGame.length})</span>
                </h2>
                {editingTeamId ? (
                  <button
                    type="button"
                    onClick={startCreateTeam}
                    className="rounded-full border border-brand-primary/30 bg-brand-accent/20 px-3 py-1.5 text-xs font-semibold text-brand-primary"
                  >
                    + Nouvelle equipe
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-slate-500">Glissez-déposez pour réorganiser</p>
              <div className="mt-4 space-y-2">
                {teamsByGame.length === 0 ? (
                  <p className="text-sm text-slate-600">Aucune équipe pour ce jeu.</p>
                ) : (
                  teamsByGame.map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      draggable
                      onDragStart={() => handleDragStart(team.id)}
                      onDragOver={(event) => handleDragOver(event, team.id)}
                      onDrop={(event) => handleDrop(event, team.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => {
                        setForm({
                          name: team.name,
                          game: team.game,
                          level: team.level,
                          record: team.record,
                          description: team.description || '',
                          players: team.players || [],
                          nextMatches: team.nextMatches || [],
                          twitchLinks: team.twitchLinks || [],
                          multiopggUrl: team.multiopggUrl || ''
                        });
                        setEditingTeamId(team.id);
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                        editingTeamId === team.id
                          ? 'bg-brand-primary text-white'
                          : draggedTeamId === team.id
                            ? 'bg-slate-50 text-slate-900 opacity-50'
                            : dragOverTeamId === team.id
                              ? 'border-blue-400 bg-blue-100 text-slate-900'
                              : 'bg-slate-50 text-slate-900 hover:bg-slate-100'
                      } cursor-move border-2 border-transparent`}
                    >
                      <span className="mr-2 text-lg">::</span>
                      {team.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmitTeam} className="card-surface rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingTeamId ? `Modifier: ${form.name}` : 'Ajouter une équipe'}
                </h2>
                {editingTeamId ? (
                  <button
                    type="button"
                    onClick={startCreateTeam}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                  >
                    + Nouvelle equipe
                  </button>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  placeholder="Nom"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <select
                  value={form.game}
                  onChange={(e) => setForm((p) => ({ ...p, game: e.target.value }))}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {games.map((game) => (
                    <option key={game} value={game}>
                      {game}
                    </option>
                  ))}
                </select>
                <input
                  value={form.level}
                  onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))}
                  placeholder="Niveau"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  value={form.multiopggUrl || ''}
                  onChange={(e) => setForm((p) => ({ ...p, multiopggUrl: e.target.value }))}
                  placeholder="Lien Multi OP.GG de l'équipe"
                  className="md:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              {/* Liens Twitch de l'équipe */}
              <div className="mt-6 border-t border-slate-200 pt-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900">Chaînes Twitch ({form.twitchLinks?.length || 0}/5)</h3>
                  {(form.twitchLinks?.length || 0) < 5 && (
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, twitchLinks: [...(p.twitchLinks || []), { name: '', url: '' }] }))}
                      className="rounded-lg border border-dashed border-brand-primary/40 px-3 py-2 text-xs font-semibold text-brand-primary hover:bg-brand-accent/20"
                    >
                      + Ajouter
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {(form.twitchLinks || []).map((link, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        value={link.name}
                        onChange={(e) => {
                          const updated = [...(form.twitchLinks || [])];
                          updated[idx] = { ...link, name: e.target.value };
                          setForm((p) => ({ ...p, twitchLinks: updated }));
                        }}
                        placeholder="Nom du joueur"
                        className="w-32 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                      />
                      <input
                        value={link.url}
                        onChange={(e) => {
                          const updated = [...(form.twitchLinks || [])];
                          updated[idx] = { ...link, url: e.target.value };
                          setForm((p) => ({ ...p, twitchLinks: updated }));
                        }}
                        placeholder="https://twitch.tv/..."
                        className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (form.twitchLinks || []).filter((_, i) => i !== idx);
                          setForm((p) => ({ ...p, twitchLinks: updated.length > 0 ? updated : undefined }));
                        }}
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Supprimer
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Joueurs */}
              <div className="mt-6 border-t border-slate-200 pt-6">
                <PlayersEditor
                  team={{ ...form, id: 'new' } as ManagedTeamItem}
                  onChange={(players) => setForm((p) => ({ ...p, players }))}
                />
              </div>

              <div className="mt-6 border-t border-slate-200 pt-6">
                <NextMatchesEditor
                  matches={form.nextMatches || []}
                  competitions={competitions}
                  onAddCompetition={addCompetition}
                  onSaveCompetitionEdit={saveCompetitionEdit}
                  onDeleteCompetition={deleteCompetition}
                  editingCompetitionName={editingCompetitionName}
                  onStartCompetitionEdit={(name) => {
                    setEditingCompetitionName(name);
                    setCompetitionDraftName(name);
                  }}
                  onCancelCompetitionEdit={() => {
                    setEditingCompetitionName(null);
                    setCompetitionDraftName('');
                  }}
                  competitionDraftName={competitionDraftName}
                  onCompetitionDraftNameChange={setCompetitionDraftName}
                  newCompetitionName={newCompetitionName}
                  onCompetitionNameChange={setNewCompetitionName}
                  onChange={(nextMatches) => setForm((p) => ({ ...p, nextMatches }))}
                />
              </div>

              <div className="mt-6 flex gap-3">
                <button disabled={saving} type="submit" className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white">
                  {saving ? 'Sauvegarde...' : editingTeamId ? 'Enregistrer les modifications' : 'Créer'}
                </button>
                {editingTeamId ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleDeleteTeam(editingTeamId)}
                    className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600"
                  >
                    Supprimer
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={startCreateTeam}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Réinitialiser
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function NextMatchesEditor({
  matches,
  competitions,
  onAddCompetition,
  onSaveCompetitionEdit,
  onDeleteCompetition,
  editingCompetitionName,
  onStartCompetitionEdit,
  onCancelCompetitionEdit,
  competitionDraftName,
  onCompetitionDraftNameChange,
  newCompetitionName,
  onCompetitionNameChange,
  onChange
}: {
  matches: UpcomingMatch[];
  competitions: string[];
  onAddCompetition: () => void;
  onSaveCompetitionEdit: (previousName: string) => void;
  onDeleteCompetition: (name: string) => void;
  editingCompetitionName: string | null;
  onStartCompetitionEdit: (name: string) => void;
  onCancelCompetitionEdit: () => void;
  competitionDraftName: string;
  onCompetitionDraftNameChange: (name: string) => void;
  newCompetitionName: string;
  onCompetitionNameChange: (name: string) => void;
  onChange: (matches: UpcomingMatch[]) => void;
}) {
  function parseScoreInput(value: string): number | undefined {
    if (value.trim().length === 0) {
      return undefined;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return undefined;
    }

    return Math.floor(parsed);
  }

  function addMatch() {
    onChange([...matches, createUpcomingMatch()]);
  }

  function updateMatch(index: number, patch: Partial<UpcomingMatch>) {
    const next = [...matches];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  }

  function deleteMatch(index: number) {
    onChange(matches.filter((_, idx) => idx !== index));
  }

  return (
    <div>
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Competitions ({competitions.length})</h3>
        </div>
        <div className="flex gap-2">
          <input
            value={newCompetitionName}
            onChange={(e) => onCompetitionNameChange(e.target.value)}
            placeholder="Nouvelle compétition..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={onAddCompetition}
            className="rounded-lg bg-brand-primary px-3 py-2 text-xs font-semibold text-white hover:bg-brand-secondary"
          >
            +
          </button>
        </div>
        <div className="max-h-44 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2">
          {competitions.length === 0 ? (
            <p className="px-2 py-1 text-xs text-slate-500">Aucune competition enregistree.</p>
          ) : (
            competitions.map((competition) => (
              <div key={competition} className="rounded-lg border border-slate-200 bg-white p-2">
                {editingCompetitionName === competition ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={competitionDraftName}
                      onChange={(e) => onCompetitionDraftNameChange(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => onSaveCompetitionEdit(competition)}
                      className="rounded-lg bg-brand-primary px-2 py-1 text-xs font-semibold text-white"
                    >
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      onClick={onCancelCompetitionEdit}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">{competition}</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onStartCompetitionEdit(competition)}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCompetition(competition)}
                        className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">Matchs calendrier & resultats ({matches.length})</h3>
        <button
          type="button"
          onClick={addMatch}
          className="rounded-lg border border-dashed border-brand-primary/40 px-3 py-2 text-xs font-semibold text-brand-primary hover:bg-brand-accent/20"
        >
          + Ajouter un match
        </button>
      </div>

      {matches.length === 0 ? (
        <p className="text-sm text-slate-600">Aucun match programme pour cette equipe.</p>
      ) : (
        <div className="space-y-3">
          {[...matches]
            .sort((a, b) => {
              const dateA = new Date(a.datetime || '').getTime() || 0;
              const dateB = new Date(b.datetime || '').getTime() || 0;
              return dateB - dateA;
            })
            .map((match) => {
              const index = matches.findIndex((m) => m.id === match.id);
              return (
                <div key={match.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      value={match.opponent}
                      onChange={(e) => updateMatch(index, { opponent: e.target.value })}
                      placeholder="Adversaire"
                      className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    />
                    <input
                      type="datetime-local"
                      value={formatDatetimeForInput(match.datetime)}
                      onChange={(e) => updateMatch(index, { datetime: parseDatetimeToISO(e.target.value) })}
                      placeholder="Date et heure"
                      className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    />
                    <select
                      value={match.competition || ''}
                      onChange={(e) => updateMatch(index, { competition: e.target.value || undefined })}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    >
                      <option value="">Choisir une compétition</option>
                      {competitions.map((comp) => (
                        <option key={comp} value={comp}>
                          {comp}
                        </option>
                      ))}
                    </select>
                    <input
                      value={match.stage || ''}
                      onChange={(e) => updateMatch(index, { stage: e.target.value })}
                      placeholder="Phase (ex: J4, BO3, playoffs)"
                      className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    />
                    <input
                      value={match.streamUrl || ''}
                      onChange={(e) => updateMatch(index, { streamUrl: e.target.value })}
                      placeholder="Lien stream / infos (optionnel)"
                      className="rounded-lg border border-slate-200 px-2 py-1 text-sm md:col-span-2"
                    />
                    <div className="grid grid-cols-2 gap-2 md:col-span-2">
                      <input
                        type="number"
                        min={0}
                        value={match.teamScore ?? ''}
                        onChange={(e) => updateMatch(index, { teamScore: parseScoreInput(e.target.value) })}
                        placeholder="Score P1"
                        className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                      />
                      <input
                        type="number"
                        min={0}
                        value={match.opponentScore ?? ''}
                        onChange={(e) => updateMatch(index, { opponentScore: parseScoreInput(e.target.value) })}
                        placeholder="Score adversaire"
                        className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                      />
                    </div>
                    <input
                      value={match.mvp || ''}
                      onChange={(e) => updateMatch(index, { mvp: e.target.value })}
                      placeholder="MVP (optionnel)"
                      className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    />
                    <input
                      value={match.vodUrl || ''}
                      onChange={(e) => updateMatch(index, { vodUrl: e.target.value })}
                      placeholder="Lien VOD / clip (optionnel)"
                      className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    />
                  </div>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => deleteMatch(index)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

function PlayersEditor({ team, onChange }: { team: ManagedTeamItem; onChange: (players: TeamPlayer[]) => void }) {
  const [editingIdx, setEditingIdx] = useState(-1);
  const [championSearch, setChampionSearch] = useState('');
  const [championSuggestions, setChampionSuggestions] = useState<string[]>([]);
  const [showChampions, setShowChampions] = useState(false);

  const isLeagueOfLegends = team.game.toLowerCase().includes('league');

  function addPlayer() {
    onChange([...(team.players || []), { name: '', role: '' }]);
    setEditingIdx((team.players?.length || 0));
  }

  function updatePlayer(idx: number, player: TeamPlayer) {
    const updated = [...(team.players || [])];
    updated[idx] = player;
    onChange(updated);
  }

  function removePlayer(idx: number) {
    onChange((team.players || []).filter((_, i) => i !== idx));
    setEditingIdx(-1);
  }

  function handleChampionSearch(query: string) {
    setChampionSearch(query);
    if (query.length > 0) {
      setChampionSuggestions(searchChampions(query));
      setShowChampions(true);
    } else {
      setShowChampions(false);
    }
  }

  function setChampion(idx: number, champion: string) {
    updatePlayer(idx, { ...(team.players?.[idx] || { name: '' }), favoriteChampion: champion });
    setChampionSearch('');
    setShowChampions(false);
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Joueurs ({team.players?.length || 0})</h3>
      </div>

      <div className="space-y-2">
        {(team.players || []).map((player, idx) => (
          <div key={idx} className="rounded-lg border border-slate-200 p-3">
            <button
              type="button"
              onClick={() => setEditingIdx(editingIdx === idx ? -1 : idx)}
              className="w-full text-left font-semibold text-slate-900"
            >
              {player.name ? `${player.name} - ${player.role || '?'}` : 'Nouveau joueur'}
            </button>

            {editingIdx === idx && (
              <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                <input
                  value={player.name}
                  onChange={(e) => updatePlayer(idx, { ...player, name: e.target.value })}
                  placeholder="Pseudo"
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
                <select value={player.role || ''} onChange={(e) => updatePlayer(idx, { ...player, role: e.target.value })} className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm">
                  <option value="">Poste (optionnel)</option>
                  <option value="Top">Top</option>
                  <option value="Jungle">Jungle</option>
                  <option value="Mid">Mid</option>
                  <option value="Bot">Bot</option>
                  <option value="Support">Support</option>
                </select>
                <input value={player.elo || ''} onChange={(e) => updatePlayer(idx, { ...player, elo: e.target.value })} placeholder="Elo (ex: Master)" className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm" />
                <input value={player.opgg || ''} onChange={(e) => updatePlayer(idx, { ...player, opgg: e.target.value })} placeholder="Lien OP.GG" className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm" />
                <input value={player.note || ''} onChange={(e) => updatePlayer(idx, { ...player, note: e.target.value })} placeholder="Note (ex: Capitaine)" className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm" />

                {isLeagueOfLegends && (
                  <div className="relative">
                    <input
                      value={championSearch || player.favoriteChampion || ''}
                      onChange={(e) => handleChampionSearch(e.target.value)}
                      onFocus={() => setShowChampions(true)}
                      placeholder="Champ favori (ex: Darius)"
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    />
                    {showChampions && championSuggestions.length > 0 && (
                      <div className="absolute top-full z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg">
                        {championSuggestions.slice(0, 8).map((champ) => (
                          <button
                            key={champ}
                            type="button"
                            onClick={() => setChampion(idx, champ)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                          >
                            {champ}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => removePlayer(idx)}
                    className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addPlayer}
        className="mt-3 rounded-lg border border-dashed border-brand-primary/30 px-3 py-2 text-sm font-semibold text-brand-primary hover:bg-brand-accent/20"
      >
        + Ajouter un joueur
      </button>
    </div>
  );
}