'use client';

import Image from 'next/image';
import { DragEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ManagedOrgContentSettings, ManagedOrgMember } from '@/lib/types';

type OrgaFormState = {
  pole: string;
  name: string;
  role: string;
  description: string;
  discord: string;
  linkedin: string;
  twitter: string;
  instagram: string;
  twitch: string;
  memberId?: string;
};

function createInitialForm(pole = ''): OrgaFormState {
  return {
    pole,
    name: '',
    role: '',
    description: '',
    discord: '',
    linkedin: '',
    twitter: '',
    instagram: '',
    twitch: ''
  };
}

const initialForm: OrgaFormState = {
  pole: '',
  name: '',
  role: '',
  description: '',
  discord: '',
  linkedin: '',
  twitter: '',
  instagram: '',
  twitch: ''
};

async function readApiError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

function buildOrgFormData(
  payload: Pick<ManagedOrgMember, 'pole' | 'name' | 'role' | 'description' | 'discord' | 'linkedin' | 'twitter' | 'instagram' | 'twitch'> & {
    photo?: string;
  },
  file: File | null
) {
  const formData = new FormData();
  formData.append('pole', payload.pole || '');
  formData.append('name', payload.name || '');
  formData.append('role', payload.role || '');
  formData.append('description', payload.description || '');
  formData.append('discord', payload.discord || '');
  formData.append('linkedin', payload.linkedin || '');
  formData.append('twitter', payload.twitter || '');
  formData.append('instagram', payload.instagram || '');
  formData.append('twitch', payload.twitch || '');
  formData.append('photo', payload.photo || '');
  if (file) {
    formData.append('photoFile', file);
  }
  return formData;
}

function splitContentBlocks(rawContent: string): string[] {
  const normalized = rawContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const blocks: string[] = [];
  let currentBlock: string[] = [];

  for (const line of lines) {
    if (line.trim().length === 0) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock.join('\n').trim());
        currentBlock = [];
      }
      continue;
    }

    currentBlock.push(line);
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join('\n').trim());
  }

  return blocks.filter(Boolean);
}

function renderInlineFormatting(text: string): ReactNode[] {
  const chunks = text.split(/(\*\*[^*]+\*\*|~~[^~]+~~|\+\+[^+]+\+\+)/g);

  return chunks.map((chunk, index) => {
    if (chunk.startsWith('**') && chunk.endsWith('**') && chunk.length > 4) {
      return <strong key={`bold-${index}`}>{chunk.slice(2, -2)}</strong>;
    }

    if (chunk.startsWith('~~') && chunk.endsWith('~~') && chunk.length > 4) {
      return <s key={`strike-${index}`}>{chunk.slice(2, -2)}</s>;
    }

    if (chunk.startsWith('++') && chunk.endsWith('++') && chunk.length > 4) {
      return <u key={`underline-${index}`}>{chunk.slice(2, -2)}</u>;
    }

    return <span key={`text-${index}`}>{chunk}</span>;
  });
}

function renderDescriptionBlock(block: string, key: string): ReactNode {
  const trimmed = block.trim();

  if (trimmed.startsWith('### ')) {
    return <h4 key={key} className="text-sm font-semibold text-slate-800">{renderInlineFormatting(trimmed.slice(4))}</h4>;
  }

  if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
    const title = trimmed.startsWith('## ') ? trimmed.slice(3) : trimmed.slice(2);
    return <h3 key={key} className="text-base font-semibold text-slate-800">{renderInlineFormatting(title)}</h3>;
  }

  const lines = trimmed.split('\n').filter((line) => line.trim().length > 0);

  return (
    <p key={key}>
      {lines.map((line, index) => (
        <span key={`${key}-line-${index}`}>
          {index > 0 && <br />}
          {renderInlineFormatting(line)}
        </span>
      ))}
    </p>
  );
}

