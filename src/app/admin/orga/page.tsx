'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ORG_POLES, type ManagedOrgMember } from '@/lib/types';

type OrgaFormState = { pole: string; name: string; role: string; description: string };

const initialForm: OrgaFormState = { pole: ORG_POLES[0], name: '', role: '', description: '' };

export default function AdminOrgaPage() {
  const [members, setMembers] = useState<ManagedOrgMember[]>([]);
  const [form, setForm] = useState(initialForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadMembers() {
    const res = await fetch('/api/managed/org-members');
    const data = (await res.json()) as ManagedOrgMember[];
    setMembers(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    loadMembers().catch(() => setMembers([]));
  }, []);

  async function createMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/managed/org-members', {
        method: 'POST',
        body: buildOrgFormData(form, photoFile)
      });
      if (res.ok) {
        setForm(initialForm);
        setPhotoFile(null);
        await loadMembers();
      }
    } finally {
      setSaving(false);
    }
  }

  async function updateMember(id: string, payload: Omit<ManagedOrgMember, 'id'>, file: File | null) {
    const res = await fetch(`/api/managed/org-members/${id}`, {
      method: 'PUT',
      body: buildOrgFormData(payload, file)
    });
    if (res.ok) {
      await loadMembers();
    }
  }

  async function deleteMember(id: string) {
    const res = await fetch(`/api/managed/org-members/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadMembers();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Orga</h1>
        <p className="mt-2 text-sm text-slate-700">Gere les membres de l&apos;organisation en un seul endroit.</p>
      </div>

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

      <div className="grid gap-4 md:grid-cols-2">
        {members.map((member) => (
          <MemberEditorCard key={member.id} member={member} onUpdate={updateMember} onDelete={deleteMember} />
        ))}
      </div>
    </div>
  );
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

function MemberEditorCard({
  member,
  onUpdate,
  onDelete
}: {
  member: ManagedOrgMember;
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

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdate(member.id, draft, photoFile);
      setPhotoFile(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card-surface rounded-2xl p-5">
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
      </div>
      <div className="mt-3 flex gap-3">
        <button onClick={handleSave} disabled={saving} className="rounded-full bg-brand-primary px-4 py-2 text-xs font-semibold text-white">
          {saving ? 'Sauvegarde...' : 'Modifier'}
        </button>
        <button onClick={() => onDelete(member.id)} className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-600">
          Supprimer
        </button>
      </div>
    </div>
  );
}
