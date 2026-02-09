import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Log out the current user
 * POST /api/auth/logout
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Clear the session cookie
    res.setHeader('Set-Cookie', [
      'user_session=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      'user_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    ]);

    console.log('🚪 [LOGOUT] User logged out');

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ [LOGOUT] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
