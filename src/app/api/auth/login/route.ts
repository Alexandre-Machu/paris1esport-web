import { NextResponse } from 'next/server';
import { createSessionToken, getAuthCookieName, getExpectedAdminCredentials } from '@/lib/auth';

type LoginPayload = {
  username?: string;
  password?: string;
};

export async function POST(req: Request) {
  const body = (await req.json()) as LoginPayload;
  const { username: expectedUsername, password: expectedPassword } = getExpectedAdminCredentials();

  if (body.username !== expectedUsername || body.password !== expectedPassword) {
    return NextResponse.json({ error: 'Identifiants invalides.' }, { status: 401 });
  }

  const token = createSessionToken(body.username);
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: getAuthCookieName(),
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12
  });

  return response;
}
