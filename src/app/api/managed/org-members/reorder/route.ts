import { NextResponse } from 'next/server';
import { reorderOrgMembers } from '@/lib/orgStore';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type ReorderPayload = {
  pole?: string;
  orderedIds?: string[];
};

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as ReorderPayload;
    const { pole, orderedIds } = body;

    if (!pole || !Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: 'pole et orderedIds sont requis.' },
        { status: 400 }
      );
    }

    const success = await reorderOrgMembers(pole, orderedIds);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Réorganisation impossible.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Reorder members error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur interne.' },
      { status: 500 }
    );
  }
}
