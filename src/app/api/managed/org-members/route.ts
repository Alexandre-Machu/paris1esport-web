import { NextResponse } from 'next/server';
import { addManagedOrgMember, getManagedOrgMembers } from '@/lib/orgStore';
import { isAdminAuthenticated } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { ORG_POLES } from '@/lib/types';

type OrgPayload = {
  pole?: string;
  name?: string;
  role?: string;
  description?: string;
  photo?: string;
};

export async function GET() {
  const members = await getManagedOrgMembers();
  return NextResponse.json(members);
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

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
      photo: String(formData.get('photo') || '')
    };

    const photoFile = formData.get('photoFile');
    if (photoFile instanceof File && photoFile.size > 0) {
      const uploadDir = path.join(process.cwd(), 'public', 'photos', 'org');
      await fs.mkdir(uploadDir, { recursive: true });
      const extension = path.extname(photoFile.name) || '.jpg';
      const fileName = `${Date.now()}-${randomUUID()}${extension}`;
      const buffer = Buffer.from(await photoFile.arrayBuffer());
      await fs.writeFile(path.join(uploadDir, fileName), buffer);
      uploadedPhotoPath = `/photos/org/${fileName}`;
    }
  } else {
    body = (await req.json()) as OrgPayload;
  }

  if (!body.pole?.trim() || !body.name?.trim() || !body.role?.trim()) {
    return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 });
  }

  if (!ORG_POLES.includes(body.pole.trim() as (typeof ORG_POLES)[number])) {
    return NextResponse.json({ error: 'Pôle invalide.' }, { status: 400 });
  }

  const created = await addManagedOrgMember({
    pole: body.pole.trim(),
    name: body.name.trim(),
    role: body.role.trim(),
    description: body.description?.trim() || undefined,
    photo: uploadedPhotoPath || body.photo?.trim() || undefined
  });

  return NextResponse.json(created, { status: 201 });
}
