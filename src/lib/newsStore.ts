import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import type { NewsArticle, NewsBlock } from '@/lib/types';
import { prisma } from '@/lib/prisma';

const NEWS_SEED_TITLE = 'Bienvenue sur Paris 1 Esport';

let dbSeedInitialized = false;

type StoredNewsArticle = Omit<NewsArticle, 'status'> & {
  status?: NewsArticle['status'];
};

function normalizeStatus(status: string | undefined): NewsArticle['status'] {
  return status === 'published' ? 'published' : 'draft';
}

function normalizeOrder(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    return fallback;
  }

  return Math.floor(value);
}

function normalizeBlocks(blocks: NewsBlock[] | undefined): NewsBlock[] {
  if (!Array.isArray(blocks)) {
    return [];
  }

  return blocks
    .map((block) => {
      if (!block || typeof block !== 'object') {
        return null;
      }

      const type = block.type;
      if (type !== 'heading' && type !== 'paragraph' && type !== 'image') {
        return null;
      }

      const normalized: NewsBlock = {
        id: block.id || randomUUID(),
        type
      };

      if (type === 'heading') {
        normalized.content = String(block.content || '').trim();
        normalized.level = block.level === 1 || block.level === 2 || block.level === 3 ? block.level : 2;
      }

      if (type === 'paragraph') {
        normalized.content = String(block.content || '').trim();
      }

      if (type === 'image') {
        normalized.imageUrl = String(block.imageUrl || '').trim();
        normalized.caption = String(block.caption || '').trim() || undefined;
      }

      return normalized;
    })
    .filter((block): block is NewsBlock => Boolean(block))
    .filter((block) => {
      if (block.type === 'image') {
        return Boolean(block.imageUrl);
      }

      return Boolean(block.content);
    });
}

function sanitizeArticleInput(input: Omit<NewsArticle, 'id'>): Omit<NewsArticle, 'id'> {
  const now = new Date().toISOString();
  const status = normalizeStatus(input.status);

  return {
    title: String(input.title || '').trim(),
    excerpt: String(input.excerpt || '').trim() || undefined,
    coverImage: String(input.coverImage || '').trim() || undefined,
    author: String(input.author || '').trim() || undefined,
    status,
    blocks: normalizeBlocks(input.blocks),
    order: normalizeOrder(input.order, 0),
    createdAt: input.createdAt || now,
    updatedAt: now,
    publishedAt: status === 'published' ? input.publishedAt || now : undefined
  };
}

function fromDbArticle(article: {
  id: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  author: string | null;
  status: string;
  blocks: Prisma.JsonValue;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}): NewsArticle {
  return {
    id: article.id,
    title: article.title,
    excerpt: article.excerpt || undefined,
    coverImage: article.coverImage || undefined,
    author: article.author || undefined,
    status: normalizeStatus(article.status),
    blocks: normalizeBlocks(Array.isArray(article.blocks) ? (article.blocks as NewsBlock[]) : undefined),
    order: article.order,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
    publishedAt: article.publishedAt?.toISOString()
  };
}

async function ensureDbSeeded() {
  if (dbSeedInitialized) {
    return;
  }

  try {
    const count = await prisma.newsArticle.count();
    if (count === 0) {
      await prisma.newsArticle.create({
        data: {
          id: 'seed-news-1',
          title: NEWS_SEED_TITLE,
          excerpt: 'Premiere actualite du site.',
          status: 'draft',
          blocks: [],
          order: 0
        }
      });
    }

    dbSeedInitialized = true;
  } catch {
    throw new Error('Base non initialisee. Executez npm run db:push apres avoir configure DATABASE_URL.');
  }
}

export async function getNewsArticles(): Promise<NewsArticle[]> {
  await ensureDbSeeded();
  const articles = await prisma.newsArticle.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
  return articles.map(fromDbArticle);
}

export async function addNewsArticle(input: Omit<NewsArticle, 'id'>): Promise<NewsArticle> {
  await ensureDbSeeded();
  const articles = await prisma.newsArticle.findMany({ orderBy: { order: 'desc' }, select: { order: true } });
  const sanitized = sanitizeArticleInput(input);

  const created = await prisma.newsArticle.create({
    data: {
      id: randomUUID(),
      title: sanitized.title,
      excerpt: sanitized.excerpt || null,
      coverImage: sanitized.coverImage || null,
      author: sanitized.author || null,
      status: sanitized.status,
      blocks: sanitized.blocks,
      order: articles.length > 0 ? Math.max(...articles.map((item) => item.order)) + 1 : 0,
      createdAt: sanitized.createdAt ? new Date(sanitized.createdAt) : undefined,
      publishedAt: sanitized.publishedAt ? new Date(sanitized.publishedAt) : null
    }
  });

  return fromDbArticle(created);
}

export async function updateNewsArticle(id: string, input: Omit<NewsArticle, 'id'>): Promise<NewsArticle | null> {
  await ensureDbSeeded();
  const existing = await prisma.newsArticle.findUnique({ where: { id } });

  if (!existing) {
    return null;
  }

  const sanitized = sanitizeArticleInput({
    ...input,
    createdAt: existing.createdAt.toISOString(),
    publishedAt:
      normalizeStatus(input.status) === 'published'
        ? existing.publishedAt?.toISOString() || input.publishedAt
        : undefined,
    order: existing.order
  });

  const updated = await prisma.newsArticle.update({
    where: { id },
    data: {
      title: sanitized.title,
      excerpt: sanitized.excerpt || null,
      coverImage: sanitized.coverImage || null,
      author: sanitized.author || null,
      status: sanitized.status,
      blocks: sanitized.blocks,
      order: existing.order,
      publishedAt: sanitized.publishedAt ? new Date(sanitized.publishedAt) : null
    }
  });

  return fromDbArticle(updated);
}

export async function deleteNewsArticle(id: string): Promise<boolean> {
  await ensureDbSeeded();
  const removed = await prisma.newsArticle.deleteMany({ where: { id } });
  return removed.count > 0;
}

export async function reorderNewsArticles(orderedIds: string[]): Promise<boolean> {
  await ensureDbSeeded();
  const articles = await prisma.newsArticle.findMany();
  const mapById = new Map(articles.map((article) => [article.id, article]));
  const ordered = orderedIds.map((id) => mapById.get(id)).filter((article): article is typeof articles[number] => Boolean(article));
  const missing = articles.filter((article) => !orderedIds.includes(article.id));
  const nextArticles = [...ordered, ...missing];

  await prisma.$transaction(
    nextArticles.map((article, index) =>
      prisma.newsArticle.update({
        where: { id: article.id },
        data: { order: index }
      })
    )
  );

  return true;
}

export async function getPublishedNewsArticles(): Promise<NewsArticle[]> {
  const articles = await getNewsArticles();
  return articles
    .filter((article) => article.status === 'published')
    .sort((a, b) => {
      const left = new Date(a.publishedAt || a.updatedAt || a.createdAt || 0).getTime();
      const right = new Date(b.publishedAt || b.updatedAt || b.createdAt || 0).getTime();
      return right - left;
    });
}
