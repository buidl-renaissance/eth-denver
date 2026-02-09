import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserByPhone, hasPin, setUserPin, linkAccountAddressToUser } from '@/db/user';

interface PendingUserData {
  renaissanceId?: string;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  accountAddress?: string;
}

/**
 * Set PIN for a user who doesn't have one yet
 * POST /api/auth/set-pin
 * Body: { phone, pin, pendingUserData? }
 * 
 * This is used during login flow for users who don't have a PIN set.
 * After setting PIN, the user is logged in.
 * If pendingUserData is provided, links accountAddress to user.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phone, pin, pendingUserData } = req.body as { 
      phone?: string; 
      pin?: string;
      pendingUserData?: PendingUserData;
    };

    // Validate required fields
    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    if (!pin || !pin.trim()) {
      return res.status(400).json({ error: 'PIN is required' });
    }

    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    }

    // Normalize phone number (remove spaces, dashes)
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Look up user by phone
    const user = await getUserByPhone(normalizedPhone);
    
    if (!user) {
      return res.status(404).json({ error: 'No account found with this phone number' });
    }

    // Check if user already has a PIN
    if (hasPin(user)) {
      return res.status(400).json({ 
        error: 'This account already has a PIN. Use the login flow instead.',
        hasPin: true,
      });
    }

    // Set the PIN
    let updatedUser = await setUserPin(user.id, pin);

    if (!updatedUser) {
      return res.status(500).json({ error: 'Failed to set PIN' });
    }

    // Link accountAddress if pendingUserData is provided (from Renaissance app)
    if (pendingUserData?.accountAddress) {
      console.log('🔗 [SET PIN] Linking accountAddress to user:', {
        userId: user.id,
        accountAddress: pendingUserData.accountAddress,
      });
      const linked = await linkAccountAddressToUser(user.id, pendingUserData.accountAddress, {
        renaissanceId: pendingUserData.renaissanceId,
        username: pendingUserData.username,
        name: pendingUserData.displayName,
        pfpUrl: pendingUserData.pfpUrl,
        accountAddress: pendingUserData.accountAddress,
      });
      if (linked) {
        updatedUser = linked;
      }
    }

    // Set session cookie to log them in
    res.setHeader('Set-Cookie', `user_session=${user.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);

    console.log('✅ [SET PIN] PIN set and user logged in:', {
      userId: updatedUser.id,
      username: updatedUser.username,
      phone: updatedUser.phone,
      accountAddress: updatedUser.accountAddress,
    });

    return res.status(200).json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        phone: updatedUser.phone,
        email: updatedUser.email,
        renaissanceId: updatedUser.renaissanceId,
        pfpUrl: updatedUser.pfpUrl,
        accountAddress: updatedUser.accountAddress,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error('Error setting PIN:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
