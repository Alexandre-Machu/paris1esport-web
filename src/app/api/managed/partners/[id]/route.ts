import { NextResponse } from 'next/server';
import { deleteManagedPartner, getManagedPartners, updateManagedPartner } from '@/lib/partnerStore';
import { isAdminAuthenticated } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

type PartnerPayload = {
  name?: string;
  desc?: string;
  link?: string;
  logo?: string;
};

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const contentType = req.headers.get('content-type') || '';
  let body: PartnerPayload = {};
  let uploadedLogoPath: string | undefined;

  if (contentType.includes('multipart/form-data')) {
    const formData = await req.formData();
    body = {
      name: String(formData.get('name') || ''),
      desc: String(formData.get('desc') || ''),
      link: String(formData.get('link') || ''),
      logo: String(formData.get('logo') || '')
    };

    const logoFile = formData.get('logoFile');
    if (logoFile instanceof File && logoFile.size > 0) {
      const uploadDir = path.join(process.cwd(), 'public', 'logos', 'partners');
      await fs.mkdir(uploadDir, { recursive: true });
      const extension = path.extname(logoFile.name) || '.png';
      const fileName = `${Date.now()}-${randomUUID()}${extension}`;
      const buffer = Buffer.from(await logoFile.arrayBuffer());
      await fs.writeFile(path.join(uploadDir, fileName), buffer);
      uploadedLogoPath = `/logos/partners/${fileName}`;
    }
  } else {
    body = (await req.json()) as PartnerPayload;
  }

  if (!body.name?.trim() || !body.desc?.trim() || !body.link?.trim()) {
    return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 });
  }

  const updated = await updateManagedPartner(params.id, {
    name: body.name.trim(),
    desc: body.desc.trim(),
    link: body.link.trim(),
    logo: uploadedLogoPath || body.logo?.trim() || undefined
  });

  if (!updated) {
    return NextResponse.json({ error: 'Partenaire introuvable.' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const removed = await deleteManagedPartner(params.id);
  if (!removed) {
    return NextResponse.json({ error: 'Partenaire introuvable.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const partners = await getManagedPartners();
  const partner = partners.find((item) => item.id === params.id);
  if (!partner) {
    return NextResponse.json({ error: 'Partenaire introuvable.' }, { status: 404 });
  }
  return NextResponse.json(partner);
}
