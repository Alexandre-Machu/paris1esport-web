'use client';

import { useState, useEffect } from 'react';
import type { EventItem } from '@/lib/types';

type EventsListProps = {
  initialEvents: EventItem[];
};

async function readApiError(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export default function EventsList({ initialEvents }: EventsListProps) {
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setEvents(initialEvents);
  }, [initialEvents]);

  async function handleDeleteEvent(id: string) {
    const confirmed = window.confirm('Êtes-vous sûr ?');
    if (!confirmed) return;

    setFeedback('');
    setError('');
    setDeleting(true);

    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });

      if (!res.ok) {
        throw new Error(await readApiError(res, 'Suppression impossible.'));
      }

      setEvents(events.filter((e) => e.id !== id));
      setFeedback('Événement supprimé avec succès.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setDeleting(false);
    }
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
                className={`rounded-xl border p-4 transition cursor-move ${
                  draggedItemId === event.id
                    ? 'opacity-50 bg-slate-50 text-slate-900'
                    : dragOverItemId === event.id
                      ? 'bg-blue-100 text-slate-900 border-2 border-blue-400'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase text-brand-primary">{event.type}</p>
                    <h3 className="text-base font-semibold text-slate-900">{event.title}</h3>
                    <p className="text-sm text-slate-600">{event.date}</p>
                    <p className="text-sm text-slate-600">{event.location}</p>
                    {event.photos && event.photos.length > 0 && (
                      <p className="text-xs text-slate-500">{event.photos.length} photo(s)</p>
                    )}
                  </div>
                  <span className="text-lg mr-2">⋮⋮</span>
                </div>
                <button
                  onClick={() => handleDeleteEvent(event.id)}
                  disabled={deleting}
                  className="mt-3 text-sm font-semibold text-red-600 hover:underline disabled:opacity-50"
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
