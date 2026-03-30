import type { EventItem } from '@/lib/types';

export function toEventSlug(title: string): string {
  const normalized = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const slug = normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return slug || 'evenement';
}

export function eventParamMatches(event: EventItem, param: string): boolean {
  return event.id === param || toEventSlug(event.title) === param;
}
