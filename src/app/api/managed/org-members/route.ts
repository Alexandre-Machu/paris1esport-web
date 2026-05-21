import { NextResponse } from 'next/server';
import { addManagedOrgMember, getManagedOrgMembers } from '@/lib/orgStore';
import { isAdminAuthenticated } from '@/lib/auth';
import { getManagedOrgPoles } from '@/lib/orgPoleStore';
import { storeOrgPhoto } from '@/lib/photoStorage';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

type OrgPayload = {
  pole?: string;
  name?: string;
  role?: string;
  description?: string;
  photo?: string;
  discord?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  twitch?: string;
};

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return (
    !!value &&
    typeof value === 'object' &&
    'size' in value &&
    typeof value.size === 'number' &&
    value.size > 0 &&
    'name' in value &&
    typeof value.name === 'string' &&
    'arrayBuffer' in value &&
    typeof value.arrayBuffer === 'function'
  );
}

export async function GET() {
  const members = await getManagedOrgMembers();
  return NextResponse.json(members, {
    headers: {
      'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate'
    }
  });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let body: OrgPayload = {};
    let uploadedPhotoPath: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      body = {
        pole: String(formData.get('pole') || ''),
        name: String(formData.get('name') || ''),
        role: String(formData.get('role') || ''),
        description: String(formData.get('description') || ''),
        photo: String(formData.get('photo') || ''),
        discord: String(formData.get('discord') || ''),
        linkedin: String(formData.get('linkedin') || ''),
        twitter: String(formData.get('twitter') || ''),
        instagram: String(formData.get('instagram') || ''),
        twitch: String(formData.get('twitch') || '')
      };

      const photoFile = formData.get('photoFile');
      if (isUploadedFile(photoFile)) {
        uploadedPhotoPath = await storeOrgPhoto(photoFile);
      }
    } else {
      body = (await req.json()) as OrgPayload;
    }

    if (!body.pole?.trim() || !body.name?.trim() || !body.role?.trim()) {
      return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 });
    }

    const availablePoles = await getManagedOrgPoles();
    const normalizedPole = body.pole.trim();

    if (!availablePoles.some((pole) => pole.toLowerCase() === normalizedPole.toLowerCase())) {
      return NextResponse.json({ error: 'Pôle invalide.' }, { status: 400 });
    }

    const created = await addManagedOrgMember({
      pole: body.pole.trim(),
      name: body.name.trim(),
      role: body.role.trim(),
      description: body.description?.trim() || undefined,
      photo: uploadedPhotoPath || body.photo?.trim() || undefined,
      discord: body.discord?.trim() || undefined,
      linkedin: body.linkedin?.trim() || undefined,
      twitter: body.twitter?.trim() || undefined,
      instagram: body.instagram?.trim() || undefined,
      twitch: body.twitch?.trim() || undefined
    });

    revalidatePath('/admin/orga');
    revalidatePath('/about');

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: 'Stockage indisponible. Verifiez DATABASE_URL.' },
      { status: 500 }
    );
  }
}
