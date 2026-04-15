import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAdminAuthenticated } from '@/lib/auth';
import {
  getManagedOrgContentSettings,
  updateManagedOrgContentSettings
} from '@/lib/orgContentStore';
import type { ManagedOrgContentSettings } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getManagedOrgContentSettings();
    return NextResponse.json(settings, {
      headers: {
        'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorise.' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as ManagedOrgContentSettings;

    const next = await updateManagedOrgContentSettings({
      aboutDescription: typeof body.aboutDescription === 'string' ? body.aboutDescription : undefined,
      poleDescriptions:
        body.poleDescriptions && typeof body.poleDescriptions === 'object'
          ? body.poleDescriptions
          : undefined
    });

    revalidatePath('/admin/orga');
    revalidatePath('/about');

    return NextResponse.json(next);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur interne.' },
      { status: 500 }
    );
  }
}
