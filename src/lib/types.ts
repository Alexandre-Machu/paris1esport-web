export type EventItem = {
  id: string;
  title: string;
  date: string;
  location: string;
  type: string;
  link?: string;
  photos?: string[];
};

export type TeamPlayer = {
  name: string;
  role?: string;
  elo?: string;
  opgg?: string;
  note?: string;
};

export type ManagedTeamItem = {
  id: string;
  name: string;
  game: string;
  level: string;
  record: string;
  description?: string;
  players?: TeamPlayer[];
};

export const ORG_POLES = [
  'Bureau Executif',
  'Pole Communication',
  'Pole Event',
  'Pole Esport'
] as const;

export type ManagedOrgMember = {
  id: string;
  pole: string;
  name: string;
  role: string;
  description?: string;
  photo?: string;
};

export type ManagedPartner = {
  id: string;
  name: string;
  desc: string;
  link: string;
  logo?: string;
};

export type DiscordPatchNote = {
  id: string;
  title: string;
  date: string;
  content: string[];
};

export type ManagedPublicationsSettings = {
  instagramPostUrl?: string;
  youtubeChannelUrl?: string;
  youtubeVideoUrl?: string;
  discordChannelId?: string;
  discordInviteUrl?: string;
  discordPatchNotes?: DiscordPatchNote[];
};
