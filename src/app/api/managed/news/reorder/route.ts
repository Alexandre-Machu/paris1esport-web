import { NextResponse } from 'next/server';
import { reorderNewsArticles } from '@/lib/newsStore';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }

  const body = (await req.json()) as { orderedIds?: string[] };
  if (!Array.isArray(body.orderedIds) || body.orderedIds.length === 0) {
    return NextResponse.json({ error: 'orderedIds est requis.' }, { status: 400 });
  }

  const ok = await reorderNewsArticles(body.orderedIds);
  if (!ok) {
    return NextResponse.json({ error: 'Reorganisation impossible.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