export default function AdminOrgaPage() {
  const [members, setMembers] = useState<ManagedOrgMember[]>([]);
  const [poles, setPoles] = useState<string[]>([]);
  const [selectedPole, setSelectedPole] = useState<string>('');
  const [aboutDescription, setAboutDescription] = useState<string>('');
  const [poleDescriptions, setPoleDescriptions] = useState<Record<string, string>>({});
  const [selectedPoleDescription, setSelectedPoleDescription] = useState<string>('');
  const [savingOrgContent, setSavingOrgContent] = useState(false);
  const [form, setForm] = useState<OrgaFormState>(initialForm);
  const [newPoleName, setNewPoleName] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [draggedPole, setDraggedPole] = useState<string | null>(null);
  const [dragOverPole, setDragOverPole] = useState<string | null>(null);

  async function loadMembers() {
    const res = await fetch('/api/managed/org-members', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(await readApiError(res, 'Impossible de charger les membres.'));
    }
    const data = (await res.json()) as ManagedOrgMember[];
    setMembers(Array.isArray(data) ? data : []);
  }

  async function loadPoles() {
    const res = await fetch('/api/managed/org-poles', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(await readApiError(res, 'Impossible de charger les categories.'));
    }
    const data = (await res.json()) as string[];
    setPoles(Array.isArray(data) ? data : []);
  }

  async function loadOrgContent() {
    const res = await fetch('/api/managed/org-content', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(await readApiError(res, 'Impossible de charger les contenus de la page asso.'));
    }

    const data = (await res.json()) as ManagedOrgContentSettings;
    setAboutDescription(typeof data.aboutDescription === 'string' ? data.aboutDescription : '');
    setPoleDescriptions(data.poleDescriptions && typeof data.poleDescriptions === 'object' ? data.poleDescriptions : {});
  }

  useEffect(() => {
    Promise.all([loadMembers(), loadPoles(), loadOrgContent()]).catch((err) => {
      setMembers([]);
      setPoles([]);
      setError(err instanceof Error ? err.message : 'Le chargement des membres a échoué.');
    });
  }, []);

  useEffect(() => {
    if (poles.length === 0) {
      return;
    }

    setSelectedPole((current) => (current && poles.includes(current) ? current : poles[0]));
    setForm((current) => (current.pole && poles.includes(current.pole) ? current : { ...current, pole: poles[0] }));
  }, [poles]);

  useEffect(() => {
    if (!selectedPole) {
      setSelectedPoleDescription('');
      return;
    }

    setSelectedPoleDescription(poleDescriptions[selectedPole] || '');
  }, [selectedPole, poleDescriptions]);

  const membersByPole = useMemo(() => {
    const filtered = members.filter((m) => m.pole === selectedPole);
    return filtered.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [members, selectedPole]);

  async function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback('');
    setError('');
    setSaving(true);

    try {
      if (form.memberId) {
        // Mode édition: modification d'un membre existant
        const res = await fetch(`/api/managed/org-members/${form.memberId}`, {
          method: 'PUT',
          body: buildOrgFormData(form, photoFile)
        });

        if (!res.ok) {
          throw new Error(await readApiError(res, 'Modification impossible.'));
        }

        const updated = (await res.json()) as ManagedOrgMember;
        setSelectedPole(updated.pole);
        setForm({
          pole: updated.pole,
          name: updated.name,
          role: updated.role,
          description: updated.description || '',
          discord: updated.discord || '',
          linkedin: updated.linkedin || '',
          twitter: updated.twitter || '',
          instagram: updated.instagram || '',
          twitch: updated.twitch || '',
          memberId: updated.id
        });
        setPhotoFile(null);
        await loadMembers();
        setFeedback('Membre modifié avec succès.');
      } else {
        // Mode création: ajout d'un nouveau membre
        const res = await fetch('/api/managed/org-members', {
          method: 'POST',
          body: buildOrgFormData(form, photoFile)
        });

        if (!res.ok) {
          throw new Error(await readApiError(res, 'Ajout impossible.'));
        }

        setForm(createInitialForm(selectedPole));
        setPhotoFile(null);
        await loadMembers();
        setFeedback('Membre ajouté avec succès.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMember(id: string) {
    const confirmed = window.confirm('Êtes-vous sûr ?');
    if (!confirmed) return;

    setFeedback('');
    setError('');
    setSaving(true);

    try {
      const res = await fetch(`/api/managed/org-members/${id}`, { method: 'DELETE' });

      if (!res.ok) {
        throw new Error(await readApiError(res, 'Suppression impossible.'));
      }

      if (form.memberId === id) {
        setForm(createInitialForm(selectedPole));
        setPhotoFile(null);
      }

      await loadMembers();
      setFeedback('Membre supprimé avec succès.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  }

  function handleSelectMember(member: ManagedOrgMember) {
    setSelectedPole(member.pole);
    setForm({
      pole: member.pole,
      name: member.name,
      role: member.role,
      description: member.description || '',
      discord: member.discord || '',
      linkedin: member.linkedin || '',
      twitter: member.twitter || '',
      instagram: member.instagram || '',
      twitch: member.twitch || '',
      memberId: member.id
    });
    setPhotoFile(null);
  }

  function handleCancelEdit() {
    setForm(createInitialForm(selectedPole));
    setPhotoFile(null);
  }

  async function handleDragStart(memberId: string) {
    setDraggedItemId(memberId);
  }

  function handleDragOver(e: any, memberId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItemId(memberId);
  }

  async function handleDrop(e: any, droppedOnMemberId: string) {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === droppedOnMemberId) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    // Réorganiser localement
    const newOrder = [...membersByPole];
    const draggedIndex = newOrder.findIndex((m) => m.id === draggedItemId);
    const dropIndex = newOrder.findIndex((m) => m.id === droppedOnMemberId);

    if (draggedIndex === -1 || dropIndex === -1) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    // Déplacer l'élément
    const [draggedMember] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedMember);

    // Mettre à jour localement
    const updatedMembers = members.map((m) => {
      if (m.pole === selectedPole) {
        const index = newOrder.findIndex((n) => n.id === m.id);
        return { ...m, order: index };
      }
      return m;
    });
    setMembers(updatedMembers);

    // Sauvegarder sur le serveur
    try {
      const res = await fetch('/api/managed/org-members/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pole: selectedPole,
          orderedIds: newOrder.map((m) => m.id)
        })
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, 'Réorganisation impossible.'));
      }

      setFeedback('Ordre sauvegardé avec succès.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde de l\'ordre.');
      // Recharger pour réinitialiser l'état
      await loadMembers();
    } finally {
      setDraggedItemId(null);
      setDragOverItemId(null);
    }
  }

  function handleDragEnd() {
    setDraggedItemId(null);
    setDragOverItemId(null);
  }

  async function handleAddPole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newPoleName.trim();
    if (!name) {
      return;
    }

    setFeedback('');
    setError('');

    try {
      const res = await fetch('/api/managed/org-poles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, 'Ajout de categorie impossible.'));
      }

      const nextPoles = (await res.json()) as string[];
      const normalizedPoles = Array.isArray(nextPoles) ? nextPoles : [];
      setPoles(normalizedPoles);
      setNewPoleName('');

      const selected = normalizedPoles.find((pole) => pole.toLowerCase() === name.toLowerCase()) || normalizedPoles[normalizedPoles.length - 1] || '';
      if (selected) {
        setSelectedPole(selected);
        setForm(createInitialForm(selected));
      }

      setPhotoFile(null);
      setFeedback('Categorie ajoutee avec succes.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    }
  }

  async function handleSaveOrgContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPole) {
      return;
    }

    setFeedback('');
    setError('');
    setSavingOrgContent(true);

    const nextPoleDescriptions = {
      ...poleDescriptions,
      [selectedPole]: selectedPoleDescription.trim()
    };

    try {
      const res = await fetch('/api/managed/org-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aboutDescription,
          poleDescriptions: nextPoleDescriptions
        })
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, 'Mise a jour du contenu asso impossible.'));
      }

      const saved = (await res.json()) as ManagedOrgContentSettings;
      setAboutDescription(typeof saved.aboutDescription === 'string' ? saved.aboutDescription : aboutDescription);
      setPoleDescriptions(saved.poleDescriptions && typeof saved.poleDescriptions === 'object' ? saved.poleDescriptions : nextPoleDescriptions);
      setFeedback('Contenus asso sauvegardes avec succes.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSavingOrgContent(false);
    }
  }

  function handlePoleDragStart(pole: string) {
    setDraggedPole(pole);
  }

  function handlePoleDragOver(event: DragEvent<HTMLButtonElement>, pole: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverPole(pole);
  }

  async function handlePoleDrop(event: DragEvent<HTMLButtonElement>, dropPole: string) {
    event.preventDefault();

    if (!draggedPole || draggedPole === dropPole) {
      setDraggedPole(null);
      setDragOverPole(null);
      return;
    }

    const nextPoles = [...poles];
    const draggedIndex = nextPoles.findIndex((pole) => pole === draggedPole);
    const dropIndex = nextPoles.findIndex((pole) => pole === dropPole);

    if (draggedIndex === -1 || dropIndex === -1) {
      setDraggedPole(null);
      setDragOverPole(null);
      return;
    }

    const [dragged] = nextPoles.splice(draggedIndex, 1);
    nextPoles.splice(dropIndex, 0, dragged);
    setPoles(nextPoles);

    try {
      const res = await fetch('/api/managed/org-poles/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedPoles: nextPoles })
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, 'Reorganisation des categories impossible.'));
      }

      setFeedback('Ordre des categories sauvegarde avec succes.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde des categories.');
      await loadPoles();
    } finally {
      setDraggedPole(null);
      setDragOverPole(null);
    }
  }

  function handlePoleDragEnd() {
    setDraggedPole(null);
    setDragOverPole(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-slate-900">Admin - Organisation</h1>
        <p className="mt-1 text-sm text-slate-600">Gérez les membres de l&apos;organisation par pôle.</p>
      </div>

      {feedback ? (
        <p className="mx-auto mt-4 max-w-7xl rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {feedback}
        </p>
      ) : null}
      {error ? (
        <p className="mx-auto mt-4 max-w-7xl rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {/* Pôles sélecteur */}
      <div className="card-surface mx-auto mt-6 max-w-7xl rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-slate-900">Pôles</h2>
        <p className="mt-1 text-xs text-slate-500">Glissez-deposez les categories pour les reordonner.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {poles.map((pole) => (
            <button
              key={pole}
              type="button"
              draggable
              onDragStart={() => handlePoleDragStart(pole)}
              onDragOver={(event) => handlePoleDragOver(event, pole)}
              onDrop={(event) => handlePoleDrop(event, pole)}
              onDragEnd={handlePoleDragEnd}
              onClick={() => {
                setSelectedPole(pole);
                setForm(createInitialForm(pole));
                setPhotoFile(null);
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                selectedPole === pole
                  ? 'bg-brand-primary text-white'
                  : draggedPole === pole
                    ? 'bg-slate-200 text-slate-700 opacity-60'
                    : dragOverPole === pole
                      ? 'bg-blue-100 text-slate-700 border-2 border-blue-400'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              } cursor-move border-2 border-transparent`}
            >
              <span className="mr-1">⋮⋮</span>
              {pole}
            </button>
          ))}
        </div>
        <form onSubmit={handleAddPole} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={newPoleName}
            onChange={(event) => setNewPoleName(event.target.value)}
            placeholder="Nouvelle categorie (ex: Caster)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm sm:max-w-xs"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
          >
            Ajouter la categorie
          </button>
        </form>
      </div>

      <div className="card-surface mx-auto mt-6 max-w-7xl rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-slate-900">Textes de la page asso</h2>
        <p className="mt-1 text-xs text-slate-500">
          Modifiez le sous-texte du pôle selectionne et le paragraphe A propos de la page L&apos;asso.
        </p>
        <form onSubmit={handleSaveOrgContent} className="mt-4 grid gap-3">
          <label className="text-sm font-semibold text-slate-800">Sous-texte du pôle: {selectedPole || 'Aucun pôle'}</label>
          <textarea
            value={selectedPoleDescription}
            onChange={(event) => setSelectedPoleDescription(event.target.value)}
            placeholder="Ex: Commentaire des matchs, animation des lives et des events"
            rows={2}
            disabled={!selectedPole}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
          />

          <label className="text-sm font-semibold text-slate-800">Texte A propos (section l&apos;asso)</label>
          <textarea
            value={aboutDescription}
            onChange={(event) => setAboutDescription(event.target.value)}
            rows={4}
            placeholder="Texte affiche sous le titre de la page association."
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />

          <div>
            <button
              type="submit"
              disabled={savingOrgContent || !selectedPole}
              className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {savingOrgContent ? 'Sauvegarde...' : 'Sauvegarder les textes'}
            </button>
          </div>
        </form>
      </div>

      <div className="mx-auto mt-6 max-w-7xl grid gap-6 lg:grid-cols-3">
        {/* Liste membres du pôle */}
        <div className="lg:col-span-1">
          <div className="card-surface rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Membres <span className="text-sm text-slate-500">({membersByPole.length})</span>
            </h2>
            <p className="mt-1 text-xs text-slate-500">Glissez-déposez pour réorganiser</p>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="mt-3 w-full rounded-lg border border-dashed border-brand-primary bg-brand-primary/5 px-3 py-2 text-sm font-semibold text-brand-primary hover:bg-brand-primary/10 transition"
            >
              + Ajouter un nouveau membre
            </button>
            <div className="mt-4 space-y-2">
              {membersByPole.length === 0 ? (
                <p className="text-sm text-slate-600">Aucun membre dans ce pôle.</p>
              ) : (
                membersByPole.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    draggable
                    onDragStart={() => handleDragStart(member.id)}
                    onDragOver={(e) => handleDragOver(e, member.id)}
                    onDrop={(e) => handleDrop(e, member.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleSelectMember(member)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                      form.memberId === member.id
                        ? 'bg-brand-primary text-white'
                        : draggedItemId === member.id
                          ? 'opacity-50 bg-slate-50 text-slate-900'
                          : dragOverItemId === member.id
                            ? 'bg-blue-100 text-slate-900 border-2 border-blue-400'
                            : 'bg-slate-50 text-slate-900 hover:bg-slate-100'
                    } cursor-move border-2 border-transparent`}
                  >
                    <span className="text-lg mr-2">⋮⋮</span>
                    {member.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Formulaire + Aperçu */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleFormSubmit} className="card-surface rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {form.memberId ? `Modifier: ${form.name}` : 'Ajouter un membre'}
            </h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <select
                value={form.pole}
                onChange={(e) => setForm((p) => ({ ...p, pole: e.target.value }))}
                required
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                {poles.map((pole) => (
                  <option key={pole} value={pole}>
                    {pole}
                  </option>
                ))}
              </select>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
                placeholder="Nom complet"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                required
                placeholder="Rôle"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Description (bio, rôle, etc). Ligne vide = nouveau paragraphe. **gras** ++souligné++ ~~barré~~"
                rows={3}
                className="md:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={form.discord}
                onChange={(e) => setForm((p) => ({ ...p, discord: e.target.value }))}
                placeholder="Discord (pseudo ou pseudo#1234)"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={form.linkedin}
                onChange={(e) => setForm((p) => ({ ...p, linkedin: e.target.value }))}
                placeholder="LinkedIn (https://...)"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={form.twitter}
                onChange={(e) => setForm((p) => ({ ...p, twitter: e.target.value }))}
                placeholder="Twitter/X (https://...)"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={form.instagram}
                onChange={(e) => setForm((p) => ({ ...p, instagram: e.target.value }))}
                placeholder="Instagram (https://...)"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <input
                value={form.twitch}
                onChange={(e) => setForm((p) => ({ ...p, twitch: e.target.value }))}
                placeholder="Twitch (https://...)"
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <button
                disabled={saving}
                className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Sauvegarde...' : form.memberId ? 'Mettre à jour' : 'Ajouter'}
              </button>
              {form.memberId && (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMember(form.memberId!)}
                    disabled={saving}
                    className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"
                  >
                    Supprimer
                  </button>
                </>
              )}
            </div>
          </form>

          {form.memberId && members.find((m) => m.id === form.memberId) && (
            <MemberDetailsPreview member={members.find((m) => m.id === form.memberId)!} />
          )}
        </div>
      </div>
    </div>
  );
}

function MemberDetailsPreview({ member }: { member: ManagedOrgMember }) {
  return (
    <div className="card-surface rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-slate-900">Aperçu</h2>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-600">Informations</p>
          <p className="mt-2 text-base font-semibold text-slate-900">{member.name}</p>
          <p className="text-sm text-slate-600">{member.role}</p>
          <p className="text-xs text-slate-500">{member.pole}</p>
          {member.description && (
            <div className="mt-2 text-sm leading-7 text-slate-700">
              {splitContentBlocks(member.description).map((block, index) => (
                <div key={`org-preview-block-${index}`} className="mb-4 last:mb-0">
                  {renderDescriptionBlock(block, `org-preview-description-${index}`)}
                </div>
              ))}
            </div>
          )}
        </div>
        {member.photo && (
          <div>
            <p className="text-xs font-semibold uppercase text-slate-600">Photo</p>
            <Image
              src={member.photo}
              alt={member.name}
              width={160}
              height={160}
              className="mt-2 h-40 w-40 rounded-lg object-cover"
              unoptimized
            />
          </div>
        )}
      </div>
    </div>
  );
}
