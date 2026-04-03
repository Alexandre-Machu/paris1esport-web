import type { NewsArticle } from '@/lib/types';

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function toNewsSlug(title: string): string {
  const slug = normalize(title);
  return slug || 'news';
}

export function toNewsPathParam(article: NewsArticle): string {
  return `${toNewsSlug(article.title)}-${article.id.slice(0, 8)}`;
}

export function newsParamMatches(article: NewsArticle, param: string): boolean {
  return param === article.id || param === toNewsPathParam(article) || param.endsWith(`-${article.id.slice(0, 8)}`);
}
