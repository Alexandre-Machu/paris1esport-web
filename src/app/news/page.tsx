import Image from 'next/image';
import Link from 'next/link';
import { getPublishedNewsArticles } from '@/lib/newsStore';
import { toNewsPathParam } from '@/lib/newsSlug';

export const dynamic = 'force-dynamic';

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

export default async function NewsPage() {
  const articles = await getPublishedNewsArticles();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
      <div className="mb-8 space-y-3">
        <p className="section-title text-[11px] font-semibold text-brand-primary">News</p>
        <h1 className="font-display text-4xl font-semibold text-slate-900">Actualites Paris 1 Esport</h1>
        <p className="max-w-3xl text-lg text-slate-600">
          Tous les articles de l&apos;association: annonces, recaps, interviews et coulisses.
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-6 text-sm text-slate-600">
          Aucune news publiee pour le moment.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/news/${toNewsPathParam(article)}`}
              className="group card-surface overflow-hidden rounded-2xl transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <article>
                {article.coverImage ? (
                  <div className="relative h-56 w-full">
                    <Image src={article.coverImage} alt={article.title} fill className="object-cover transition duration-300 group-hover:scale-[1.03]" />
                  </div>
                ) : (
                  <div className="h-56 w-full bg-gradient-to-br from-slate-200 to-slate-300" />
                )}

                <div className="p-5">
                  <p className="text-xs font-semibold uppercase text-brand-primary">{toDateLabel(article.publishedAt || article.updatedAt)}</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">{article.title}</h2>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-700">{article.excerpt || 'Clique pour lire cet article.'}</p>
                  <p className="mt-4 text-sm font-semibold text-brand-primary transition group-hover:text-brand-secondary">Lire l&apos;article →</p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
