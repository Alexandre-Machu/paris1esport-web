import type { NewsBlock } from '@/lib/types';

export const MAX_NEWS_TITLE_CHARS = 180;
export const MAX_NEWS_EXCERPT_CHARS = 2000;
export const MAX_NEWS_AUTHOR_CHARS = 120;
export const MAX_NEWS_HEADING_CHARS = 300;
export const MAX_NEWS_PARAGRAPH_CHARS = 20000;
export const MAX_NEWS_CAPTION_CHARS = 1000;
export const MAX_NEWS_TOTAL_TEXT_CHARS = 120000;

function blockTextLength(block: NewsBlock) {
  if (block.type === 'image') {
    return String(block.caption || '').length;
  }

  return String(block.content || '').length;
}

export function validateNewsPayload(input: {
  title?: string;
  excerpt?: string;
  author?: string;
  blocks?: NewsBlock[];
}) {
  const title = String(input.title || '');
  if (title.length > MAX_NEWS_TITLE_CHARS) {
    return `Le titre depasse ${MAX_NEWS_TITLE_CHARS} caracteres.`;
  }

  const excerpt = String(input.excerpt || '');
  if (excerpt.length > MAX_NEWS_EXCERPT_CHARS) {
    return `L'extrait depasse ${MAX_NEWS_EXCERPT_CHARS} caracteres.`;
  }

  const author = String(input.author || '');
  if (author.length > MAX_NEWS_AUTHOR_CHARS) {
    return `Le nom de l'auteur depasse ${MAX_NEWS_AUTHOR_CHARS} caracteres.`;
  }

  const blocks = Array.isArray(input.blocks) ? input.blocks : [];
  let totalTextChars = title.length + excerpt.length + author.length;

  for (const block of blocks) {
    if (!block || typeof block !== 'object') {
      continue;
    }

    if (block.type === 'heading') {
      const headingLength = String(block.content || '').length;
      if (headingLength > MAX_NEWS_HEADING_CHARS) {
        return `Un titre de bloc depasse ${MAX_NEWS_HEADING_CHARS} caracteres.`;
      }
    }

    if (block.type === 'paragraph') {
      const paragraphLength = String(block.content || '').length;
      if (paragraphLength > MAX_NEWS_PARAGRAPH_CHARS) {
        return `Un paragraphe depasse ${MAX_NEWS_PARAGRAPH_CHARS} caracteres.`;
      }
    }

    if (block.type === 'image') {
      const captionLength = String(block.caption || '').length;
      if (captionLength > MAX_NEWS_CAPTION_CHARS) {
        return `Une legende depasse ${MAX_NEWS_CAPTION_CHARS} caracteres.`;
      }
    }

    totalTextChars += blockTextLength(block);
  }

  if (totalTextChars > MAX_NEWS_TOTAL_TEXT_CHARS) {
    return `Le contenu total depasse ${MAX_NEWS_TOTAL_TEXT_CHARS} caracteres.`;
  }

  return null;
}