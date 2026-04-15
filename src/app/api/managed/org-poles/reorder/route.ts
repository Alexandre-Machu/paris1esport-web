import { NextResponse } from 'next/server';
import { reorderManagedOrgPoles } from '@/lib/orgPoleStore';
import { isAdminAuthenticated } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

type ReorderPayload = {
  orderedPoles?: string[];
};

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as ReorderPayload;
    const orderedPoles = body.orderedPoles;

    if (!Array.isArray(orderedPoles)) {
      return NextResponse.json({ error: 'orderedPoles est requis.' }, { status: 400 });
    }

    const poles = await reorderManagedOrgPoles(orderedPoles);

    revalidatePath('/admin/orga');
    revalidatePath('/about');

    return NextResponse.json({ success: true, poles });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne.' },
      { status: 500 }
    );
  }
}
