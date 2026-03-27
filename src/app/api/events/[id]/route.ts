import { NextResponse } from 'next/server';
import { deleteEvent } from '@/lib/eventStore';
import { isAdminAuthenticated } from '@/lib/auth';

export async function DELETE(
  _: Request,
  { params }: { params: { id: string } }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const ok = await deleteEvent(params.id);
  if (!ok) {
    return NextResponse.json({ error: 'Événement introuvable.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
