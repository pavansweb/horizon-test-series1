import { cookies } from 'next/headers.js';
import crypto from 'crypto';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'jee2026admin';
const SESSION_SECRET = process.env.SESSION_SECRET || 'nta-jee-cbt-secret-key-32charsmin-2026';
const COOKIE_NAME = 'admin_session';

/**
 * Creates a signed session token: timestamp.signature
 */
export function createSessionToken(): string {
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(timestamp)
    .digest('hex');
  return `${timestamp}.${signature}`;
}

/**
 * Validates a session token
 */
export function verifySessionToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [timestamp, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(timestamp)
    .digest('hex');

  // Verify signature using timing-safe comparison
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length) return false;

  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return false;

  // Session expiry: 7 days
  const tokenAgeMs = Date.now() - parseInt(timestamp, 10);
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  return tokenAgeMs >= 0 && tokenAgeMs <= maxAgeMs;
}

/**
 * Checks if the request has valid admin credentials
 */
export function isAuthenticatedAdmin(
  reqOrHeaders?: Request | Headers | { headers?: Headers } | null
): boolean {
  if (!reqOrHeaders) return false;

  // 1. Check if it's a Request or NextRequest object
  if ('headers' in reqOrHeaders && reqOrHeaders.headers) {
    const headers = reqOrHeaders.headers;
    const tokenHeader = headers.get('x-admin-token');
    if (tokenHeader && verifySessionToken(tokenHeader)) return true;

    const authHeader = headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (verifySessionToken(token)) return true;
    }

    const cookieHeader = headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
      if (match && verifySessionToken(decodeURIComponent(match[1]))) return true;
    }
  } else if ('get' in reqOrHeaders && typeof reqOrHeaders.get === 'function') {
    // 2. If it is a Headers instance
    const headers = reqOrHeaders as Headers;
    const tokenHeader = headers.get('x-admin-token');
    if (tokenHeader && verifySessionToken(tokenHeader)) return true;

    const authHeader = headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (verifySessionToken(token)) return true;
    }

    const cookieHeader = headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
      if (match && verifySessionToken(decodeURIComponent(match[1]))) return true;
    }
  }

  // 3. Fallback to cookies() from next/headers
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);
    if (sessionCookie && verifySessionToken(sessionCookie.value)) {
      return true;
    }
  } catch {
    // cookies() might not be available outside component context
  }

  return false;
}

export function checkAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export { COOKIE_NAME };
