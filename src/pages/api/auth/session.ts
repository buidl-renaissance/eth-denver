import type { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';

// In-memory store for auth sessions (in production, use Redis or database)
// Map of sessionToken -> { createdAt, expiresAt, userId (when authenticated) }
export interface AuthSession {
  createdAt: number;
  expiresAt: number;
  userId?: string;
  username?: string;
  authenticated: boolean;
}

// Global session store (persists across requests in the same server process)
declare global {
  // eslint-disable-next-line no-var
  var authSessions: Map<string, AuthSession> | undefined;
}

if (!global.authSessions) {
  global.authSessions = new Map<string, AuthSession>();
}

const sessions = global.authSessions;

// Session validity duration: 5 minutes
const SESSION_DURATION_MS = 5 * 60 * 1000;

// Clean up expired sessions periodically
const cleanupExpiredSessions = () => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(token);
    }
  }
};

/**
 * Auth session management for QR code login
 *
 * POST /api/auth/session - Create a new auth session (returns token for QR code)
 * GET /api/auth/session?token=xxx - Check if session has been authenticated (polling)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Clean up expired sessions
  cleanupExpiredSessions();

  if (req.method === 'POST') {
    // Create a new auth session
    try {
      const token = randomBytes(32).toString('hex');
      const now = Date.now();

      const session: AuthSession = {
        createdAt: now,
        expiresAt: now + SESSION_DURATION_MS,
        authenticated: false,
      };

      sessions.set(token, session);

      console.log('🔑 [AUTH SESSION] Created new session:', {
        token: token.slice(0, 8) + '...',
        expiresAt: new Date(session.expiresAt).toISOString(),
      });

      return res.status(200).json({
        success: true,
        token,
        expiresAt: session.expiresAt,
      });
    } catch (error) {
      console.error('❌ [AUTH SESSION] Error creating session:', error);
      return res.status(500).json({ error: 'Failed to create session' });
    }
  }

  if (req.method === 'GET') {
    // Check session status (for polling)
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }

    const session = sessions.get(token);

    if (!session) {
      return res.status(404).json({
        error: 'Session not found or expired',
        expired: true,
      });
    }

    if (session.expiresAt < Date.now()) {
      sessions.delete(token);
      return res.status(404).json({
        error: 'Session expired',
        expired: true,
      });
    }

    if (session.authenticated && session.userId) {
      // Session has been authenticated - set the cookie and return user info
      res.setHeader(
        'Set-Cookie',
        `user_session=${session.userId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`
      );

      // Clean up the session now that it's been used
      sessions.delete(token);

      console.log('✅ [AUTH SESSION] Session authenticated:', {
        token: token.slice(0, 8) + '...',
        userId: session.userId,
        username: session.username,
      });

      return res.status(200).json({
        authenticated: true,
        userId: session.userId,
        username: session.username,
        user: { id: session.userId, username: session.username },
      });
    }

    // Session exists but not yet authenticated
    return res.status(200).json({
      authenticated: false,
      expiresAt: session.expiresAt,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Export for use by the authenticate endpoint
export { sessions };
