'use client';

import { useState, useEffect, FormEvent } from 'react';
import type { EventItem } from '@/lib/types';

type EventsEditorProps = {
  initialEvents: EventItem[];
};

type EventFormState = { title: string; date: string; location: string; type: string; link: string; eventId?: string };

const initialForm: EventFormState = { title: '', date: '', location: '', type: '', link: '' };

async function readApiError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export default function EventsEditor({ initialEvents }: EventsEditorProps) {
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  async function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback('');
    setError('');
    setSaving(true);

    try {
      if (form.eventId) {
        // Mode édition: modification d'un événement existant
        const res = await fetch(`/api/events/${form.eventId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title,
            date: form.date,
            location: form.location,
            type: form.type,
            link: form.link || undefined
          })
        });

        if (!res.ok) {
          throw new Error(await readApiError(res, 'Modification impossible.'));
        }

        const updated = (await res.json()) as EventItem;
        setEvents(events.map((e) => (e.id === form.eventId ? updated : e)));
        setForm(initialForm);
        setFeedback('Événement modifié avec succès.');

        // Recharger la page public pour voir les changements
        fetch('/api/revalidate?paths=/events,/admin/events', { method: 'POST' }).catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEvent(id: string) {
    const confirmed = window.confirm('Êtes-vous sûr ?');
    if (!confirmed) return;

    setFeedback('');
    setError('');
    setSaving(true);

    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });

      if (!res.ok) {
        throw new Error(await readApiError(res, 'Suppression impossible.'));
      }

      if (form.eventId === id) {
        setForm(initialForm);
      }

      setEvents(events.filter((e) => e.id !== id));
      setFeedback('Événement supprimé avec succès.');

      // Recharger la page public pour voir les changements
      fetch('/api/revalidate?paths=/events,/admin/events', { method: 'POST' }).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  }

  function handleSelectEvent(event: EventItem) {
    setForm({
      title: event.title,
      date: event.date,
      location: event.location,
      type: event.type,
      link: event.link || '',
      eventId: event.id
    });
  }

  function handleCancelEdit() {
    setForm(initialForm);
  }

  async function handleDragStart(eventId: string) {
    setDraggedItemId(eventId);
  }

  function handleDragOver(e: any, eventId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverItemId(eventId);
  }

  async function handleDrop(e: any, droppedOnEventId: string) {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === droppedOnEventId) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    // Réorganiser localement
    const newOrder = [...events];
    const draggedIndex = newOrder.findIndex((e) => e.id === draggedItemId);
    const dropIndex = newOrder.findIndex((e) => e.id === droppedOnEventId);

    if (draggedIndex === -1 || dropIndex === -1) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    // Déplacer l'élément
    const [draggedEvent] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedEvent);

    // Mettre à jour localement
    setEvents(newOrder);

    // Sauvegarder sur le serveur
    try {
      const res = await fetch('/api/events/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderedIds: newOrder.map((e) => e.id)
        })
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, 'Réorganisation impossible.'));
      }

      setFeedback('Ordre sauvegardé avec succès.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde de l\'ordre.');
      // Recharger pour réinitialiser l'état
      setEvents(initialEvents);
    } finally {
      setDraggedItemId(null);
      setDragOverItemId(null);
    }
  }

  function handleDragEnd() {
    setDraggedItemId(null);
    setDragOverItemId(null);
  }

  return (
    <div className="space-y-4">
      {feedback ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {feedback}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleFormSubmit} className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-base font-semibold text-slate-900">
          {form.eventId ? `Modifier: ${form.title}` : 'Ajouter/Modifier un événement'}
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <input
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Titre"
            required
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={form.date}
            onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            placeholder="Date (ex: 12 avril 2026)"
            required
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={form.location}
            onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
            placeholder="Lieu"
            required
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={form.type}
            onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
            placeholder="Type"
            required
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            value={form.link}
            onChange={(e) => setForm((p) => ({ ...p, link: e.target.value }))}
            placeholder="Lien (optionnel)"
            className="md:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-3 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Sauvegarde...' : form.eventId ? 'Mettre à jour' : 'Ajouter'}
          </button>
          {form.eventId && (
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
                onClick={() => handleDeleteEvent(form.eventId!)}
                disabled={saving}
                className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"
              >
                Supprimer
              </button>
            </>
          )}
        </div>
      </form>

      <h2 className="text-xl font-semibold text-slate-900">Événements existants</h2>
      {events.length === 0 ? (
        <p className="text-sm text-slate-600">Aucun événement enregistré pour le moment.</p>
      ) : (
        <div>
          <p className="text-xs text-slate-500 mb-3">Glissez-déposez pour réorganiser</p>
          <ul className="space-y-3">
            {events.map((event) => (
              <li
                key={event.id}
                draggable
                onDragStart={() => handleDragStart(event.id)}
                onDragOver={(e) => handleDragOver(e, event.id)}
                onDrop={(e) => handleDrop(e, event.id)}
                onDragEnd={handleDragEnd}
                onClick={() => handleSelectEvent(event)}
                className={`rounded-xl border p-4 transition cursor-move ${
                  form.eventId === event.id
                    ? 'bg-brand-primary text-white'
                    : draggedItemId === event.id
                      ? 'opacity-50 bg-slate-50 text-slate-900'
                      : dragOverItemId === event.id
                        ? 'bg-blue-100 text-slate-900 border-2 border-blue-400'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className={`text-xs font-semibold uppercase ${form.eventId === event.id ? 'text-white' : 'text-brand-primary'}`}>
                      {event.type}
                    </p>
                    <h3 className="text-base font-semibold">{event.title}</h3>
                    <p className="text-sm">{event.date}</p>
                    <p className="text-sm">{event.location}</p>
                    {event.photos && event.photos.length > 0 && (
                      <p className="text-xs">{event.photos.length} photo(s)</p>
                    )}
                  </div>
                  <span className="text-lg mr-2">⋮⋮</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
