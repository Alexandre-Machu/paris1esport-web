import { NextResponse } from 'next/server';
import { deleteManagedPartner, getManagedPartners, updateManagedPartner } from '@/lib/partnerStore';
import { isAdminAuthenticated } from '@/lib/auth';
import { storePartnerLogo } from '@/lib/photoStorage';

type PartnerPayload = {
  name?: string;
  desc?: string;
  link?: string;
  logo?: string;
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
    if (isUploadedFile(logoFile)) {
      uploadedLogoPath = await storePartnerLogo(logoFile);
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
