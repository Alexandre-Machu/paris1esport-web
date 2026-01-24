'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const links = [
  { href: '/', label: 'Accueil' },
  { href: '/about', label: "L'asso" },
  { href: '/teams', label: 'Équipes' },
  { href: '/events', label: 'Événements' },
  { href: '/partners', label: 'Partenaires' }
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:py-4">
        <Link href="/" className="flex items-center gap-3 font-semibold text-slate-900">
          <Image
            src="/logos/Logo_P1E_sansfond.png"
            alt="Logo Paris 1 Esport"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
            priority
          />
          <span>Paris 1 Esport</span>
        </Link>

        <button
          className="md:hidden rounded-md border border-slate-200 px-3 py-2 text-sm"
          onClick={() => setOpen(!open)}
          aria-label="Basculer la navigation"
        >
          Menu
        </button>

        <nav
          className={`${open ? '' : 'hidden'} absolute left-0 right-0 top-full border-b border-slate-100 bg-white md:static md:block md:border-none md:bg-transparent`}
        >
          <ul className="flex flex-col md:flex-row md:items-center md:gap-4">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`block px-4 py-3 text-sm md:px-2 md:py-0 ${
                      active ? 'text-brand-primary font-semibold' : 'text-slate-700 hover:text-brand-primary'
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            <li className="md:ml-3">
              <Link
                href="https://discord.gg/gbnWXxxkqK"
                className="mx-4 mb-3 block rounded-full bg-brand-primary px-4 py-2 text-center text-sm font-semibold text-white shadow-md shadow-brand-primary/20 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-primary/25 md:mx-0 md:mb-0"
                onClick={() => setOpen(false)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Rejoindre le Discord
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
