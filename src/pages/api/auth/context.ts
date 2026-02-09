import type { NextApiRequest, NextApiResponse } from 'next';
import { getOrCreateUserByRenaissanceId } from '@/db/user';

/**
 * Authenticate user from Renaissance app context injection
 * POST /api/auth/context
 * Body: { renaissanceUserId, user: { username, displayName, pfpUrl, publicAddress } }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { renaissanceUserId, user: userData } = req.body as {
      renaissanceUserId?: number;
      user?: {
        username?: string;
        displayName?: string;
        pfpUrl?: string;
        publicAddress?: string;
      };
    };

    if (!renaissanceUserId) {
      return res.status(400).json({ error: 'renaissanceUserId is required' });
    }

    console.log('🔐 [AUTH-CONTEXT] Authenticating from context:', {
      renaissanceUserId,
      username: userData?.username,
    });

    // Get or create local user by Renaissance ID
    const user = await getOrCreateUserByRenaissanceId(String(renaissanceUserId), {
      renaissanceId: String(renaissanceUserId),
      username: userData?.username,
      displayName: userData?.displayName,
      pfpUrl: userData?.pfpUrl,
      publicAddress: userData?.publicAddress,
    });

    // Set session cookie using user ID
    res.setHeader('Set-Cookie', `user_session=${user.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);

    console.log('✅ [AUTH-CONTEXT] User authenticated:', {
      userId: user.id,
      renaissanceUserId,
      username: user.username,
    });

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        renaissanceId: user.renaissanceId,
        username: user.username,
        name: user.name,
        displayName: user.displayName,
        pfpUrl: user.pfpUrl,
        profilePicture: user.profilePicture,
        accountAddress: user.accountAddress,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('❌ [AUTH-CONTEXT] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
