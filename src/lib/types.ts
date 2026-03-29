export type EventItem = {
  id: string;
  title: string;
  date: string;
  location: string;
  type: string;
  link?: string;
  photos?: string[];
  order?: number;
};

export type TeamPlayer = {
  name: string;
  role?: string;
  elo?: string;
  opgg?: string;
  note?: string;
  favoriteChampion?: string;
};

export type ManagedTeamItem = {
  id: string;
  name: string;
  game: string;
  level: string;
  record: string;
  description?: string;
  players?: TeamPlayer[];
  nextMatches?: UpcomingMatch[];
  order?: number;
};

export type UpcomingMatch = {
  id: string;
  opponent: string;
  datetime: string;
  competition?: string;
  stage?: string;
  streamUrl?: string;
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
  order?: number;
};

export type ManagedPartner = {
  id: string;
  name: string;
  desc: string;
  link: string;
  logo?: string;
  order?: number;
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
  discordInviteUrl?: string;
  discordPatchNotes?: DiscordPatchNote[];
  featuredEventId?: string;
};
