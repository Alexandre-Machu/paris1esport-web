import { NextResponse } from 'next/server';
import { addManagedPartner, getManagedPartners } from '@/lib/partnerStore';
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

export async function GET() {
  const partners = await getManagedPartners();
  return NextResponse.json(partners);
}

export async function POST(req: Request) {
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

  const created = await addManagedPartner({
    name: body.name.trim(),
    desc: body.desc.trim(),
    link: body.link.trim(),
    logo: uploadedLogoPath || body.logo?.trim() || undefined
  });

  return NextResponse.json(created, { status: 201 });
}
