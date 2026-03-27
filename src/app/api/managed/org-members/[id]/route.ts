import { NextResponse } from 'next/server';
import { deleteManagedOrgMember, getManagedOrgMembers, updateManagedOrgMember } from '@/lib/orgStore';
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

export async function PUT(req: Request, { params }: { params: { id: string } }) {
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

  const updated = await updateManagedOrgMember(params.id, {
    pole: body.pole.trim(),
    name: body.name.trim(),
    role: body.role.trim(),
    description: body.description?.trim() || undefined,
    photo: uploadedPhotoPath || body.photo?.trim() || undefined
  });

  if (!updated) {
    return NextResponse.json({ error: 'Membre introuvable.' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const removed = await deleteManagedOrgMember(params.id);
  if (!removed) {
    return NextResponse.json({ error: 'Membre introuvable.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const members = await getManagedOrgMembers();
  const member = members.find((item) => item.id === params.id);
  if (!member) {
    return NextResponse.json({ error: 'Membre introuvable.' }, { status: 404 });
  }
  return NextResponse.json(member);
}
