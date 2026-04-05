import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import type { NewsArticle, NewsBlock } from '@/lib/types';
import { resolveDataFilePath } from '@/lib/dataDir';

const NEWS_FILE = 'news.json';
const NEWS_BACKUP_FILE = 'news.backup.json';

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

async function ensureStoreFile() {
  const newsFile = await resolveDataFilePath(NEWS_FILE);
  try {
    await fs.access(newsFile);
  } catch {
    await fs.writeFile(newsFile, '[]', 'utf-8');
  }

  const backupFile = await resolveDataFilePath(NEWS_BACKUP_FILE);
  try {
    await fs.access(backupFile);
  } catch {
    await fs.writeFile(backupFile, '[]', 'utf-8');
  }
}

async function readArticlesFromFile(filePath: string): Promise<NewsArticle[] | null> {
  const raw = await fs.readFile(filePath, 'utf-8');

  try {
    const parsed = JSON.parse(raw) as StoredNewsArticle[];
    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed
      .map((article, index) => {
        const status = normalizeStatus(article.status);
        return {
          id: article.id,
          title: String(article.title || '').trim(),
          excerpt: String(article.excerpt || '').trim() || undefined,
          coverImage: String(article.coverImage || '').trim() || undefined,
          author: String(article.author || '').trim() || undefined,
          status,
          blocks: normalizeBlocks(article.blocks),
          order: normalizeOrder(article.order, index),
          createdAt: article.createdAt,
          updatedAt: article.updatedAt,
          publishedAt: status === 'published' ? article.publishedAt || article.updatedAt || article.createdAt : undefined
        };
      })
      .filter((article) => Boolean(article.id) && Boolean(article.title))
      .sort((a, b) => normalizeOrder(a.order, 0) - normalizeOrder(b.order, 0));
  } catch {
    return null;
  }
}

async function writeArticlesSafely(articles: NewsArticle[]): Promise<void> {
  const newsFile = await resolveDataFilePath(NEWS_FILE);
  const backupFile = await resolveDataFilePath(NEWS_BACKUP_FILE);
  const json = JSON.stringify(articles, null, 2);

  // Write to a temp file then rename to avoid partially-written JSON files.
  const tempFile = `${newsFile}.tmp`;
  await fs.writeFile(tempFile, json, 'utf-8');
  await fs.rename(tempFile, newsFile);

  // Keep a backup snapshot so a corrupted primary file can be recovered.
  await fs.writeFile(backupFile, json, 'utf-8');
}

export async function getNewsArticles(): Promise<NewsArticle[]> {
  await ensureStoreFile();
  const newsFile = await resolveDataFilePath(NEWS_FILE);
  const backupFile = await resolveDataFilePath(NEWS_BACKUP_FILE);

  const primary = await readArticlesFromFile(newsFile);
  if (primary) {
    return primary;
  }

  const backup = await readArticlesFromFile(backupFile);
  if (backup) {
    await writeArticlesSafely(backup);
    return backup;
  }

  throw new Error('Le fichier news.json est invalide et la sauvegarde est indisponible.');
}

export async function addNewsArticle(input: Omit<NewsArticle, 'id'>): Promise<NewsArticle> {
  const articles = await getNewsArticles();
  const sanitized = sanitizeArticleInput(input);

  const next: NewsArticle = {
    ...sanitized,
    id: randomUUID(),
    order: articles.reduce((max, item) => Math.max(max, normalizeOrder(item.order, 0)), -1) + 1
  };

  await writeArticlesSafely([next, ...articles]);
  return next;
}

export async function updateNewsArticle(id: string, input: Omit<NewsArticle, 'id'>): Promise<NewsArticle | null> {
  const articles = await getNewsArticles();
  const index = articles.findIndex((article) => article.id === id);

  if (index === -1) {
    return null;
  }

  const previous = articles[index];
  const sanitized = sanitizeArticleInput({
    ...input,
    createdAt: previous.createdAt,
    publishedAt:
      normalizeStatus(input.status) === 'published'
        ? previous.publishedAt || input.publishedAt
        : undefined,
    order: previous.order
  });

  const updated: NewsArticle = {
    ...sanitized,
    id,
    order: previous.order
  };

  articles[index] = updated;

  await writeArticlesSafely(articles);
  return updated;
}

export async function deleteNewsArticle(id: string): Promise<boolean> {
  const articles = await getNewsArticles();
  const filtered = articles.filter((article) => article.id !== id);

  if (filtered.length === articles.length) {
    return false;
  }

  await writeArticlesSafely(filtered);
  return true;
}

export async function reorderNewsArticles(orderedIds: string[]): Promise<boolean> {
  const articles = await getNewsArticles();
  const mapById = new Map(articles.map((article) => [article.id, article]));

  const ordered = orderedIds
    .map((id) => mapById.get(id))
    .filter((article): article is NewsArticle => Boolean(article));

  const missing = articles.filter((article) => !orderedIds.includes(article.id));
  const nextArticles = [...ordered, ...missing].map((article, index) => ({
    ...article,
    order: index,
    updatedAt: new Date().toISOString()
  }));

  await writeArticlesSafely(nextArticles);
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
