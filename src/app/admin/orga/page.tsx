'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ORG_POLES, type ManagedOrgMember } from '@/lib/types';

type OrgaFormState = { pole: string; name: string; role: string; description: string };

const initialForm: OrgaFormState = { pole: ORG_POLES[0], name: '', role: '', description: '' };

export default function AdminOrgaPage() {
  const [members, setMembers] = useState<ManagedOrgMember[]>([]);
  const [openMemberId, setOpenMemberId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [error, setError] = useState<string>('');

  async function loadMembers() {
    const res = await fetch('/api/managed/org-members', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error('Impossible de charger les membres.');
    }
    const data = (await res.json()) as ManagedOrgMember[];
    setMembers(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    loadMembers().catch(() => {
      setMembers([]);
      setError('Le chargement des membres a echoue.');
    });
  }, []);

  async function createMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback('');
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/managed/org-members', {
        method: 'POST',
        body: buildOrgFormData(form, photoFile)
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, 'Ajout impossible.'));
      }

      setForm(initialForm);
      setPhotoFile(null);
      await loadMembers();
      setFeedback('Membre ajoute avec succes.');
    } finally {
      setSaving(false);
    }
  }

  async function updateMember(id: string, payload: Omit<ManagedOrgMember, 'id'>, file: File | null) {
    setFeedback('');
    setError('');

    const res = await fetch(`/api/managed/org-members/${id}`, {
      method: 'PUT',
      body: buildOrgFormData(payload, file)
    });

    if (!res.ok) {
      throw new Error(await readApiError(res, 'Modification impossible.'));
    }

    await loadMembers();
    setFeedback('Membre modifie avec succes.');
  }

  async function deleteMember(id: string) {
    setFeedback('');
    setError('');

    const res = await fetch(`/api/managed/org-members/${id}`, { method: 'DELETE' });

    if (!res.ok) {
      throw new Error(await readApiError(res, 'Suppression impossible.'));
    }

    await loadMembers();
    setOpenMemberId((current) => (current === id ? null : current));
    setFeedback('Membre supprime avec succes.');
  }

  function handleToggleMember(id: string) {
    setOpenMemberId((current) => (current === id ? null : id));
  }

  async function handleUpdateMember(id: string, payload: Omit<ManagedOrgMember, 'id'>, file: File | null) {
    try {
      await updateMember(id, payload, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Modification impossible.');
    }
  }

  async function handleDeleteMember(id: string) {
    try {
      await deleteMember(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Orga</h1>
        <p className="mt-2 text-sm text-slate-700">Gere les membres de l&apos;organisation en un seul endroit.</p>
      </div>

      {feedback ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{feedback}</p> : null}
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <form onSubmit={createMember} className="card-surface rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-slate-900">Ajouter un membre</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <select value={form.pole} onChange={(e) => setForm((p) => ({ ...p, pole: e.target.value }))} required className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {ORG_POLES.map((pole) => (
              <option key={pole} value={pole}>
                {pole}
              </option>
            ))}
          </select>
          <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required placeholder="Nom" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} required placeholder="Role" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" rows={3} className="md:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <button disabled={saving} className="mt-4 rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white">
          {saving ? 'Ajout...' : 'Ajouter'}
        </button>
      </form>

      <section className="card-surface rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-slate-900">Liste des membres</h2>
        <p className="mt-1 text-sm text-slate-600">Clique sur un membre pour voir le detail, modifier ses informations ou le supprimer.</p>

        {members.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">Aucun membre pour le moment.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {members.map((member) => (
              <MemberListItem
                key={member.id}
                member={member}
                isOpen={openMemberId === member.id}
                onToggle={() => handleToggleMember(member.id)}
                onUpdate={handleUpdateMember}
                onDelete={handleDeleteMember}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

async function readApiError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

function buildOrgFormData(
  payload: Pick<ManagedOrgMember, 'pole' | 'name' | 'role' | 'description'> & { photo?: string },
  file: File | null
) {
  const formData = new FormData();
  formData.append('pole', payload.pole || '');
  formData.append('name', payload.name || '');
  formData.append('role', payload.role || '');
  formData.append('description', payload.description || '');
  formData.append('photo', payload.photo || '');
  if (file) {
    formData.append('photoFile', file);
  }
  return formData;
}

function MemberListItem({
  member,
  isOpen,
  onToggle,
  onUpdate,
  onDelete
}: {
  member: ManagedOrgMember;
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (id: string, payload: Omit<ManagedOrgMember, 'id'>, file: File | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Omit<ManagedOrgMember, 'id'>>({
    pole: member.pole,
    name: member.name,
    role: member.role,
    description: member.description,
    photo: member.photo
  });
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [deleting, setDeleting] = useState(false);
  const nextPhotoPreview = useMemo(() => {
    if (!photoFile) {
      return null;
    }
    return URL.createObjectURL(photoFile);
  }, [photoFile]);

  useEffect(() => {
    return () => {
      if (nextPhotoPreview) {
        URL.revokeObjectURL(nextPhotoPreview);
      }
    };
  }, [nextPhotoPreview]);

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdate(member.id, draft, photoFile);
      setPhotoFile(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(`Supprimer ${member.name} ?`);
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    try {
      await onDelete(member.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white/80">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-slate-900">{member.name}</p>
          <p className="text-xs text-slate-600">
            {member.role} - {member.pole}
          </p>
        </div>
        <span className="text-xs font-semibold text-brand-primary">{isOpen ? 'Fermer' : 'Details'}</span>
      </button>

      {isOpen ? (
        <div className="border-t border-slate-200 px-4 py-4">
          <div className="grid gap-2">
            <select value={draft.pole} onChange={(e) => setDraft((p) => ({ ...p, pole: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {ORG_POLES.map((pole) => (
                <option key={pole} value={pole}>
                  {pole}
                </option>
              ))}
            </select>
            <input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input value={draft.role} onChange={(e) => setDraft((p) => ({ ...p, role: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <textarea value={draft.description || ''} onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))} rows={3} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-semibold text-slate-600">Photo actuelle</p>
                {draft.photo ? (
                  <img src={draft.photo} alt={`Photo actuelle de ${draft.name}`} className="mx-auto h-32 w-32 rounded-lg object-cover" />
                ) : (
                  <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500">Aucune photo</div>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-semibold text-slate-600">Nouvelle photo</p>
                {nextPhotoPreview ? (
                  <img src={nextPhotoPreview} alt={`Nouvelle photo de ${draft.name}`} className="mx-auto h-32 w-32 rounded-lg object-cover" />
                ) : (
                  <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500">Aucun fichier choisi</div>
                )}
                {photoFile ? <p className="mt-2 truncate text-[11px] text-slate-600">{photoFile.name}</p> : null}
              </div>
            </div>
          </div>

          <div className="mt-3 flex gap-3">
            <button type="button" onClick={handleSave} disabled={saving || deleting} className="rounded-full bg-brand-primary px-4 py-2 text-xs font-semibold text-white">
              {saving ? 'Sauvegarde...' : 'Modifier'}
            </button>
            <button type="button" onClick={handleDelete} disabled={saving || deleting} className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-600">
              {deleting ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
