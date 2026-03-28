'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { ManagedPartner } from '@/lib/types';

const initialForm = { name: '', desc: '', link: '', logo: '' };

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<ManagedPartner[]>([]);
  const [form, setForm] = useState(initialForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadPartners() {
    const res = await fetch('/api/managed/partners');
    const data = (await res.json()) as ManagedPartner[];
    setPartners(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    loadPartners().catch(() => setPartners([]));
  }, []);

  async function createPartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/managed/partners', {
        method: 'POST',
        body: buildPartnerFormData(form, logoFile)
      });
      if (res.ok) {
        setForm(initialForm);
        setLogoFile(null);
        await loadPartners();
      }
    } finally {
      setSaving(false);
    }
  }

  async function updatePartner(id: string, payload: Omit<ManagedPartner, 'id'>, file: File | null) {
    const res = await fetch(`/api/managed/partners/${id}`, {
      method: 'PUT',
      body: buildPartnerFormData(payload, file)
    });
    if (res.ok) {
      await loadPartners();
    }
  }

  async function deletePartner(id: string) {
    const res = await fetch(`/api/managed/partners/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadPartners();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Partenaires</h1>
        <p className="mt-2 text-sm text-slate-700">Gere les partenaires et leurs logos sans modifier le code.</p>
      </div>

      <form onSubmit={createPartner} className="card-surface rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-slate-900">Ajouter un partenaire</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required placeholder="Nom" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input value={form.link} onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))} required placeholder="Lien" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="md:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <textarea value={form.desc} onChange={(e) => setForm((p) => ({ ...p, desc: e.target.value }))} required placeholder="Description" rows={3} className="md:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm" />

          <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-600">Aperçu nouveau logo</p>
            {logoFile ? <CreateLogoPreview file={logoFile} /> : <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500">Aucun fichier choisi</div>}
          </div>
        </div>
        <button disabled={saving} className="mt-4 rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white">
          {saving ? 'Ajout...' : 'Ajouter'}
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {partners.map((partner) => (
          <PartnerEditorCard key={partner.id} partner={partner} onUpdate={updatePartner} onDelete={deletePartner} />
        ))}
      </div>
    </div>
  );
}

function buildPartnerFormData(payload: Omit<ManagedPartner, 'id'> | typeof initialForm, file: File | null) {
  const formData = new FormData();
  formData.append('name', payload.name || '');
  formData.append('desc', payload.desc || '');
  formData.append('link', payload.link || '');
  formData.append('logo', payload.logo || '');
  if (file) {
    formData.append('logoFile', file);
  }
  return formData;
}

function PartnerEditorCard({
  partner,
  onUpdate,
  onDelete
}: {
  partner: ManagedPartner;
  onUpdate: (id: string, payload: Omit<ManagedPartner, 'id'>, file: File | null) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Omit<ManagedPartner, 'id'>>({
    name: partner.name,
    desc: partner.desc,
    link: partner.link,
    logo: partner.logo
  });
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const nextLogoPreview = useMemo(() => {
    if (!logoFile) {
      return null;
    }
    return URL.createObjectURL(logoFile);
  }, [logoFile]);

  useEffect(() => {
    return () => {
      if (nextLogoPreview) {
        URL.revokeObjectURL(nextLogoPreview);
      }
    };
  }, [nextLogoPreview]);

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdate(partner.id, draft, logoFile);
      setLogoFile(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card-surface rounded-2xl p-5">
      <div className="grid gap-2">
        <input value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <input value={draft.link} onChange={(e) => setDraft((p) => ({ ...p, link: e.target.value }))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <textarea value={draft.desc} onChange={(e) => setDraft((p) => ({ ...p, desc: e.target.value }))} rows={3} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-600">Logo actuel</p>
            {draft.logo ? (
              <img src={draft.logo} alt={`Logo actuel de ${draft.name}`} className="mx-auto h-24 w-24 rounded-lg object-contain bg-white p-2" />
            ) : (
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500">Aucun logo</div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-600">Nouveau logo</p>
            {nextLogoPreview ? (
              <img src={nextLogoPreview} alt={`Nouveau logo de ${draft.name}`} className="mx-auto h-24 w-24 rounded-lg object-contain bg-white p-2" />
            ) : (
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500">Aucun fichier choisi</div>
            )}
            {logoFile ? <p className="mt-2 truncate text-[11px] text-slate-600">{logoFile.name}</p> : null}
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-3">
        <button onClick={handleSave} disabled={saving} className="rounded-full bg-brand-primary px-4 py-2 text-xs font-semibold text-white">
          {saving ? 'Sauvegarde...' : 'Modifier'}
        </button>
        <button onClick={() => onDelete(partner.id)} className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-600">
          Supprimer
        </button>
      </div>
    </div>
  );
}

function CreateLogoPreview({ file }: { file: File }) {
  const preview = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <>
      <img src={preview} alt="Aperçu nouveau logo" className="mx-auto h-24 w-24 rounded-lg object-contain bg-white p-2" />
      <p className="mt-2 truncate text-[11px] text-slate-600">{file.name}</p>
    </>
  );
}
