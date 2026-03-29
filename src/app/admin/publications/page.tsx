'use client';

import { FormEvent, useEffect, useState } from 'react';
import type { ManagedPublicationsSettings, EventItem } from '@/lib/types';

const initialState: ManagedPublicationsSettings = {
  instagramPostUrl: '',
  youtubeChannelUrl: '',
  youtubeVideoUrl: '',
  discordInviteUrl: '',
  discordPatchNotes: [],
  featuredEventId: ''
};

export default function AdminPublicationsPage() {
  const [settings, setSettings] = useState<ManagedPublicationsSettings>(initialState);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [patchNotesText, setPatchNotesText] = useState('[]');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function loadSettings() {
    const res = await fetch('/api/managed/publications');
    const data = (await res.json()) as ManagedPublicationsSettings;
    setSettings({
      instagramPostUrl: data.instagramPostUrl || '',
      youtubeChannelUrl: data.youtubeChannelUrl || '',
      youtubeVideoUrl: data.youtubeVideoUrl || '',
      discordInviteUrl: data.discordInviteUrl || '',
      discordPatchNotes: Array.isArray(data.discordPatchNotes) ? data.discordPatchNotes : [],
      featuredEventId: data.featuredEventId || ''
    });
    setPatchNotesText(JSON.stringify(data.discordPatchNotes || [], null, 2));
  }

  async function loadEvents() {
    const res = await fetch('/api/events');
    const data = (await res.json()) as EventItem[];
    setEvents(data);
  }

  useEffect(() => {
    loadSettings().catch(() => setSettings(initialState));
    loadEvents().catch(() => setEvents([]));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    setSaved(false);

    try {
      let parsedPatchNotes: ManagedPublicationsSettings['discordPatchNotes'];
      try {
        const parsed = JSON.parse(patchNotesText || '[]');
        if (!Array.isArray(parsed)) {
          throw new Error('Le JSON doit être une liste.');
        }
        parsedPatchNotes = parsed;
      } catch {
        setError('Le JSON des patch notes est invalide.');
        return;
      }

      const res = await fetch('/api/managed/publications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          discordPatchNotes: parsedPatchNotes,
          featuredEventId: settings.featuredEventId || undefined
        })
      });

      if (res.ok) {
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">Publications</h1>
        <p className="mt-2 text-sm text-slate-700">Configure le post Instagram mis en avant, le lien YouTube public, et l&apos;event majeur en premiere page.</p>
      </div>

      <form onSubmit={save} className="card-surface rounded-2xl p-6">
        <div className="grid gap-4">
          <label className="block text-sm text-slate-700">
            Event majeur (affiche en page d&apos;accueil)
            <select
              value={settings.featuredEventId || ''}
              onChange={(e) => setSettings((p) => ({ ...p, featuredEventId: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">-- Selectionner un event --</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title} ({event.date})
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-slate-700">
            URL du post Instagram (mis en avant)
            <input
              value={settings.instagramPostUrl || ''}
              onChange={(e) => setSettings((p) => ({ ...p, instagramPostUrl: e.target.value }))}
              placeholder="https://www.instagram.com/p/.../"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm text-slate-700">
            URL YouTube video/live (pour l&apos;embed)
            <input
              value={settings.youtubeVideoUrl || ''}
              onChange={(e) => setSettings((p) => ({ ...p, youtubeVideoUrl: e.target.value }))}
              placeholder="https://www.youtube.com/watch?v=..."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm text-slate-700">
            URL de la chaine YouTube (bouton)
            <input
              value={settings.youtubeChannelUrl || ''}
              onChange={(e) => setSettings((p) => ({ ...p, youtubeChannelUrl: e.target.value }))}
              placeholder="https://www.youtube.com/@Paris1Esport"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm text-slate-700">
            URL d&apos;invitation Discord
            <input
              value={settings.discordInviteUrl || ''}
              onChange={(e) => setSettings((p) => ({ ...p, discordInviteUrl: e.target.value }))}
              placeholder="https://discord.gg/..."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm text-slate-700">
            Patch notes Discord (JSON modifiable)
            <textarea
              value={patchNotesText}
              onChange={(e) => setPatchNotesText(e.target.value)}
              rows={14}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button disabled={saving} className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white">
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
          {saved && <span className="text-sm font-semibold text-green-700">Sauvegardé</span>}
          {error && <span className="text-sm font-semibold text-red-700">{error}</span>}
        </div>
      </form>
    </div>
  );
}
