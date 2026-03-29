'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const links = [
  { href: '/', label: 'Accueil' },
  { href: '/about', label: "L'asso" },
  { href: '/teams', label: 'Équipes' },
  { href: '/events', label: 'Événements' },
  { href: '/publications', label: 'Publications' },
  { href: '/partners', label: 'Partenaires' },
  { href: '/admin/events', label: 'Admin' }
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [adminActive, setAdminActive] = useState(false);
  const [teamLinks, setTeamLinks] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/managed/games')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: string[]) => setTeamLinks(Array.isArray(data) ? data : []))
      .catch(() => setTeamLinks([]));

    fetch('/api/auth/session')
      .then((res) => (res.ok ? res.json() : { authenticated: false }))
      .then((data: { authenticated?: boolean }) => setAdminActive(Boolean(data.authenticated)))
      .catch(() => setAdminActive(false));
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:py-4">
        <Link href="/" className="flex items-center gap-3 font-semibold text-brand-primary hover:text-brand-secondary transition">
          <Image
            src="/logos/Logo_P1E_sansfond.png"
            alt="Logo Paris 1 Esport"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
            priority
          />
          <span className="font-display text-sm font-bold uppercase tracking-[0.08em] md:text-base">P1E</span>
        </Link>

        <button
          className="md:hidden rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
          onClick={() => setOpen(!open)}
          aria-label="Basculer la navigation"
        >
          Menu
        </button>

        <nav
          className={`${open ? '' : 'hidden'} absolute left-0 right-0 top-full border-b border-gray-200 bg-white md:static md:block md:border-none md:bg-transparent`}
        >
          <ul className="flex flex-col md:flex-row md:items-center md:gap-1">
            {links.map((link) => {
              const active = pathname === link.href;
              const isTeams = link.href === '/teams';
              return (
                <li key={link.href} className={isTeams ? 'group relative' : ''}>
                  <Link
                    href={link.href}
                    className={`block px-4 py-3 text-sm md:px-3 md:py-2 rounded-lg transition ${
                      active || (isTeams && pathname.startsWith('/teams'))
                        ? 'font-semibold text-brand-primary bg-brand-primary/5'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                  {isTeams && teamLinks.length > 0 && (
                    <div className="hidden min-w-52 rounded-lg border border-gray-200 bg-white p-2 shadow-lg md:absolute md:top-full md:block md:opacity-0 md:invisible md:group-hover:visible md:group-hover:opacity-100 md:mt-2">
                      {teamLinks.map((game) => (
                        <Link
                          key={game}
                          href={`/teams?game=${encodeURIComponent(game)}`}
                          className="block rounded-lg px-3 py-2 text-sm text-gray-700 transition hover:bg-brand-primary/10 hover:text-brand-primary"
                          onClick={() => setOpen(false)}
                        >
                          {game}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
            {adminActive && <li className="px-4 py-1 text-xs font-bold uppercase text-brand-primary md:px-3">Mode admin</li>}
            <li className="md:ml-3">
              <Link
                href="https://discord.gg/gbnWXxxkqK"
                className="mx-4 mb-3 block rounded-lg border border-brand-primary bg-brand-primary px-4 py-2 text-center text-sm font-semibold text-white shadow-md transition hover:shadow-lg hover:bg-opacity-90 md:mx-0 md:mb-0"
                onClick={() => setOpen(false)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Discord
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
