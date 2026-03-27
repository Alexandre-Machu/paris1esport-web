import { NextResponse } from 'next/server';
import { getPublicationsSettings, updatePublicationsSettings } from '@/lib/publicationsStore';
import { isAdminAuthenticated } from '@/lib/auth';
import type { DiscordPatchNote } from '@/lib/types';

type PublicationsPayload = {
  instagramPostUrl?: string;
  youtubeChannelUrl?: string;
  youtubeVideoUrl?: string;
  discordChannelId?: string;
  discordInviteUrl?: string;
  discordPatchNotes?: DiscordPatchNote[];
};

export async function GET() {
  const settings = await getPublicationsSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  const body = (await req.json()) as PublicationsPayload;

  const updated = await updatePublicationsSettings({
    instagramPostUrl: body.instagramPostUrl?.trim() || undefined,
    youtubeChannelUrl: body.youtubeChannelUrl?.trim() || undefined,
    youtubeVideoUrl: body.youtubeVideoUrl?.trim() || undefined,
    discordChannelId: body.discordChannelId?.trim() || undefined,
    discordInviteUrl: body.discordInviteUrl?.trim() || undefined,
    discordPatchNotes: Array.isArray(body.discordPatchNotes) ? body.discordPatchNotes : undefined
  });

  return NextResponse.json(updated);
}
