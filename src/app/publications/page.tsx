'use client';

import Script from 'next/script';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ManagedPublicationsSettings } from '@/lib/types';

const INSTAGRAM_PROFILE = 'https://www.instagram.com/paris1esport/';
const DEFAULT_INSTAGRAM_POST_URL = 'https://www.instagram.com/p/DT-0LasDZD3/';
const TWITTER_PROFILE = 'https://twitter.com/paris1esport';
const TWITCH_CHANNEL = 'paris1esport';
const YOUTUBE_CHANNEL_HANDLE_URL = 'https://www.youtube.com/@Paris1Esport';
const DEFAULT_YOUTUBE_VIDEO_URL = '';

const YOUTUBE_CHANNEL_ID = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID;
const INSTAGRAM_POST_URL = process.env.NEXT_PUBLIC_INSTAGRAM_POST_URL;
const YOUTUBE_VIDEO_URL = process.env.NEXT_PUBLIC_YOUTUBE_VIDEO_URL;

declare global {
  interface Window {
    twttr?: {
      widgets?: {
        load: (el?: HTMLElement) => void;
      };
    };
  }
}

function toInstagramEmbedUrl(url: string) {
  const clean = url.split('?')[0].replace(/\/$/, '');
  return `${clean}/embed`;
}

function toYouTubeEmbedUrl(url?: string) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }

    if (host.endsWith('youtube.com')) {
      if (parsed.pathname === '/watch') {
        const id = parsed.searchParams.get('v');
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
      }

      if (parsed.pathname.startsWith('/shorts/')) {
        const id = parsed.pathname.split('/')[2];
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
      }

      if (parsed.pathname.startsWith('/live/')) {
        const id = parsed.pathname.split('/')[2];
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
      }

      if (parsed.pathname.startsWith('/embed/')) {
        const id = parsed.pathname.split('/')[2];
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function toDateValue(rawDate: string): number {
  const match = rawDate.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return 0;
  }
  const [, day, month, year] = match;
  return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
}

export default function PublicationsPage() {
  const [twitchParent, setTwitchParent] = useState('localhost');
  const twitterContainerRef = useRef<HTMLElement | null>(null);
  const [twitterLoaded, setTwitterLoaded] = useState(false);
  const [settings, setSettings] = useState<ManagedPublicationsSettings>({
    instagramPostUrl: INSTAGRAM_POST_URL || DEFAULT_INSTAGRAM_POST_URL,
    youtubeChannelUrl: YOUTUBE_CHANNEL_HANDLE_URL,
    youtubeVideoUrl: YOUTUBE_VIDEO_URL || DEFAULT_YOUTUBE_VIDEO_URL,
    discordChannelId: '1441202718956851220',
    discordInviteUrl: 'https://discord.gg/gbnWXxxkqK',
    discordPatchNotes: []
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname) {
      setTwitchParent(window.location.hostname);
    }

    fetch('/api/managed/publications')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ManagedPublicationsSettings | null) => {
        if (!data) {
          return;
        }
        setSettings({
          instagramPostUrl: data.instagramPostUrl || INSTAGRAM_POST_URL || DEFAULT_INSTAGRAM_POST_URL,
          youtubeChannelUrl: data.youtubeChannelUrl || YOUTUBE_CHANNEL_HANDLE_URL,
          youtubeVideoUrl: data.youtubeVideoUrl || YOUTUBE_VIDEO_URL || DEFAULT_YOUTUBE_VIDEO_URL,
          discordChannelId: data.discordChannelId || '1441202718956851220',
          discordInviteUrl: data.discordInviteUrl || 'https://discord.gg/gbnWXxxkqK',
          discordPatchNotes: Array.isArray(data.discordPatchNotes) ? data.discordPatchNotes : []
        });
      })
      .catch(() => {
        setSettings({
          instagramPostUrl: INSTAGRAM_POST_URL || DEFAULT_INSTAGRAM_POST_URL,
          youtubeChannelUrl: YOUTUBE_CHANNEL_HANDLE_URL,
          youtubeVideoUrl: YOUTUBE_VIDEO_URL || DEFAULT_YOUTUBE_VIDEO_URL,
          discordChannelId: '1441202718956851220',
          discordInviteUrl: 'https://discord.gg/gbnWXxxkqK',
          discordPatchNotes: []
        });
      });
  }, []);

  useEffect(() => {
    const checkTwitterLoaded = () => {
      const loaded = Boolean(twitterContainerRef.current?.querySelector('iframe'));
      setTwitterLoaded(loaded);
    };

    const runTwitterLoad = () => {
      if (twitterContainerRef.current) {
        window.twttr?.widgets?.load(twitterContainerRef.current);
      }
    };

    runTwitterLoad();
    const timer = window.setTimeout(() => {
      runTwitterLoad();
      checkTwitterLoaded();
    }, 500);
    const timer2 = window.setTimeout(checkTwitterLoaded, 2500);

    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(timer2);
    };
  }, []);

  const twitchPlayerSrc = useMemo(() => {
    return `https://player.twitch.tv/?channel=${TWITCH_CHANNEL}&parent=${twitchParent}&autoplay=false`;
  }, [twitchParent]);

  const twitchChatSrc = useMemo(() => {
    return `https://www.twitch.tv/embed/${TWITCH_CHANNEL}/chat?parent=${twitchParent}`;
  }, [twitchParent]);

  const youtubeEmbedSrc = useMemo(() => {
    const fromVideoUrl = toYouTubeEmbedUrl(settings.youtubeVideoUrl);
    if (fromVideoUrl) {
      return fromVideoUrl;
    }
    if (!YOUTUBE_CHANNEL_ID) {
      return null;
    }
    return `https://www.youtube-nocookie.com/embed/live_stream?channel=${YOUTUBE_CHANNEL_ID}&autoplay=0`;
  }, [settings.youtubeVideoUrl]);

  const instagramEmbedSrc = useMemo(() => {
    return toInstagramEmbedUrl(settings.instagramPostUrl || DEFAULT_INSTAGRAM_POST_URL);
  }, [settings.instagramPostUrl]);

  const sortedPatchNotes = useMemo(() => {
    const notes = Array.isArray(settings.discordPatchNotes) ? settings.discordPatchNotes : [];
    return [...notes].sort((a, b) => toDateValue(b.date) - toDateValue(a.date));
  }, [settings.discordPatchNotes]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
      <div className="mb-8 space-y-3">
        <p className="text-xs font-semibold uppercase text-brand-primary">Publications</p>
        <h1 className="text-4xl font-semibold text-slate-900">Dernières actus & rediffusions</h1>
        <p className="max-w-3xl text-lg text-slate-700">
          Cette page agrège les flux sociaux et vidéo avec des widgets live quand la plateforme le permet.
        </p>
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        <article ref={twitterContainerRef} className="card-surface rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-slate-900">X / Twitter</h2>
          <a className="twitter-timeline" data-height="560" data-theme="light" href={TWITTER_PROFILE}>
            Tweets by Paris1Esport
          </a>
          {!twitterLoaded && (
            <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
              Le widget X peut être bloqué (anti-tracking, bloqueur pub ou restrictions navigateur). Tu peux ouvrir le fil directement ici :{' '}
              <a href={TWITTER_PROFILE} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-primary hover:underline">
                @paris1esport
              </a>
              .
            </div>
          )}
          <Script
            async
            src="https://platform.twitter.com/widgets.js"
            charSet="utf-8"
            onLoad={() => {
              if (twitterContainerRef.current) {
                window.twttr?.widgets?.load(twitterContainerRef.current);
                window.setTimeout(() => {
                  const loaded = Boolean(twitterContainerRef.current?.querySelector('iframe'));
                  setTwitterLoaded(loaded);
                }, 700);
              }
            }}
          />
        </article>

        <article className="card-surface rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-slate-900">Instagram (dernier post mis en avant)</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
            <iframe
              title="Instagram Paris1Esport"
              src={instagramEmbedSrc}
              className="h-[560px] w-full"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <a href={INSTAGRAM_PROFILE} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-brand-primary hover:underline">
            Ouvrir sur Instagram
          </a>
        </article>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <article className="card-surface rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-slate-900">Twitch (live + chat)</h2>
          <div className="mt-3 space-y-3">
            <iframe
              title="Twitch Player"
              src={twitchPlayerSrc}
              className="h-[300px] w-full rounded-xl border border-slate-200"
              allowFullScreen
            />
            <iframe title="Twitch Chat" src={twitchChatSrc} className="h-[220px] w-full rounded-xl border border-slate-200" />
          </div>
          <a href={`https://www.twitch.tv/${TWITCH_CHANNEL}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-brand-primary hover:underline">
            Ouvrir sur Twitch
          </a>
        </article>

        <article className="card-surface rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-slate-900">YouTube</h2>
          {youtubeEmbedSrc ? (
            <iframe
              title="YouTube live stream"
              src={youtubeEmbedSrc}
              className="mt-3 h-[526px] w-full rounded-xl border border-slate-200"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
              Ajoute une URL YouTube video/live dans le backoffice Publications (ou NEXT_PUBLIC_YOUTUBE_VIDEO_URL), ou configure NEXT_PUBLIC_YOUTUBE_CHANNEL_ID.
            </div>
          )}
          <a href={settings.youtubeChannelUrl || YOUTUBE_CHANNEL_HANDLE_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-brand-primary hover:underline">
            Ouvrir sur YouTube
          </a>
        </article>
      </section>

      <section className="mt-8 card-surface rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Discord - Patch notes</h2>
            <p className="text-sm text-slate-700">Canal lié : {settings.discordChannelId || 'non défini'}</p>
          </div>
          {settings.discordInviteUrl && (
            <a
              href={settings.discordInviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Ouvrir Discord
            </a>
          )}
        </div>

        {sortedPatchNotes.length > 0 ? (
          <ol className="mt-4 space-y-4">
            {sortedPatchNotes.map((note) => (
              <li key={note.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-brand-primary">{note.date}</p>
                <h3 className="text-lg font-semibold text-slate-900">{note.title}</h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {note.content.map((line, index) => (
                    <li key={`${note.id}-${index}`}>• {line}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-sm text-slate-600">Aucune patch note Discord enregistrée pour le moment.</p>
        )}
      </section>
    </div>
  );
}
