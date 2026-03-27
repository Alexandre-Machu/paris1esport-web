import { NextResponse } from 'next/server';
import { addManagedTeam, getManagedTeams } from '@/lib/teamStore';
import { isAdminAuthenticated } from '@/lib/auth';

type TeamPayload = {
  name?: string;
  game?: string;
  level?: string;
  record?: string;
  description?: string;
};

export async function GET() {
  const teams = await getManagedTeams();
  return NextResponse.json(teams);
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const body = (await req.json()) as TeamPayload;
  if (!body.name?.trim() || !body.game?.trim() || !body.level?.trim() || !body.record?.trim()) {
    return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 });
  }

  const created = await addManagedTeam({
    name: body.name.trim(),
    game: body.game.trim(),
    level: body.level.trim(),
    record: body.record.trim(),
    description: body.description?.trim() || undefined
  });

  return NextResponse.json(created, { status: 201 });
}
