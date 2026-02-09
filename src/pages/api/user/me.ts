import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserById, getUserByRenaissanceId } from '@/db/user';
import { UserRole } from '@/db/schema';

type ResponseData = {
  user: {
    id: string;
    renaissanceId: string | null;
    username: string | null;
    name: string | null;
    displayName: string | null;
    pfpUrl: string | null;
    profilePicture: string | null;
    accountAddress: string | null;
    phone: string | null;
    role: UserRole;
  } | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ user: null });
  }

  try {
    let user: Awaited<ReturnType<typeof getUserById>> = null;
    let source: string | null = null;

    // Try to get from URL query parameter (renaissanceUserId)
    if (!user && req.query.renaissanceUserId && typeof req.query.renaissanceUserId === 'string') {
      console.log('Attempting to get user from renaissanceUserId param:', req.query.renaissanceUserId);
      user = await getUserByRenaissanceId(req.query.renaissanceUserId);
      source = user ? 'renaissance_id_param' : null;
    }

    // Try to get from URL query parameter (userId)
    if (!user && req.query.userId && typeof req.query.userId === 'string') {
      console.log('Attempting to get user from userId param:', req.query.userId);
      user = await getUserById(req.query.userId);
      source = user ? 'user_id_param' : null;
    }

    // If still not available, try to get from session cookie
    if (!user) {
      const cookies = req.headers.cookie || '';
      const sessionMatch = cookies.match(/user_session=([^;]+)/);
      
      if (sessionMatch && sessionMatch[1]) {
        const sessionValue = sessionMatch[1];
        console.log('Attempting to get user from cookie:', sessionValue);
        user = await getUserById(sessionValue);
        source = user ? 'cookie' : null;
      }
    }

    if (user) {
      console.log(`✅ User found via ${source}:`, { id: user.id, renaissanceId: user.renaissanceId, username: user.username });
    } else {
      console.log('❌ No user found in /api/user/me, clearing cookie');
      // Clear invalid session cookie
      res.setHeader('Set-Cookie', [
        'user_session=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'user_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      ]);
    }

    if (!user) {
      return res.status(200).json({ user: null });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        renaissanceId: user.renaissanceId ?? null,
        username: user.username ?? null,
        name: user.name ?? null,
        displayName: user.displayName ?? null,
        pfpUrl: user.pfpUrl ?? null,
        profilePicture: user.profilePicture ?? null,
        accountAddress: user.accountAddress ?? null,
        phone: user.phone ?? null,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ user: null });
  }
}
