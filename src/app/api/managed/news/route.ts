import { NextResponse } from 'next/server';
import { addNewsArticle, getNewsArticles } from '@/lib/newsStore';
import { isAdminAuthenticated } from '@/lib/auth';
import { storeNewsPhoto } from '@/lib/photoStorage';
import type { NewsArticle, NewsBlock } from '@/lib/types';

export const dynamic = 'force-dynamic';

type NewsPayload = {
  title?: string;
  excerpt?: string;
  coverImage?: string;
  author?: string;
  status?: NewsArticle['status'];
  blocks?: NewsBlock[];
};

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    !!value &&
    typeof value === 'object' &&
    'size' in value &&
    typeof value.size === 'number' &&
    value.size > 0 &&
    'name' in value &&
    typeof value.name === 'string' &&
    'arrayBuffer' in value &&
    typeof value.arrayBuffer === 'function'
  );
}

function normalizeStatus(value: string | undefined): NewsArticle['status'] {
  return value === 'published' ? 'published' : 'draft';
}

async function parseNewsFormData(formData: FormData) {
  const rawBlocks = String(formData.get('blocks') || '[]');
  let blocks: NewsBlock[] = [];

  try {
    const parsed = JSON.parse(rawBlocks) as NewsBlock[];
    blocks = Array.isArray(parsed) ? parsed : [];
  } catch {
    blocks = [];
  }

  let coverImage = String(formData.get('coverImage') || '').trim() || undefined;
  const coverFile = formData.get('coverFile');
  if (isUploadedFile(coverFile)) {
    coverImage = await storeNewsPhoto(coverFile);
  }

  const blockImageFiles = new Map<string, File>();
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('blockImageFile:')) {
      continue;
    }

    if (!isUploadedFile(value)) {
      continue;
    }

    const blockId = key.slice('blockImageFile:'.length).trim();
    if (!blockId) {
      continue;
    }

    blockImageFiles.set(blockId, value);
  }

  const hydratedBlocks: NewsBlock[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== 'object' || !block.id) {
      continue;
    }

    if (block.type === 'image') {
      const file = blockImageFiles.get(block.id);
      const imageUrl = file ? await storeNewsPhoto(file) : String(block.imageUrl || '').trim();
      hydratedBlocks.push({
        id: block.id,
        type: 'image',
        imageUrl,
        caption: String(block.caption || '').trim() || undefined
      });
      continue;
    }

    if (block.type === 'heading') {
      hydratedBlocks.push({
        id: block.id,
        type: 'heading',
        content: String(block.content || ''),
        level: block.level === 1 || block.level === 2 || block.level === 3 ? block.level : 2
      });
      continue;
    }

    if (block.type === 'paragraph') {
      hydratedBlocks.push({
        id: block.id,
        type: 'paragraph',
        content: String(block.content || '')
      });
    }
  }

  return {
    title: String(formData.get('title') || '').trim(),
    excerpt: String(formData.get('excerpt') || '').trim() || undefined,
    coverImage,
    author: String(formData.get('author') || '').trim() || undefined,
    status: normalizeStatus(String(formData.get('status') || 'draft')),
    blocks: hydratedBlocks
  };
}

export async function GET() {
  const news = await getNewsArticles();
  return NextResponse.json(news);
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let body: NewsPayload | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      body = await parseNewsFormData(formData);
    } else {
      body = (await req.json()) as NewsPayload;
    }

    if (!body?.title?.trim()) {
      return NextResponse.json({ error: 'Le titre est obligatoire.' }, { status: 400 });
    }

    const created = await addNewsArticle({
      title: body.title.trim(),
      excerpt: body.excerpt?.trim() || undefined,
      coverImage: body.coverImage?.trim() || undefined,
      author: body.author?.trim() || undefined,
      status: normalizeStatus(body.status),
      blocks: Array.isArray(body.blocks) ? body.blocks : []
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur pendant la sauvegarde.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
