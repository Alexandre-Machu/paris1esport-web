import { NextResponse } from 'next/server';
import { deleteManagedTeam, getManagedTeams, updateManagedTeam } from '@/lib/teamStore';
import { isAdminAuthenticated } from '@/lib/auth';

type TeamPayload = {
  name?: string;
  game?: string;
  level?: string;
  record?: string;
  description?: string;
};

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const body = (await req.json()) as TeamPayload;
  if (!body.name?.trim() || !body.game?.trim() || !body.level?.trim() || !body.record?.trim()) {
    return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 });
  }

  const updated = await updateManagedTeam(params.id, {
    name: body.name.trim(),
    game: body.game.trim(),
    level: body.level.trim(),
    record: body.record.trim(),
    description: body.description?.trim() || undefined
  });

  if (!updated) {
    return NextResponse.json({ error: 'Équipe introuvable.' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const removed = await deleteManagedTeam(params.id);
  if (!removed) {
    return NextResponse.json({ error: 'Équipe introuvable.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const teams = await getManagedTeams();
  const team = teams.find((item) => item.id === params.id);
  if (!team) {
    return NextResponse.json({ error: 'Équipe introuvable.' }, { status: 404 });
  }
  return NextResponse.json(team);
}
