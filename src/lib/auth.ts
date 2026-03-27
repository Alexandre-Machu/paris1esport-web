import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const AUTH_COOKIE = 'p1e_admin_session';
const TOKEN_TTL_SECONDS = 60 * 60 * 12;

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is missing');
  }
  return secret;
}

function sign(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function createSessionToken(username: string): string {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const payload = `${username}:${exp}`;
  const signature = sign(payload, getSessionSecret());
  return `${payload}:${signature}`;
}

export function verifySessionToken(token?: string): boolean {
  if (!token) {
    return false;
  }

  const parts = token.split(':');
  if (parts.length !== 3) {
    return false;
  }

  const [username, expRaw, signature] = parts;
  const exp = Number(expRaw);

  if (!username || !Number.isFinite(exp)) {
    return false;
  }

  if (Math.floor(Date.now() / 1000) > exp) {
    return false;
  }

  const payload = `${username}:${exp}`;
  const expected = sign(payload, getSessionSecret());

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const token = cookies().get(AUTH_COOKIE)?.value;
  return verifySessionToken(token);
}

export function getAuthCookieName() {
  return AUTH_COOKIE;
}

export function getExpectedAdminCredentials() {
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;

  if (!username || !password) {
    throw new Error('ADMIN_USERNAME or ADMIN_PASSWORD is missing');
  }

  return { username, password };
}
