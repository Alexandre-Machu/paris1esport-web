import { getEvents } from '@/lib/eventStore';
import { eventParamMatches } from '@/lib/eventSlug';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import EditEventButton from './EditEventButton';

export const revalidate = 60;

type PageProps = {
  params: { id: string };
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.paris1esport.fr';

function toAbsoluteUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${SITE_URL}${normalizedPath}`;
}

function getEventEmbedDescription(event: {
  date: string;
  location: string;
  content?: string;
}): string {
  const content = (event.content || '')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\+\+([^+]+)\+\+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  const base = `${event.date} · ${event.location}`;
  if (!content) {
    return base;
  }

  const preview = content.length > 180 ? `${content.slice(0, 177)}...` : content;
  return `${base} · ${preview}`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const events = await getEvents();
  const event = events.find((e) => eventParamMatches(e, params.id));

  if (!event) {
    return {
      title: 'Événement introuvable | Paris 1 Esport',
      description: 'Cet événement n\'existe pas ou plus.'
    };
  }

  const coverPhoto = event.photos?.[0] || '/logos/Logo_P1E_sansfond.png';
  const absoluteCoverPhoto = toAbsoluteUrl(coverPhoto);
  const description = getEventEmbedDescription(event);
  const canonicalUrl = `${SITE_URL}/events/${params.id}`;

  return {
    title: `${event.title} | Paris 1 Esport`,
    description,
    alternates: {
      canonical: canonicalUrl
    },
    openGraph: {
      type: 'article',
      locale: 'fr_FR',
      url: canonicalUrl,
      title: event.title,
      description,
      siteName: 'Paris 1 Esport',
      images: [
        {
          url: absoluteCoverPhoto,
          width: 1400,
          height: 780,
          alt: `${event.title} - couverture`
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description,
      images: [absoluteCoverPhoto]
    }
  };
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

function renderBlock(block: string, key: string): ReactNode {
  const trimmed = block.trim();

  if (trimmed.startsWith('### ')) {
    return <h3 key={key}>{renderInlineFormatting(trimmed.slice(4))}</h3>;
  }

  if (trimmed.startsWith('## ')) {
    return <h2 key={key}>{renderInlineFormatting(trimmed.slice(3))}</h2>;
  }

  if (trimmed.startsWith('# ')) {
    return <h1 key={key}>{renderInlineFormatting(trimmed.slice(2))}</h1>;
  }

  const lines = trimmed.split('\n').filter((line) => line.trim().length > 0);

  return (
    <p key={key}>
      {lines.map((line, index) => (
        <span key={`${key}-line-${index}`}>
          {index > 0 && <br />}
          {renderInlineFormatting(line)}
        </span>
      ))}
    </p>
  );
}

function splitContentBlocks(rawContent: string): string[] {
  const normalized = rawContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const blocks: string[] = [];
  let currentBlock: string[] = [];

  for (const line of lines) {
    if (line.trim().length === 0) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock.join('\n').trim());
        currentBlock = [];
      }
      continue;
    }

    currentBlock.push(line);
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join('\n').trim());
  }

  return blocks.filter(Boolean);
}

export default async function EventDetailPage({ params }: PageProps) {
  const events = await getEvents();
  const event = events.find((e) => eventParamMatches(e, params.id));

  if (!event) {
    notFound();
  }

  const photos = event.photos || [];
  const coverPhoto = photos[0];
  const gallery = photos.slice(1);
  const articleParagraphs = event.content?.trim()
    ? splitContentBlocks(event.content)
    : [
        `Retrouve toutes les informations pratiques pour ${event.title}.`,
        'Les details logistiques et les annonces importantes sont centralises sur cette page.',
        'Pour participer, surveille notre Discord et les communications de l\'association.'
      ];

  return (
    <article className="mx-auto max-w-5xl px-4 pb-20 pt-12">
      <Link href="/events" className="text-sm font-semibold text-brand-primary hover:underline">
        ← Retour aux événements
      </Link>

      <header className="mt-8">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-brand-primary">{event.type}</p>
            <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">{event.title}</h1>
          </div>
          <EditEventButton eventId={event.id} />
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1">{event.date}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">{event.location}</span>
          {event.link && (
            <a
              href={event.link}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-brand-primary px-3 py-1 font-semibold text-white hover:bg-brand-primary/90"
            >
              Infos / inscription
            </a>
          )}
        </div>
      </header>

      {coverPhoto && (
        <div className="relative mt-8 overflow-hidden rounded-2xl">
          <Image
            src={coverPhoto}
            alt={`${event.title} - photo de couverture`}
            width={1400}
            height={780}
            className="h-auto w-full object-cover"
            priority
          />
        </div>
      )}

      <section className="prose prose-slate mt-10 max-w-none prose-p:text-slate-700 prose-p:leading-7">
        {articleParagraphs.map((paragraph, index) => (
          <div key={`${event.id}-block-${index}`} className="mb-6 last:mb-0">
            {renderBlock(paragraph, `${event.id}-paragraph-${index}`)}
          </div>
        ))}
      </section>

      {gallery.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold text-slate-900">Galerie photos</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {gallery.map((photo, index) => (
              <div key={`${event.id}-gallery-${index}`} className="overflow-hidden rounded-xl">
                <Image
                  src={photo}
                  alt={`${event.title} - photo ${index + 2}`}
                  width={1000}
                  height={620}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
