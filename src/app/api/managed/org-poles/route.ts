import { NextResponse } from 'next/server';
import { addManagedOrgPole, getManagedOrgPoles } from '@/lib/orgPoleStore';
import { isAdminAuthenticated } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

type OrgPolePayload = {
  name?: string;
};

export async function GET() {
  const poles = await getManagedOrgPoles();
  return NextResponse.json(poles, {
    headers: {
      'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate'
    }
  });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as OrgPolePayload;
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: 'Nom de categorie requis.' }, { status: 400 });
    }

    const poles = await addManagedOrgPole(name);

    revalidatePath('/admin/orga');
    revalidatePath('/about');

    return NextResponse.json(poles);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne.' },
      { status: 500 }
    );
  }
}
