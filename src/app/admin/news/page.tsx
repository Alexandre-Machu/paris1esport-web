'use client';

import Image from 'next/image';
import { DragEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import type { NewsArticle, NewsBlock } from '@/lib/types';

type DraftState = {
  title: string;
  excerpt: string;
  author: string;
  coverImage: string;
  status: NewsArticle['status'];
  blocks: NewsBlock[];
  articleId?: string;
};

const initialDraft: DraftState = {
  title: '',
  excerpt: '',
  author: '',
  coverImage: '',
  status: 'draft',
  blocks: []
};

// Keep upload payload under backend limits while allowing larger articles.
const MAX_IMAGE_SIZE_BYTES = 12 * 1024 * 1024;
const MAX_UPLOAD_TOTAL_BYTES = 40 * 1024 * 1024;

function newBlockId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function buildEmptyBlock(type: NewsBlock['type']): NewsBlock {
  if (type === 'heading') {
    return { id: newBlockId(), type: 'heading', content: '', level: 2 };
  }

  if (type === 'paragraph') {
    return { id: newBlockId(), type: 'paragraph', content: '' };
  }

  return { id: newBlockId(), type: 'image', imageUrl: '', caption: '' };
}

async function readApiError(response: Response, fallback: string) {
  if (response.status === 413) {
    return 'Contenu trop volumineux. Reduis la taille du texte ou des images, puis reessaie.';
  }

  try {
    const data = (await response.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return `${fallback} (HTTP ${response.status})`;
  }
}

function reorder<T>(items: T[], from: number, to: number) {
  const clone = [...items];
  const [moved] = clone.splice(from, 1);
  clone.splice(to, 0, moved);
  return clone;
}

function renderInlineFormatting(text: string) {
  const chunks = text.split(/(\*\*[^*]+\*\*|~~[^~]+~~|\+\+[^+]+\+\+)/g);
  return chunks.map((chunk, index) => {
    if (chunk.startsWith('**') && chunk.endsWith('**') && chunk.length > 4) {
      return <strong key={`bold-${index}`}>{chunk.slice(2, -2)}</strong>;
    }
    if (chunk.startsWith('~~') && chunk.endsWith('~~') && chunk.length > 4) {
      return <s key={`strike-${index}`}>{chunk.slice(2, -2)}</s>;
    }
    if (chunk.startsWith('++') && chunk.endsWith('++') && chunk.length > 4) {
      return <u key={`underline-${index}`}>{chunk.slice(2, -2)}</u>;
    }
    return <span key={`txt-${index}`}>{chunk}</span>;
  });
}

function previewText(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function formatSizeMb(size: number) {
  return (size / (1024 * 1024)).toFixed(2);
}

export default function AdminNewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [draft, setDraft] = useState<DraftState>(initialDraft);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [blockFiles, setBlockFiles] = useState<Record<string, File>>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [draggedArticleId, setDraggedArticleId] = useState<string | null>(null);
  const [dragOverArticleId, setDragOverArticleId] = useState<string | null>(null);

  const orderedArticles = useMemo(
    () => [...articles].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [articles]
  );

  async function loadArticles() {
    const res = await fetch('/api/managed/news', { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(await readApiError(res, 'Impossible de charger les articles.'));
    }

    const data = (await res.json()) as NewsArticle[];
    if (!Array.isArray(data)) {
      throw new Error('Reponse invalide lors du chargement des articles.');
    }

    setArticles(data);
  }

  useEffect(() => {
    loadArticles().catch((err) => {
      setError(err instanceof Error ? err.message : 'Impossible de charger les articles.');
    });
  }, []);

  function resetDraft() {
    setDraft(initialDraft);
    setCoverFile(null);
    setBlockFiles({});
  }

  function startEdit(article: NewsArticle) {
    setDraft({
      articleId: article.id,
      title: article.title,
      excerpt: article.excerpt || '',
      author: article.author || '',
      coverImage: article.coverImage || '',
      status: article.status,
      blocks: article.blocks
    });
    setCoverFile(null);
    setBlockFiles({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateBlock(blockId: string, patch: Partial<NewsBlock>) {
    setDraft((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block))
    }));
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    setDraft((prev) => {
      const index = prev.blocks.findIndex((block) => block.id === blockId);
      if (index < 0) {
        return prev;
      }

      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.blocks.length) {
        return prev;
      }

      return {
        ...prev,
        blocks: reorder(prev.blocks, index, nextIndex)
      };
    });
  }

  function removeBlock(blockId: string) {
    setDraft((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((block) => block.id !== blockId)
    }));

    setBlockFiles((prev) => {
      const next = { ...prev };
      delete next[blockId];
      return next;
    });
  }

  function addBlock(type: NewsBlock['type']) {
    setDraft((prev) => ({
      ...prev,
      blocks: [...prev.blocks, buildEmptyBlock(type)]
    }));
  }

  function onBlockImageFileChange(blockId: string, file: File | null) {
    if (!file) {
      setBlockFiles((prev) => {
        const next = { ...prev };
        delete next[blockId];
        return next;
      });
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError(`Image trop lourde: ${file.name}. Taille max ${formatSizeMb(MAX_IMAGE_SIZE_BYTES)} Mo.`);
      return;
    }

    setError('');
    setBlockFiles((prev) => ({ ...prev, [blockId]: file }));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback('');
    setError('');

    if (!draft.title.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }

    setSaving(true);

    try {
      const totalUploadBytes = (coverFile?.size || 0) + Object.values(blockFiles).reduce((sum, file) => sum + file.size, 0);
      if (totalUploadBytes > MAX_UPLOAD_TOTAL_BYTES) {
        throw new Error(
          `Upload trop volumineux (${formatSizeMb(totalUploadBytes)} Mo). Limite ${formatSizeMb(
            MAX_UPLOAD_TOTAL_BYTES
          )} Mo. Compresse les images ou utilise des URLs.`
        );
      }

      const payloadBlocks = draft.blocks.map((block) => ({
        ...block,
        content: block.content || '',
        caption: block.caption || '',
        imageUrl: block.imageUrl || ''
      }));

      const endpoint = draft.articleId ? `/api/managed/news/${draft.articleId}` : '/api/managed/news';
      const method = draft.articleId ? 'PUT' : 'POST';
      const hasUploadedFiles = Boolean(coverFile) || Object.keys(blockFiles).length > 0;

      const requestInit: RequestInit = { method };

      if (hasUploadedFiles) {
        const formData = new FormData();
        formData.append('title', draft.title);
        formData.append('excerpt', draft.excerpt);
        formData.append('author', draft.author);
        formData.append('coverImage', draft.coverImage);
        formData.append('status', draft.status);
        formData.append('blocks', JSON.stringify(payloadBlocks));

        if (coverFile) {
          formData.append('coverFile', coverFile);
        }

        for (const [blockId, file] of Object.entries(blockFiles)) {
          formData.append(`blockImageFile:${blockId}`, file);
        }

        requestInit.body = formData;
      } else {
        requestInit.headers = { 'Content-Type': 'application/json' };
        requestInit.body = JSON.stringify({
          title: draft.title,
          excerpt: draft.excerpt,
          author: draft.author,
          coverImage: draft.coverImage,
          status: draft.status,
          blocks: payloadBlocks
        });
      }

      const res = await fetch(endpoint, requestInit);

      if (!res.ok) {
        throw new Error(await readApiError(res, 'Impossible de sauvegarder cet article.'));
      }

      const savedArticle = (await res.json()) as NewsArticle;
      await loadArticles();

      if (draft.articleId) {
        setDraft({
          articleId: savedArticle.id,
          title: savedArticle.title,
          excerpt: savedArticle.excerpt || '',
          author: savedArticle.author || '',
          coverImage: savedArticle.coverImage || '',
          status: savedArticle.status,
          blocks: savedArticle.blocks || []
        });
        setCoverFile(null);
        setBlockFiles({});
      } else {
        resetDraft();
      }

      setFeedback(draft.articleId ? 'Article modifie avec succes.' : 'Article cree avec succes.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteArticle(articleId: string) {
    if (!window.confirm('Supprimer cet article ?')) {
      return;
    }

    setFeedback('');
    setError('');

    const res = await fetch(`/api/managed/news/${articleId}`, { method: 'DELETE' });
    if (!res.ok) {
      setError(await readApiError(res, 'Suppression impossible.'));
      return;
    }

    if (draft.articleId === articleId) {
      resetDraft();
    }

    await loadArticles();
    setFeedback('Article supprime.');
  }

  function handleArticleDragStart(articleId: string) {
    setDraggedArticleId(articleId);
  }

  function handleArticleDragOver(event: DragEvent<HTMLDivElement>, articleId: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverArticleId(articleId);
  }

  async function handleArticleDrop(event: DragEvent<HTMLDivElement>, droppedOnId: string) {
    event.preventDefault();

    if (!draggedArticleId || draggedArticleId === droppedOnId) {
      setDraggedArticleId(null);
      setDragOverArticleId(null);
      return;
    }

    const nextOrder = [...orderedArticles];
    const draggedIndex = nextOrder.findIndex((article) => article.id === draggedArticleId);
    const dropIndex = nextOrder.findIndex((article) => article.id === droppedOnId);

    if (draggedIndex === -1 || dropIndex === -1) {
      setDraggedArticleId(null);
      setDragOverArticleId(null);
      return;
    }

    const reordered = reorder(nextOrder, draggedIndex, dropIndex).map((article, index) => ({
      ...article,
      order: index
    }));

    setArticles(reordered);

    try {
      const res = await fetch('/api/managed/news/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map((article) => article.id) })
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, 'Reorganisation impossible.'));
      }

      setFeedback('Ordre des articles enregistre.');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de reorganisation.');
      await loadArticles();
    } finally {
      setDraggedArticleId(null);
      setDragOverArticleId(null);
    }
  }

  function handleArticleDragEnd() {
    setDraggedArticleId(null);
    setDragOverArticleId(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">News</h1>
        <p className="mt-2 text-sm text-slate-700">
          Cree et publie des articles avec un editeur en blocs. Ajoute des photos ou tu veux puis deplace chaque bloc.
        </p>
      </div>

      {feedback ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{feedback}</p> : null}
      {error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <form onSubmit={handleSave} className="card-surface rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">{draft.articleId ? 'Modifier un article' : 'Nouvel article'}</h2>
          {draft.articleId ? (
            <button type="button" onClick={resetDraft} className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700">
              Annuler edition
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-slate-700">
            Titre
            <input
              value={draft.title}
              onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            Auteur
            <input
              value={draft.author}
              onChange={(e) => setDraft((prev) => ({ ...prev, author: e.target.value }))}
              placeholder="Ex: Alexandre"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700 md:col-span-2">
            Extrait
            <textarea
              value={draft.excerpt}
              onChange={(e) => setDraft((prev) => ({ ...prev, excerpt: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700">
            Statut
            <select
              value={draft.status}
              onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value as NewsArticle['status'] }))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="draft">Brouillon</option>
              <option value="published">Publie</option>
            </select>
          </label>

          <label className="text-sm text-slate-700">
            Image de couverture (URL)
            <input
              value={draft.coverImage}
              onChange={(e) => setDraft((prev) => ({ ...prev, coverImage: e.target.value }))}
              placeholder="https://..."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-700 md:col-span-2">
            Ou uploader une couverture
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (file && file.size > MAX_IMAGE_SIZE_BYTES) {
                  setError(`Image de couverture trop lourde: ${file.name}. Max ${formatSizeMb(MAX_IMAGE_SIZE_BYTES)} Mo.`);
                  e.currentTarget.value = '';
                  return;
                }
                setError('');
                setCoverFile(file);
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => addBlock('heading')} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
              + Titre
            </button>
            <button type="button" onClick={() => addBlock('paragraph')} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
              + Paragraphe
            </button>
            <button type="button" onClick={() => addBlock('image')} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700">
              + Image
            </button>
          </div>

          {draft.blocks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              Aucun bloc pour l&apos;instant. Ajoute des titres, paragraphes et images.
            </div>
          ) : (
            <div className="space-y-3">
              {draft.blocks.map((block, index) => (
                <div key={block.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase text-slate-500">Bloc {index + 1} - {block.type}</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => moveBlock(block.id, -1)} className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700">
                        Monter
                      </button>
                      <button type="button" onClick={() => moveBlock(block.id, 1)} className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700">
                        Descendre
                      </button>
                      <button type="button" onClick={() => removeBlock(block.id)} className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-600">
                        Supprimer
                      </button>
                    </div>
                  </div>

                  {block.type === 'heading' ? (
                    <div className="grid gap-3 md:grid-cols-[120px_minmax(0,1fr)]">
                      <select
                        value={block.level || 2}
                        onChange={(e) => updateBlock(block.id, { level: Number(e.target.value) as 1 | 2 | 3 })}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value={1}>H1</option>
                        <option value={2}>H2</option>
                        <option value={3}>H3</option>
                      </select>
                      <input
                        value={block.content || ''}
                        onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                        placeholder="Titre du bloc"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                  ) : null}

                  {block.type === 'paragraph' ? (
                    <textarea
                      value={block.content || ''}
                      onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                      rows={6}
                      placeholder="Texte. Utilise **gras**, ++souligne++, ~~barre~~"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  ) : null}

                  {block.type === 'image' ? (
                    <div className="space-y-3">
                      <input
                        value={block.imageUrl || ''}
                        onChange={(e) => updateBlock(block.id, { imageUrl: e.target.value })}
                        placeholder="URL image"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => onBlockImageFileChange(block.id, e.target.files?.[0] || null)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                      <input
                        value={block.caption || ''}
                        onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                        placeholder="Legende"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button disabled={saving} className="rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? 'Sauvegarde...' : draft.articleId ? 'Mettre a jour' : 'Publier / enregistrer'}
          </button>
        </div>
      </form>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="card-surface rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900">Apercu en direct</h2>
          <article className="mt-4 max-h-[42rem] space-y-4 overflow-y-auto pr-2">
            <header>
              <p className="text-xs font-semibold uppercase text-brand-primary">{draft.status === 'published' ? 'Article publie' : 'Brouillon'}</p>
              <h3 className="mt-1 text-2xl font-semibold text-slate-900">{previewText(draft.title, 'Titre de ton article')}</h3>
              <p className="mt-2 text-sm text-slate-600">{previewText(draft.excerpt, 'Extrait de l\'article')}</p>
              {draft.author ? <p className="mt-1 text-xs text-slate-500">Par {draft.author}</p> : null}
            </header>

            {draft.coverImage ? (
              <div className="relative h-56 overflow-hidden rounded-xl">
                <Image src={draft.coverImage} alt="Couverture" fill className="object-cover" unoptimized />
              </div>
            ) : null}

            <div className="space-y-4">
              {draft.blocks.map((block) => {
                if (block.type === 'heading') {
                  if (block.level === 1) {
                    return <h1 key={block.id} className="text-3xl font-semibold text-slate-900">{previewText(block.content || '', 'Titre H1')}</h1>;
                  }

                  if (block.level === 3) {
                    return <h3 key={block.id} className="text-xl font-semibold text-slate-900">{previewText(block.content || '', 'Titre H3')}</h3>;
                  }

                  return <h2 key={block.id} className="text-2xl font-semibold text-slate-900">{previewText(block.content || '', 'Titre H2')}</h2>;
                }

                if (block.type === 'paragraph') {
                  const lines = (block.content || '').split('\n').filter((line) => line.trim().length > 0);
                  return (
                    <p key={block.id} className="text-sm leading-7 text-slate-700">
                      {lines.length === 0
                        ? 'Paragraphe...'
                        : lines.map((line, index) => (
                            <span key={`${block.id}-line-${index}`}>
                              {index > 0 ? <br /> : null}
                              {renderInlineFormatting(line)}
                            </span>
                          ))}
                    </p>
                  );
                }

                const imageSrc = block.imageUrl || '';
                if (!imageSrc) {
                  return (
                    <div key={block.id} className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                      {blockFiles[block.id]
                        ? `Image selectionnee: ${blockFiles[block.id].name} (visible apres sauvegarde)`
                        : 'Bloc image sans visuel'}
                    </div>
                  );
                }

                return (
                  <figure key={block.id} className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="relative h-64 w-full">
                      <Image src={imageSrc} alt={block.caption || 'Image article'} fill className="object-cover" unoptimized />
                    </div>
                    {block.caption ? <figcaption className="px-4 py-2 text-xs text-slate-600">{block.caption}</figcaption> : null}
                  </figure>
                );
              })}
            </div>
          </article>
        </section>

        <section className="card-surface rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900">Articles existants</h2>
          <p className="mt-1 text-xs text-slate-500">Glisse les cartes pour changer l&apos;ordre d&apos;affichage.</p>

          <div className="mt-4 space-y-3">
            {orderedArticles.length === 0 ? (
              <p className="text-sm text-slate-600">Aucun article pour le moment.</p>
            ) : (
              orderedArticles.map((article) => (
                <div
                  key={article.id}
                  draggable
                  onDragStart={() => handleArticleDragStart(article.id)}
                  onDragOver={(event) => handleArticleDragOver(event, article.id)}
                  onDrop={(event) => handleArticleDrop(event, article.id)}
                  onDragEnd={handleArticleDragEnd}
                  className={`rounded-xl border p-4 transition ${
                    dragOverArticleId === article.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white'
                  } ${draggedArticleId === article.id ? 'opacity-60' : ''}`}
                >
                  <p className="text-xs font-semibold uppercase text-brand-primary">
                    {article.status === 'published' ? 'Publie' : 'Brouillon'}
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">{article.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{article.excerpt || 'Sans extrait'}</p>
                  <p className="mt-1 text-xs text-slate-500">{article.blocks.length} bloc(s)</p>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(article)}
                      className="rounded-full bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteArticle(article.id)}
                      className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
