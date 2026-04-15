export type EventItem = {
  id: string;
  title: string;
  date: string;
  location: string;
  type: string;
  content?: string;
  link?: string;
  thumbnailPhoto?: string;
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

export type TwitchLink = {
  name: string;
  url: string;
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
  twitchLinks?: TwitchLink[];
  multiopggUrl?: string;
  order?: number;
};

export type UpcomingMatch = {
  id: string;
  opponent: string;
  datetime: string;
  competition?: string;
  stage?: string;
  streamUrl?: string;
  teamScore?: number;
  opponentScore?: number;
  mvp?: string;
  vodUrl?: string;
};

export type ManagedOrgMember = {
  id: string;
  pole: string;
  name: string;
  role: string;
  description?: string;
  photo?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  twitch?: string;
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

export type NewsBlockType = 'heading' | 'paragraph' | 'image';

export type NewsBlock = {
  id: string;
  type: NewsBlockType;
  content?: string;
  level?: 1 | 2 | 3;
  imageUrl?: string;
  caption?: string;
};

export type NewsArticle = {
  id: string;
  title: string;
  excerpt?: string;
  coverImage?: string;
  author?: string;
  status: 'draft' | 'published';
  blocks: NewsBlock[];
  order?: number;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
};
