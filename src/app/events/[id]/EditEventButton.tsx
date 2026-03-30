'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type EditEventButtonProps = {
  eventId: string;
};

export default function EditEventButton({ eventId }: EditEventButtonProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch('/api/auth/session');
        const data = (await res.json()) as { authenticated?: boolean };
        setIsAdmin(Boolean(data.authenticated));
      } catch {
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAdmin();
  }, []);

  if (isLoading || !isAdmin) {
    return null;
  }

  return (
    <Link
      href={`/admin/events?edit=${eventId}`}
      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      ✏️ Éditer
    </Link>
  );
}
