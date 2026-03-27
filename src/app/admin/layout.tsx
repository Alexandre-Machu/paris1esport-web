import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getAuthCookieName, isAdminAuthenticated } from '@/lib/auth';

const adminTabs = [
  { href: '/admin/events', label: 'Evenements' },
  { href: '/admin/esport', label: 'Equipes esport' },
  { href: '/admin/orga', label: 'Orga' },
  { href: '/admin/partners', label: 'Partenaires' },
  { href: '/admin/publications', label: 'Publications' }
];

async function logout() {
  'use server';

  cookies().set({
    name: getAuthCookieName(),
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  });

  redirect('/login');
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdminAuthenticated())) {
    redirect('/login?redirect=/admin/events');
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-brand-primary">Backoffice</p>
        <form action={logout}>
          <button type="submit" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
            Se deconnecter
          </button>
        </form>
      </div>

      <nav className="mb-8 grid gap-2 rounded-2xl border border-slate-200 bg-white p-2 md:grid-cols-5">
        {adminTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-brand-primary"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
