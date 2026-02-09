import type { NextApiRequest, NextApiResponse } from 'next';
import { 
  getUserByPhone, 
  isUserLocked, 
  hasPin, 
  verifyUserPin, 
  incrementFailedAttempts, 
  resetFailedAttempts,
  linkAccountAddressToUser,
} from '@/db/user';

interface PendingUserData {
  renaissanceId?: string;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  accountAddress?: string;
}

/**
 * Login with phone number and PIN
 * 
 * Step 1: POST /api/auth/phone-login with { phone } only
 *   - Returns { requiresPin: true, hasPin: boolean, isLocked: boolean } if user exists
 *   - Returns 404 if user not found (redirect to register)
 * 
 * Step 2: POST /api/auth/phone-login with { phone, pin }
 *   - Verifies PIN and logs in user
 *   - Returns error if PIN is wrong (increments failed attempts)
 *   - Returns locked error if account is locked after 3 failed attempts
 * 
 * If pendingUserData is provided (from Renaissance app), links accountAddress to user
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

    // Normalize phone number (remove spaces, dashes)
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Look up user by phone
    const user = await getUserByPhone(normalizedPhone);
    
    if (!user) {
      return res.status(404).json({ error: 'No account found with this phone number' });
    }

    // Check if account is locked
    if (isUserLocked(user)) {
      return res.status(423).json({ 
        error: 'Account is locked. Please contact an administrator.',
        isLocked: true,
      });
    }

    // Step 1: If no PIN provided, return user status (requires PIN step or set PIN)
    if (!pin) {
      const userHasPin = hasPin(user);
      
      // If user doesn't have a PIN yet, prompt them to set one
      if (!userHasPin) {
        return res.status(200).json({ 
          needsSetPin: true,
          hasPin: false,
          userId: user.id,
          displayName: user.displayName || user.username,
        });
      }

      return res.status(200).json({
        requiresPin: true,
        hasPin: true,
        isLocked: false,
        userId: user.id,
      });
    }

    // Step 2: Verify PIN
    if (!hasPin(user)) {
      // User needs to set PIN first
      return res.status(200).json({ 
        needsSetPin: true,
        hasPin: false,
        userId: user.id,
        displayName: user.displayName || user.username,
      });
    }

    const pinValid = await verifyUserPin(user, pin);

    if (!pinValid) {
      // Increment failed attempts
      const { wasLocked } = await incrementFailedAttempts(user.id);

      if (wasLocked) {
        console.log('🔒 [PHONE LOGIN] Account locked due to failed PIN attempts:', {
          userId: user.id,
          username: user.username,
        });
        return res.status(423).json({ 
          error: 'Account has been locked due to too many failed attempts. Please contact an administrator.',
          isLocked: true,
        });
      }

      const attemptsRemaining = 3 - (user.failedPinAttempts + 1);
      console.log('❌ [PHONE LOGIN] Invalid PIN:', {
        userId: user.id,
        username: user.username,
        attemptsRemaining,
      });

      return res.status(401).json({ 
        error: `Invalid PIN. ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining.`,
        attemptsRemaining,
      });
    }

    // PIN is valid - reset failed attempts and log in
    await resetFailedAttempts(user.id);

    // Link accountAddress if pendingUserData is provided (from Renaissance app)
    let updatedUser = user;
    if (pendingUserData?.accountAddress) {
      console.log('🔗 [PHONE LOGIN] Linking accountAddress to user:', {
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

    // Set session cookie
    res.setHeader('Set-Cookie', `user_session=${user.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);

    console.log('✅ [PHONE LOGIN] User logged in successfully:', {
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
    console.error('Error during phone login:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
