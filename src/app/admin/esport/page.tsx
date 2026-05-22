'use client';

import { DragEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { searchChampions } from '@/lib/champions';
import type { ManagedCompetition, ManagedTeamItem, ManagedPlayer, UpcomingMatch } from '@/lib/types';

type Tab = 'players' | 'tournaments' | 'teams' | 'games';

const initialPlayerForm: Omit<ManagedPlayer, 'id'> = {
  name: '',
  teamStatus: undefined,
  games: ['League Of Legends'],
  gameElos: {},
  role: '',
  elo: '',
  opgg: '',
  note: '',
  favoriteChampion: '',
  discord: '',
  twitter: '',
  twitch: '',
  instagram: '',
  linkedin: ''
};

const initialForm: Omit<ManagedTeamItem, 'id'> = {
  name: '',
  game: 'League Of Legends',
  competition: '',
  level: '',
  record: '',
  description: '',
  playerIds: [],
  playerAssignments: [],
  nextMatches: [],
  twitchLinks: [],
  multiopggUrl: ''
};

type CompetitionFormState = {
  name: string;
  status: 'upcoming' | 'active' | 'completed';
  description: string;
  startDate: string;
  endDate: string;
  bracketUrl: string;
  infoUrl: string;
};

const initialCompetitionForm: CompetitionFormState = {
  name: '',
  status: 'upcoming',
  description: '',
  startDate: '',
  endDate: '',
  bracketUrl: '',
  infoUrl: ''
};

function formatDatetimeForInput(datetime: string): string {
  if (!datetime) return '';
  try {
    const date = new Date(datetime);
    if (isNaN(date.getTime())) return '';
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

function toDateInputValue(value?: string): string {
  if (!value) {
    return '';
  }

  const maybeIsoDate = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(maybeIsoDate)) {
    return maybeIsoDate.slice(0, 10);
  }

  const date = new Date(maybeIsoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().slice(0, 10);
}

function toCompetitionPayloadDate(value: string): string | undefined {
  const cleaned = value.trim();
  if (!cleaned) {
    return undefined;
  }

  return `${cleaned}T00:00:00.000Z`;
}

const competitionStatusLabel: Record<'upcoming' | 'active' | 'completed', string> = {
  upcoming: 'A venir',
  active: 'En cours',
  completed: 'Termine'
};

const ELO_OPTIONS = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platine', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Challenger'];

function eloRank(value?: string): number {
  const normalized = String(value || '').trim().toLowerCase();
  const index = ELO_OPTIONS.findIndex((option) => option.toLowerCase() === normalized);
  return index >= 0 ? index : 999;
}

function normalizeGameList(values?: string[]): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const cleaned = values.map((value) => String(value || '').trim()).filter((value) => value.length > 0);
  return [...new Set(cleaned)];
}

function normalizeGameElos(values?: Record<string, string>): Record<string, string> {
  if (!values || typeof values !== 'object') {
    return {};
  }

  const next: Record<string, string> = {};
  Object.entries(values).forEach(([game, elo]) => {
    const cleanedGame = String(game || '').trim();
    const cleanedElo = String(elo || '').trim();
    if (cleanedGame && cleanedElo) {
      next[cleanedGame] = cleanedElo;
    }
  });

  return next;
}

function getGameEloForPlayer(player: Pick<ManagedPlayer, 'elo' | 'games' | 'gameElos'>, game: string): string {
  const selectedKey = gameKey(game);
  const matchedEntry = Object.entries(player.gameElos || {}).find(([storedGame]) => gameKey(storedGame) === selectedKey);
  return matchedEntry?.[1] || player.elo || '';
}

function getPlayerCompatibleGames(player: Pick<ManagedPlayer, 'games'>, availableGames: string[]): string[] {
  const playerGames = normalizeGameList(player.games);
  if (playerGames.length === 0) {
    return availableGames;
  }

  return availableGames.filter((game) => playerGames.some((playerGame) => gameKey(playerGame) === gameKey(game)));
}

export default function AdminEsportPage() {
  const [tab, setTab] = useState<Tab>('teams');

  // Player state
  const [players, setPlayers] = useState<ManagedPlayer[]>([]);
  const [playerForm, setPlayerForm] = useState(initialPlayerForm);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [showChampionSuggestions, setShowChampionSuggestions] = useState(false);
  const [playerListQuery, setPlayerListQuery] = useState('');
  const [playerListSortBy, setPlayerListSortBy] = useState<'name' | 'elo'>('name');
  const [playerListSortDesc, setPlayerListSortDesc] = useState(false);

  // Team state
  const [teams, setTeams] = useState<ManagedTeamItem[]>([]);
  const [games, setGames] = useState<string[]>([]);
  const [competitions, setCompetitions] = useState<ManagedCompetition[]>([]);
  const [selectedGame, setSelectedGame] = useState('');
  const [form, setForm] = useState(initialForm);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [newGameName, setNewGameName] = useState('');
  const [competitionForm, setCompetitionForm] = useState<CompetitionFormState>(initialCompetitionForm);
  const [editingCompetitionId, setEditingCompetitionId] = useState<string | null>(null);
  const [competitionStatusFilter, setCompetitionStatusFilter] = useState<'all' | 'upcoming' | 'active' | 'completed'>('all');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [draggedTeamId, setDraggedTeamId] = useState<string | null>(null);
  const [dragOverTeamId, setDragOverTeamId] = useState<string | null>(null);

  // Games management state
  const [gamesWithTeamSize, setGamesWithTeamSize] = useState<Array<{ name: string; teamSize: number }>>([]);
  const [updatingGameName, setUpdatingGameName] = useState<string | null>(null);

  // Player selection sort state
  const [playerSortBy, setPlayerSortBy] = useState<'name' | 'elo'>('name');
  const [playerSortDesc, setPlayerSortDesc] = useState(false);

  const loadPlayers = useCallback(async () => {
    try {
      const res = await fetch('/api/managed/players', { cache: 'no-store' });
      const data = (await res.json()) as ManagedPlayer[];
      setPlayers(Array.isArray(data) ? data : []);
    } catch {
      setPlayers([]);
    }
  }, []);

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
    const data = (await res.json()) as Array<ManagedCompetition | string>;
    if (!Array.isArray(data)) {
      setCompetitions([]);
      return;
    }

    if (data.length > 0 && typeof data[0] === 'string') {
      setCompetitions(
        (data as string[]).map((name) => ({
          id: name,
          name,
          status: 'upcoming'
        }))
      );
      return;
    }

    setCompetitions(
      (data as ManagedCompetition[]).map((competition) => ({
        ...competition,
        status: competition.status || 'upcoming'
      }))
    );
  }, []);

  const loadGamesWithTeamSize = useCallback(async () => {
    try {
      const res = await fetch('/api/managed/games?withTeamSize=true', { cache: 'no-store' });
      const data = (await res.json()) as Array<{ name: string; teamSize: number }>;
      setGamesWithTeamSize(Array.isArray(data) ? data : []);
    } catch {
      setGamesWithTeamSize([]);
    }
  }, []);

  useEffect(() => {
    loadPlayers();
    loadTeams().catch(() => setTeams([]));
    loadGames().catch(() => setGames([]));
    loadCompetitions().catch(() => setCompetitions([]));
    loadGamesWithTeamSize().catch(() => setGamesWithTeamSize([]));
  }, [loadGames, loadTeams, loadPlayers, loadCompetitions, loadGamesWithTeamSize]);

  const teamsByGame = useMemo(() => {
    const selectedKey = gameKey(selectedGame);
    return teams
      .filter((t) => gameKey(t.game) === selectedKey)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [teams, selectedGame]);

  const competitionNames = useMemo(
    () => competitions.map((competition) => competition.name),
    [competitions]
  );

  const filteredCompetitions = useMemo(() => {
    if (competitionStatusFilter === 'all') {
      return competitions;
    }

    return competitions.filter((competition) => (competition.status || 'upcoming') === competitionStatusFilter);
  }, [competitions, competitionStatusFilter]);

  const sortedPlayersForTeam = useMemo(() => {
    const sorted = [...players];
    sorted.sort((a, b) => {
      let aVal: string = '';
      let bVal: string = '';

      if (playerSortBy === 'name') {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else {
        aVal = String(eloRank(a.elo));
        bVal = String(eloRank(b.elo));
      }

      const comparison = aVal.localeCompare(bVal);
      return playerSortDesc ? -comparison : comparison;
    });
    return sorted;
  }, [players, playerSortBy, playerSortDesc]);

  // Player assignment helpers for team form
  function isPlayerSelectedInForm(playerId: string) {
    return (form.playerIds || []).includes(playerId);
  }

  function togglePlayerInForm(playerId: string, defaultRole?: string) {
    setForm((p) => {
      const ids = p.playerIds || [];
      const assignments = p.playerAssignments || [];
      if (ids.includes(playerId)) {
        return {
          ...p,
          playerIds: ids.filter((id) => id !== playerId),
          playerAssignments: assignments.filter((a) => a.id !== playerId)
        };
      }

      return {
        ...p,
        playerIds: [...ids, playerId],
        playerAssignments: [...assignments, { id: playerId, role: defaultRole || undefined, isCaptain: false, isSub: false }]
      };
    });
  }

  function setAssignmentRoleForPlayer(playerId: string, role: string | undefined) {
    setForm((p) => ({
      ...p,
      playerAssignments: effectivePlayerAssignments.map((a) =>
        a.id === playerId ? { ...a, role: role || undefined } : a
      )
    }));
  }

  function setCaptainForPlayer(playerId: string) {
    setForm((p) => {
      const ids = p.playerIds || [];
      const nextIds = ids.includes(playerId) ? ids : [...ids, playerId];
      const normalized = nextIds.map((id) => {
        const existing = effectivePlayerAssignments.find((a) => a.id === id);
        return {
          id,
          role: existing?.role,
          isCaptain: id === playerId,
          isSub: Boolean(existing?.isSub)
        };
      });
      return { ...p, playerIds: nextIds, playerAssignments: normalized };
    });
  }

  const sortedPlayersForList = useMemo(() => {
    const normalizedQuery = playerListQuery.trim().toLowerCase();
    const filtered = players.filter((player) => {
      if (!normalizedQuery) {
        return true;
      }

      return [player.name, player.role, player.elo, player.favoriteChampion, player.discord, player.teamStatus]
        .map((value) => String(value || '').toLowerCase())
        .some((value) => value.includes(normalizedQuery));
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      let aVal = '';
      let bVal = '';

      if (playerListSortBy === 'name') {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else {
        aVal = String(eloRank(a.elo));
        bVal = String(eloRank(b.elo));
      }

      const comparison = aVal.localeCompare(bVal);
      return playerListSortDesc ? -comparison : comparison;
    });

    return sorted;
  }, [players, playerListQuery, playerListSortBy, playerListSortDesc]);

  const championSuggestions = useMemo(
    () => searchChampions(playerForm.favoriteChampion || ''),
    [playerForm.favoriteChampion]
  );

  const isLeagueSelectedInPlayerForm = useMemo(() => {
    return (playerForm.games || []).some((g) => {
      const key = gameKey(g);
      return key === gameKey('League Of Legends') || key === 'lol';
    });
  }, [playerForm.games]);

  const effectivePlayerAssignments = useMemo(() => {
    const ids = form.playerIds || [];
    const assignments = form.playerAssignments || [];
    return ids.map((id) => {
      const existing = assignments.find((a) => a.id === id);
      const player = players.find((p) => p.id === id);
      return {
        id,
        role: existing?.role ?? player?.role ?? undefined,
        isCaptain: Boolean(existing?.isCaptain),
        isSub: Boolean(existing?.isSub)
      };
    });
  }, [form.playerIds, form.playerAssignments, players]);

  // ===== Player Handlers =====

  async function handleSubmitPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback('');
    setError('');
    setSaving(true);

    try {
      const endpoint = editingPlayerId ? `/api/managed/players/${editingPlayerId}` : '/api/managed/players';
      const method = editingPlayerId ? 'PUT' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerForm)
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, editingPlayerId ? 'Modification impossible.' : 'Ajout impossible.'));
      }

      setFeedback(editingPlayerId ? 'Joueur modifié avec succès.' : 'Joueur ajouté avec succès.');
      await loadPlayers();
      setPlayerForm(initialPlayerForm);
      setEditingPlayerId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePlayer(id: string) {
    if (!window.confirm('Supprimer ce joueur ?')) return;

    setFeedback('');
    setError('');
    setSaving(true);

    try {
      const res = await fetch(`/api/managed/players/${id}`, { method: 'DELETE' });

      if (!res.ok) {
        throw new Error(await readApiError(res, 'Suppression impossible.'));
      }

      setFeedback('Joueur supprimé avec succès.');
      setPlayerForm(initialPlayerForm);
      setEditingPlayerId(null);
      await loadPlayers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setSaving(false);
    }
  }

  function startCreatePlayer() {
    setPlayerForm(initialPlayerForm);
    setEditingPlayerId(null);
  }

  // ===== Games Handlers =====

  async function handleUpdateGameTeamSize(gameName: string, newTeamSize: number) {
    if (newTeamSize < 1) return;
    
    setUpdatingGameName(gameName);
    try {
      const res = await fetch('/api/managed/games', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameName, teamSize: newTeamSize })
      });

      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error || 'Erreur lors de la mise à jour.');
      }

      setFeedback('Taille d\'équipe mise à jour.');
      await loadGamesWithTeamSize();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setUpdatingGameName(null);
    }
  }

  // ===== Team Handlers =====

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
        throw new Error(await readApiError(res, editingTeamId ? 'Modification impossible.' : 'Ajout impossible.'));
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
          competition: savedTeam.competition || '',
          level: savedTeam.level,
          record: savedTeam.record,
          description: savedTeam.description || '',
          playerIds: savedTeam.playerIds || [],
          playerAssignments: savedTeam.playerAssignments || [],
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

  function resetCompetitionEditor() {
    setCompetitionForm(initialCompetitionForm);
    setEditingCompetitionId(null);
  }

  function startEditCompetition(competition: ManagedCompetition) {
    setEditingCompetitionId(competition.id);
    setCompetitionForm({
      name: competition.name,
      status: (competition.status || 'upcoming') as 'upcoming' | 'active' | 'completed',
      description: competition.description || '',
      startDate: toDateInputValue(competition.startDate),
      endDate: toDateInputValue(competition.endDate),
      bracketUrl: competition.bracketUrl || '',
      infoUrl: competition.infoUrl || ''
    });
  }

  async function saveCompetition() {
    setFeedback('');
    setError('');

    const name = competitionForm.name.trim();
    if (!name) {
      setError('Le nom du tournoi est requis.');
      return;
    }

    const payload = {
      name,
      status: competitionForm.status,
      description: competitionForm.description.trim() || undefined,
      startDate: toCompetitionPayloadDate(competitionForm.startDate),
      endDate: toCompetitionPayloadDate(competitionForm.endDate),
      bracketUrl: competitionForm.bracketUrl.trim() || undefined,
      infoUrl: competitionForm.infoUrl.trim() || undefined
    };

    const editedCompetition = competitions.find((competition) => competition.id === editingCompetitionId);
    const previousName = editedCompetition?.name;

    try {
      const res = await fetch('/api/managed/competitions', {
        method: editingCompetitionId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCompetitionId ? { id: editingCompetitionId, ...payload } : payload)
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, editingCompetitionId ? 'Modification impossible.' : 'Ajout impossible.'));
      }

      const savedCompetition = (await res.json()) as ManagedCompetition;

      await loadCompetitions();
      if (previousName && previousName !== savedCompetition.name) {
        setForm((prev) => ({
          ...prev,
          competition: prev.competition === previousName ? savedCompetition.name : prev.competition,
          nextMatches: (prev.nextMatches || []).map((match) => ({
            ...match,
            competition: match.competition === previousName ? savedCompetition.name : match.competition
          }))
        }));
      }

      resetCompetitionEditor();
      setFeedback(editingCompetitionId ? 'Tournoi modifié avec succès.' : 'Tournoi ajouté avec succès.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.');
    }
  }

  async function deleteCompetition(competition: ManagedCompetition) {
    if (!window.confirm(`Supprimer le tournoi "${competition.name}" ?`)) {
      return;
    }

    setFeedback('');
    setError('');

    try {
      const res = await fetch('/api/managed/competitions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: competition.id })
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, 'Suppression impossible.'));
      }

      if (editingCompetitionId === competition.id) {
        resetCompetitionEditor();
      }

      await loadCompetitions();
      setForm((prev) => ({
        ...prev,
        competition: prev.competition === competition.name ? '' : prev.competition,
        nextMatches: (prev.nextMatches || []).map((match) => ({
          ...match,
          competition: match.competition === competition.name ? undefined : match.competition
        }))
      }));
      setFeedback('Tournoi supprimé avec succès.');
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

  // Matches helpers (ajout / modification / suppression dans le formulaire équipe)
  function addMatch() {
    setForm((prev) => ({ ...prev, nextMatches: [...(prev.nextMatches || []), createUpcomingMatch()] }));
  }

  function updateMatchField(matchId: string, field: keyof UpcomingMatch, value: any) {
    setForm((prev) => ({
      ...prev,
      nextMatches: (prev.nextMatches || []).map((m) => (m.id === matchId ? { ...m, [field]: value } : m))
    }));
  }

  function removeMatch(matchId: string) {
    setForm((prev) => ({ ...prev, nextMatches: (prev.nextMatches || []).filter((m) => m.id !== matchId) }));
  }

  // ===== RENDER =====

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Admin - Esport</h1>
          <p className="mt-1 text-sm text-slate-600">Gère les joueurs, tournois et équipes esport.</p>
        </div>

        {feedback && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{feedback}</p>}
        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          {(['players', 'tournaments', 'teams', 'games'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 font-semibold text-sm transition ${
                tab === t
                  ? 'border-b-2 border-brand-primary text-brand-primary'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t === 'players' && 'Joueurs'}
              {t === 'tournaments' && 'Tournois'}
              {t === 'teams' && 'Équipes'}
              {t === 'games' && 'Jeux'}
            </button>
          ))}
        </div>

        {/* Players Tab */}
        {tab === 'players' && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Players List */}
            <div className="lg:col-span-1">
              <div className="card-surface rounded-2xl p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Joueurs <span className="text-sm text-slate-500">({sortedPlayersForList.length}/{players.length})</span>
                  </h2>
                  {editingPlayerId && (
                    <button
                      type="button"
                      onClick={startCreatePlayer}
                      className="rounded-full border border-brand-primary/30 bg-brand-accent/20 px-3 py-1.5 text-xs font-semibold text-brand-primary"
                    >
                      + Nouveau
                    </button>
                  )}
                </div>
                <div className="mb-3 space-y-2">
                  <input
                    value={playerListQuery}
                    onChange={(e) => setPlayerListQuery(e.target.value)}
                    placeholder="Rechercher (nom, rôle, elo, champion)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                    <div className="flex gap-2 flex-wrap">
                    {(['name', 'elo'] as const).map((sortOption) => (
                      <button
                        key={sortOption}
                        type="button"
                        onClick={() => {
                          if (playerListSortBy === sortOption) {
                            setPlayerListSortDesc(!playerListSortDesc);
                          } else {
                            setPlayerListSortBy(sortOption);
                            setPlayerListSortDesc(false);
                          }
                        }}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          playerListSortBy === sortOption
                            ? 'bg-brand-primary text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {sortOption === 'name' && 'Nom'}
                        
                        {sortOption === 'elo' && 'Elo'}
                        {playerListSortBy === sortOption && (playerListSortDesc ? ' ↓' : ' ↑')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {players.length === 0 ? (
                    <p className="text-sm text-slate-600">Aucun joueur enregistré.</p>
                  ) : sortedPlayersForList.length === 0 ? (
                    <p className="text-sm text-slate-600">Aucun joueur ne correspond à la recherche.</p>
                  ) : (
                    sortedPlayersForList.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                          onClick={() => {
                          setPlayerForm({
                            name: player.name,
                            role: player.role || '',
                            elo: player.elo || '',
                            opgg: player.opgg || '',
                            favoriteChampion: player.favoriteChampion || '',
                            discord: player.discord || '',
                            twitter: player.twitter || '',
                            twitch: player.twitch || '',
                            instagram: player.instagram || '',
                            linkedin: player.linkedin || '',
                            teamStatus: player.teamStatus || undefined,
                            games: player.games || [],
                            gameElos: player.gameElos || {}
                          });
                          setEditingPlayerId(player.id);
                        }}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                          editingPlayerId === player.id
                            ? 'bg-brand-primary text-white'
                            : 'bg-slate-50 text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        {player.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Player Form */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmitPlayer} className="card-surface rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  {editingPlayerId ? `Modifier: ${playerForm.name}` : 'Ajouter un joueur'}
                </h2>

                  <div className="space-y-3">
                  <input
                    value={playerForm.name}
                    onChange={(e) => setPlayerForm((p) => ({ ...p, name: e.target.value }))}
                    required
                    placeholder="Nom"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <select
                    value={playerForm.elo}
                    onChange={(e) => setPlayerForm((p) => ({ ...p, elo: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Elo</option>
                    {ELO_OPTIONS.map((elo) => (
                      <option key={elo} value={elo}>
                        {elo}
                      </option>
                    ))}
                  </select>
                  <input
                    value={playerForm.opgg}
                    onChange={(e) => setPlayerForm((p) => ({ ...p, opgg: e.target.value }))}
                    placeholder="Lien OP.GG"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    value={playerForm.discord || ''}
                    onChange={(e) => setPlayerForm((p) => ({ ...p, discord: e.target.value }))}
                    placeholder="Discord (pseudo ou pseudo#1234)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  {isLeagueSelectedInPlayerForm && (
                  <div className="relative">
                    <input
                      value={playerForm.favoriteChampion}
                      onChange={(e) => {
                        setPlayerForm((p) => ({ ...p, favoriteChampion: e.target.value }));
                        setShowChampionSuggestions(true);
                      }}
                      onFocus={() => setShowChampionSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowChampionSuggestions(false), 150)}
                      placeholder="Champion favori"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    {showChampionSuggestions && championSuggestions.length > 0 && (
                      <ul className="absolute z-20 mt-1 max-h-44 w-full overflow-auto rounded-lg border bg-white shadow-lg">
                        {championSuggestions.map((c) => (
                          <li
                            key={c}
                            onMouseDown={() => {
                              setPlayerForm((p) => ({ ...p, favoriteChampion: c }));
                              setShowChampionSuggestions(false);
                            }}
                            className="cursor-pointer px-3 py-2 text-sm hover:bg-slate-100"
                          >
                            {c}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  )}
                  {/* Games + per-game elos */}
                  <div className="mt-3">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Jeux joués</label>
                    <div className="flex flex-wrap gap-2">
                      {games.length > 0 ? (
                        games.map((g) => {
                          const checked = (playerForm.games || []).some((pg) => gameKey(pg) === gameKey(g));
                          return (
                            <div key={g} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (!checked) {
                                    setPlayerForm((p) => ({ ...p, games: [...(p.games || []), g] }));
                                    return;
                                  }

                                  setPlayerForm((p) => {
                                    const nextGames = (p.games || []).filter((pg) => gameKey(pg) !== gameKey(g));
                                    const hasLol = nextGames.some((pg) => {
                                      const key = gameKey(pg);
                                      return key === gameKey('League Of Legends') || key === 'lol';
                                    });
                                    return {
                                      ...p,
                                      games: nextGames,
                                      favoriteChampion: hasLol ? p.favoriteChampion : ''
                                    };
                                  });
                                }}
                                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                                  checked
                                    ? 'border-brand-primary bg-brand-primary text-white'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                {checked ? '✓ ' : ''}{g}
                              </button>
                              {checked && (
                                <select
                                  value={(playerForm.gameElos || {})[g] || playerForm.elo || ''}
                                  onChange={(e) => setPlayerForm((p) => ({ ...p, gameElos: { ...(p.gameElos || {}), [g]: e.target.value } }))}
                                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                >
                                  <option value="">Elo spécifique</option>
                                  {ELO_OPTIONS.map((elo) => (
                                    <option key={elo} value={elo}>{elo}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <input
                          value={(playerForm.games || []).join(', ')}
                          onChange={(e) => setPlayerForm((p) => ({ ...p, games: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))}
                          placeholder="Jeux (séparés par des virgules)"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                        />
                      )}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      value={playerForm.twitch}
                      onChange={(e) => setPlayerForm((p) => ({ ...p, twitch: e.target.value }))}
                      placeholder="Lien Twitch"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <input
                      value={playerForm.twitter}
                      onChange={(e) => setPlayerForm((p) => ({ ...p, twitter: e.target.value }))}
                      placeholder="Lien X / Twitter"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <input
                      value={playerForm.instagram}
                      onChange={(e) => setPlayerForm((p) => ({ ...p, instagram: e.target.value }))}
                      placeholder="Lien Instagram"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <input
                      value={playerForm.linkedin}
                      onChange={(e) => setPlayerForm((p) => ({ ...p, linkedin: e.target.value }))}
                      placeholder="Lien LinkedIn"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button disabled={saving} type="submit" className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white">
                    {saving ? 'Sauvegarde...' : editingPlayerId ? 'Enregistrer' : 'Créer'}
                  </button>
                  {editingPlayerId && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleDeletePlayer(editingPlayerId)}
                      className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600"
                    >
                      Supprimer
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={startCreatePlayer}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                  >
                    Réinitialiser
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tournaments Tab */}
        {tab === 'tournaments' && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 card-surface rounded-2xl p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingCompetitionId ? 'Modifier le tournoi' : 'Nouveau tournoi'}
                </h2>
                {editingCompetitionId && (
                  <button
                    type="button"
                    onClick={resetCompetitionEditor}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    Annuler
                  </button>
                )}
              </div>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  saveCompetition();
                }}
                className="space-y-3"
              >
                <input
                  value={competitionForm.name}
                  onChange={(e) => setCompetitionForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nom du tournoi"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  required
                />
                <select
                  value={competitionForm.status}
                  onChange={(e) =>
                    setCompetitionForm((prev) => ({
                      ...prev,
                      status: e.target.value as 'upcoming' | 'active' | 'completed'
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="upcoming">A venir</option>
                  <option value="active">En cours</option>
                  <option value="completed">Termine</option>
                </select>
                <textarea
                  value={competitionForm.description}
                  onChange={(e) => setCompetitionForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Description, format, règles, infos utiles..."
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    type="date"
                    value={competitionForm.startDate}
                    onChange={(e) => setCompetitionForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    type="date"
                    value={competitionForm.endDate}
                    onChange={(e) => setCompetitionForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <input
                  value={competitionForm.bracketUrl}
                  onChange={(e) => setCompetitionForm((prev) => ({ ...prev, bracketUrl: e.target.value }))}
                  placeholder="Lien arbre de tournoi (Toornament, Challonge, etc.)"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  value={competitionForm.infoUrl}
                  onChange={(e) => setCompetitionForm((prev) => ({ ...prev, infoUrl: e.target.value }))}
                  placeholder="Lien d'information (annonce, règlement, etc.)"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="w-full rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  {editingCompetitionId ? 'Enregistrer les modifications' : 'Créer le tournoi'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 card-surface rounded-2xl p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">Tournois ({competitions.length})</h2>
                <p className="text-xs text-slate-500">Clique sur un tournoi pour le modifier</p>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCompetitionStatusFilter('all')}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    competitionStatusFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Tous
                </button>
                {(['upcoming', 'active', 'completed'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setCompetitionStatusFilter(status)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                      competitionStatusFilter === status
                        ? 'bg-brand-primary text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {competitionStatusLabel[status]}
                  </button>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {filteredCompetitions.length === 0 ? (
                  <p className="text-sm text-slate-600">Aucun tournoi enregistré.</p>
                ) : (
                  filteredCompetitions.map((competition) => (
                    <article
                      key={competition.id}
                      className={`rounded-xl border p-4 transition ${
                        editingCompetitionId === competition.id
                          ? 'border-brand-primary bg-brand-primary/5'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">{competition.name}</h3>
                          <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-700">
                            {competitionStatusLabel[(competition.status || 'upcoming') as 'upcoming' | 'active' | 'completed']}
                          </span>
                          {(competition.startDate || competition.endDate) && (
                            <p className="mt-1 text-xs text-slate-500">
                              {toDateInputValue(competition.startDate) || 'Date inconnue'}
                              {competition.endDate ? ` -> ${toDateInputValue(competition.endDate)}` : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEditCompetition(competition)}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCompetition(competition)}
                            className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>

                      {competition.description && (
                        <p className="mt-2 line-clamp-3 text-xs text-slate-600">{competition.description}</p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        {competition.bracketUrl && (
                          <a
                            href={competition.bracketUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full border border-brand-primary/30 bg-brand-primary/10 px-2 py-1 text-[11px] font-semibold text-brand-primary"
                          >
                            Arbre
                          </a>
                        )}
                        {competition.infoUrl && (
                          <a
                            href={competition.infoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700"
                          >
                            Infos
                          </a>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Teams Tab */}
        {tab === 'teams' && (
          <>
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
              {/* Teams List */}
              <div className="lg:col-span-1">
                <div className="card-surface rounded-2xl p-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h2 className="text-lg font-semibold text-slate-900">
                      Équipes <span className="text-sm text-slate-500">({teamsByGame.length})</span>
                    </h2>
                    {editingTeamId && (
                      <button
                        type="button"
                        onClick={startCreateTeam}
                        className="rounded-full border border-brand-primary/30 bg-brand-accent/20 px-3 py-1.5 text-xs font-semibold text-brand-primary"
                      >
                        + Nouvelle
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-4">Glissez-déposez pour réorganiser</p>
                  <div className="space-y-2">
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
                              competition: team.competition || '',
                              level: team.level,
                              record: team.record,
                              description: '',
                              playerIds: team.playerIds || [],
                              playerAssignments: team.playerAssignments || [],
                              nextMatches: team.nextMatches || [],
                              twitchLinks: team.twitchLinks || [],
                              multiopggUrl: team.multiopggUrl || ''
                            });
                            setEditingTeamId(team.id);
                          }}
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition border-2 border-transparent ${
                            editingTeamId === team.id
                              ? 'bg-brand-primary text-white'
                              : draggedTeamId === team.id
                                ? 'bg-slate-50 text-slate-900 opacity-50'
                                : dragOverTeamId === team.id
                                  ? 'border-blue-400 bg-blue-100 text-slate-900'
                                  : 'bg-slate-50 text-slate-900 hover:bg-slate-100'
                          } cursor-move`}
                        >
                          <span className="mr-2">⋮⋮</span>
                          {team.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Team Form */}
              <div className="lg:col-span-2">
                <form onSubmit={handleSubmitTeam} className="card-surface rounded-2xl p-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-slate-900">
                      {editingTeamId ? `Modifier: ${form.name}` : 'Ajouter une équipe'}
                    </h2>
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? 'Sauvegarde...' : editingTeamId ? 'Enregistrer' : 'Créer'}
                    </button>
                  </div>

                  <div className="space-y-3">
                    <input
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      required
                      placeholder="Nom"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <div className="grid gap-3 md:grid-cols-2">
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
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <input
                        value={form.level}
                        onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))}
                        placeholder="Niveau"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <input
                      value={form.record}
                      onChange={(e) => setForm((p) => ({ ...p, record: e.target.value }))}
                      placeholder="Palmarès"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <input
                      value={form.multiopggUrl}
                      onChange={(e) => setForm((p) => ({ ...p, multiopggUrl: e.target.value }))}
                      placeholder="Lien Multi OP.GG"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>

                  {/* Players Selection */}
                  <div className="mt-6 border-t border-slate-200 pt-6">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Joueurs ({form.playerIds?.length || 0})</h3>
                    
                    {/* Sort Controls */}
                    <div className="mb-3 flex gap-2 flex-wrap">
                      {(['name', 'elo'] as const).map((sortOption) => (
                        <button
                          key={sortOption}
                          type="button"
                          onClick={() => {
                            if (playerSortBy === sortOption) {
                              setPlayerSortDesc(!playerSortDesc);
                            } else {
                              setPlayerSortBy(sortOption);
                              setPlayerSortDesc(false);
                            }
                          }}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            playerSortBy === sortOption
                              ? 'bg-brand-primary text-white'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {sortOption === 'name' && 'Nom'}
                          {sortOption === 'elo' && 'Elo'}
                          {playerSortBy === sortOption && (playerSortDesc ? ' ↓' : ' ↑')}
                        </button>
                      ))}
                    </div>

                    {/* Selected players pane */}
                    {(form.playerIds || []).length > 0 && (
                      <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
                        <h4 className="text-sm font-semibold mb-2">Joueurs sélectionnés ({(form.playerIds || []).length})</h4>
                        <div className="space-y-2">
                          {effectivePlayerAssignments.map((a) => {
                            const player = players.find((p) => p.id === a.id);
                            if (!player) return null;
                            return (
                              <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg border border-slate-100">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{player.name}</div>
                                  <div className="text-xs text-slate-500">{player.role || ''}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <select
                                    value={a.role || ''}
                                    onChange={(e) => setAssignmentRoleForPlayer(a.id, e.target.value || undefined)}
                                    className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                  >
                                    <option value="">Rôle (par équipe)</option>
                                    <option value="Top">Top</option>
                                    <option value="Jungle">Jungle</option>
                                    <option value="Mid">Mid</option>
                                    <option value="ADC">ADC</option>
                                    <option value="Support">Support</option>
                                    <option value="Sub">Sub</option>
                                  </select>
                                  <button
                                    type="button"
                                    title="Définir capitaine"
                                    onClick={() => setCaptainForPlayer(a.id)}
                                    className={`px-3 py-1 rounded-md text-sm ${a.isCaptain ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-700'}`}
                                  >
                                    Capitaine
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setForm((p) => ({
                                        ...p,
                                        playerAssignments: effectivePlayerAssignments.map((x) =>
                                          x.id === a.id ? { ...x, isSub: !x.isSub } : x
                                        )
                                      }));
                                    }}
                                    className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                                      a.isSub
                                        ? 'border-amber-400 bg-amber-100 text-amber-800'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                    }`}
                                  >
                                    Sub
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const ids = form.playerIds || [];
                                      setForm((p) => ({ ...p, playerIds: ids.filter((id) => id !== a.id), playerAssignments: (p.playerAssignments || []).filter((x) => x.id !== a.id) }));
                                    }}
                                    className="text-red-600 px-2 py-1"
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Players Grid/Table */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <div className="grid gap-0 border-b border-slate-200 bg-slate-50">
                        <div className="grid grid-cols-12 gap-0 p-3 text-xs font-semibold text-slate-700">
                          <div className="col-span-1"></div>
                          <div className="col-span-7">Nom</div>
                          <div className="col-span-4">Elo</div>
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto">
                        {players.length === 0 ? (
                          <p className="p-4 text-sm text-slate-500">Aucun joueur disponible. Créez d&apos;abord un joueur dans l&apos;onglet Joueurs.</p>
                        ) : sortedPlayersForTeam.length === 0 ? (
                          <p className="p-4 text-sm text-slate-500">Aucun joueur correspondant.</p>
                        ) : (
                          sortedPlayersForTeam.map((player) => {
                            const isSelected = isPlayerSelectedInForm(player.id);
                            return (
                              <div
                                key={player.id}
                                onClick={() => togglePlayerInForm(player.id, player.role)}
                                className={`grid grid-cols-12 gap-0 p-3 border-b border-slate-200 transition cursor-pointer ${
                                  isSelected ? 'bg-brand-accent/10' : 'hover:bg-slate-50'
                                }`}
                              >
                                  <div className="col-span-1 flex items-center">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        togglePlayerInForm(player.id, player.role);
                                      }}
                                      className={`h-6 w-6 flex items-center justify-center rounded-md border-2 text-xs ${isSelected ? 'bg-brand-primary text-white border-brand-primary' : 'bg-white border-slate-300 text-transparent'}`}
                                    >
                                      {isSelected ? '✓' : ''}
                                    </button>
                                  </div>
                                  <div className="col-span-7 text-sm font-medium text-slate-900">
                                    <span>{player.name}</span>
                                  </div>
                                  <div className="col-span-4 text-sm text-slate-600">{getGameEloForPlayer(player, form.game) || '-'}</div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Matches / Résultats */}
                  <div className="mt-6 border-t border-slate-200 pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-900">Matches ({(form.nextMatches || []).length})</h3>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={addMatch}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold"
                        >
                          + Ajouter un match
                        </button>
                      </div>
                    </div>

                    {(form.nextMatches || []).length === 0 ? (
                      <p className="text-sm text-slate-600">Aucun match enregistré pour cette équipe.</p>
                    ) : (
                      <div className="space-y-3">
                        {(form.nextMatches || []).map((match) => (
                          <div key={match.id} className="rounded-lg border p-3 bg-white">
                            <div className="grid gap-2 md:grid-cols-2">
                              <input
                                value={match.opponent || ''}
                                onChange={(e) => updateMatchField(match.id, 'opponent', e.target.value)}
                                placeholder="Adversaire"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              />
                              <input
                                type="datetime-local"
                                value={formatDatetimeForInput(match.datetime)}
                                onChange={(e) => updateMatchField(match.id, 'datetime', parseDatetimeToISO(e.target.value))}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              />
                            </div>
                            <div className="grid gap-2 md:grid-cols-3 mt-2">
                              <select
                                value={match.competition || ''}
                                onChange={(e) => updateMatchField(match.id, 'competition', e.target.value || undefined)}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              >
                                <option value="">Aucun tournoi</option>
                                {competitionNames.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                              <input
                                value={match.stage || ''}
                                onChange={(e) => updateMatchField(match.id, 'stage', e.target.value)}
                                placeholder="Phase / Stage"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              />
                              <input
                                value={match.streamUrl || ''}
                                onChange={(e) => updateMatchField(match.id, 'streamUrl', e.target.value)}
                                placeholder="Lien stream"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              />
                            </div>

                            <div className="mt-3 grid gap-2 md:grid-cols-3 items-center">
                              <div className="flex items-center gap-2">
                                <label className="text-sm text-slate-700">Score équipe</label>
                                <input
                                  type="number"
                                  value={typeof match.teamScore === 'number' ? String(match.teamScore) : ''}
                                  onChange={(e) => {
                                    const v = e.target.value.trim();
                                    updateMatchField(match.id, 'teamScore', v === '' ? undefined : Number(v));
                                  }}
                                  className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="text-sm text-slate-700">Score adversaire</label>
                                <input
                                  type="number"
                                  value={typeof match.opponentScore === 'number' ? String(match.opponentScore) : ''}
                                  onChange={(e) => {
                                    const v = e.target.value.trim();
                                    updateMatchField(match.id, 'opponentScore', v === '' ? undefined : Number(v));
                                  }}
                                  className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  value={match.mvp || ''}
                                  onChange={(e) => updateMatchField(match.id, 'mvp', e.target.value)}
                                  placeholder="MVP"
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                              <div className="flex gap-2">
                                <input
                                  value={match.vodUrl || ''}
                                  onChange={(e) => updateMatchField(match.id, 'vodUrl', e.target.value)}
                                  placeholder="Lien VOD"
                                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => removeMatch(match.id)}
                                  className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600"
                                >
                                  Supprimer
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button disabled={saving} type="submit" className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white">
                      {saving ? 'Sauvegarde...' : editingTeamId ? 'Enregistrer' : 'Créer'}
                    </button>
                    {editingTeamId && (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleDeleteTeam(editingTeamId)}
                        className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600"
                      >
                        Supprimer
                      </button>
                    )}
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
          </>
        )}

        {/* Games Tab */}
        {tab === 'games' && (
          <div className="card-surface rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Configuration des Jeux</h2>
            <p className="text-sm text-slate-600 mb-4">Configurez la taille d&apos;équipe requise pour chaque jeu.</p>
            
            <div className="space-y-3">
              {gamesWithTeamSize.length > 0 ? (
                gamesWithTeamSize.map((game) => (
                  <div key={game.name} className="flex items-center justify-between gap-4 p-3 border border-slate-200 rounded-lg">
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{game.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <label htmlFor={`teamsize-${game.name}`} className="text-sm text-slate-600">
                        Joueurs par équipe:
                      </label>
                      <input
                        id={`teamsize-${game.name}`}
                        type="number"
                        min="1"
                        max="10"
                        value={game.teamSize}
                        onChange={(e) => {
                          const newTeamSize = parseInt(e.currentTarget.value, 10);
                          if (!isNaN(newTeamSize) && newTeamSize > 0) {
                            handleUpdateGameTeamSize(game.name, newTeamSize);
                          }
                        }}
                        disabled={updatingGameName === game.name}
                        className="w-16 rounded border border-slate-300 px-2 py-1 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-6">Aucun jeu trouvé.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
