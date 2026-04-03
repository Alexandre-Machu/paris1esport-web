import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { getPublishedNewsArticles } from '@/lib/newsStore';
import { newsParamMatches } from '@/lib/newsSlug';
import type { NewsBlock } from '@/lib/types';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: { slug: string };
};

function toDateLabel(value: string | undefined) {
  if (!value) {
    return 'Date a definir';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Date a definir';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long'
  }).format(date);
}

function renderInlineFormatting(text: string): ReactNode[] {
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

    return <span key={`text-${index}`}>{chunk}</span>;
  });
}

function renderParagraph(content: string, key: string) {
  const lines = content.split('\n').filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return null;
  }

  return (
    <p key={key} className="text-base leading-7 text-slate-700">
      {lines.map((line, index) => (
        <span key={`${key}-${index}`}>
          {index > 0 ? <br /> : null}
          {renderInlineFormatting(line)}
        </span>
      ))}
    </p>
  );
}

function renderBlock(block: NewsBlock) {
  if (block.type === 'heading') {
    const content = block.content || '';
    if (!content.trim()) {
      return null;
    }

    if (block.level === 1) {
      return <h1 key={block.id} className="text-4xl font-semibold text-slate-900">{renderInlineFormatting(content)}</h1>;
    }

    if (block.level === 3) {
      return <h3 key={block.id} className="text-2xl font-semibold text-slate-900">{renderInlineFormatting(content)}</h3>;
    }

    return <h2 key={block.id} className="text-3xl font-semibold text-slate-900">{renderInlineFormatting(content)}</h2>;
  }

  if (block.type === 'paragraph') {
    return renderParagraph(block.content || '', block.id);
  }

  if (block.type === 'image') {
    if (!block.imageUrl) {
      return null;
    }

    return (
      <figure key={block.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <Image src={block.imageUrl} alt={block.caption || 'Image de l\'article'} width={1400} height={860} className="h-auto w-full object-cover" />
        {block.caption ? <figcaption className="px-4 py-3 text-xs text-slate-600">{block.caption}</figcaption> : null}
      </figure>
    );
  }

  return null;
}

export default async function NewsDetailPage({ params }: PageProps) {
  const articles = await getPublishedNewsArticles();
  const article = articles.find((item) => newsParamMatches(item, params.slug));

  if (!article) {
    notFound();
  }

  return (
    <article className="mx-auto max-w-4xl px-4 pb-20 pt-12">
      <Link href="/news" className="text-sm font-semibold text-brand-primary hover:underline">
        ← Retour aux news
      </Link>

      <header className="mt-6 space-y-3">
        <p className="text-xs font-semibold uppercase text-brand-primary">News</p>
        <h1 className="font-display text-4xl font-semibold text-slate-900 md:text-5xl">{article.title}</h1>
        <p className="text-sm text-slate-500">
          {toDateLabel(article.publishedAt || article.updatedAt)}
          {article.author ? ` · Par ${article.author}` : ''}
        </p>
        {article.excerpt ? <p className="text-lg text-slate-700">{article.excerpt}</p> : null}
      </header>

      {article.coverImage ? (
        <div className="relative mt-8 overflow-hidden rounded-2xl">
          <Image src={article.coverImage} alt={article.title} width={1500} height={860} className="h-auto w-full object-cover" priority />
        </div>
      ) : null}

      <section className="mt-10 space-y-8">
        {article.blocks.map((block) => (
          <div key={block.id}>{renderBlock(block)}</div>
        ))}
      </section>
    </article>
  );
}
