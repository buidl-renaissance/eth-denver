import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyMessage } from 'ethers';
import {
  getUserByAccountAddress,
  getUserById,
  getOrCreateUserByRenaissanceId,
} from '@/db/user';
import { sessions } from './session';

/**
 * Authenticate a QR code session from mobile app
 *
 * POST /api/auth/qr-authenticate
 * Body: {
 *   token: string,        // The session token from the QR code
 *   publicAddress: string, // The user's wallet address
 *   signature: string,     // Signature of the message "Authenticate session: {token}"
 *   userId?: string,       // Optional: user ID if known
 *   renaissanceId?: string, // Optional: Renaissance app user ID
 *   username?: string,     // Optional: username
 *   displayName?: string,  // Optional: display name
 *   pfpUrl?: string,       // Optional: profile picture URL
 * }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      token,
      publicAddress,
      signature,
      userId,
      renaissanceId,
      username,
      displayName,
      pfpUrl,
    } = req.body;

    console.log('🔐 [QR AUTH] Received authentication request:', {
      token: token ? token.slice(0, 8) + '...' : 'missing',
      publicAddress: publicAddress ? publicAddress.slice(0, 10) + '...' : 'missing',
      hasSignature: !!signature,
      userId,
      renaissanceId,
    });

    // Validate required fields
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Token is required' });
    }

    if (!publicAddress || typeof publicAddress !== 'string') {
      return res.status(400).json({ error: 'Public address is required' });
    }

    if (!signature || typeof signature !== 'string') {
      return res.status(400).json({ error: 'Signature is required' });
    }

    // Check if session exists
    const session = sessions.get(token);
    if (!session) {
      console.log('❌ [QR AUTH] Session not found:', token.slice(0, 8) + '...');
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    // Check if session has expired
    if (session.expiresAt < Date.now()) {
      sessions.delete(token);
      console.log('❌ [QR AUTH] Session expired:', token.slice(0, 8) + '...');
      return res.status(404).json({ error: 'Session expired' });
    }

    // Verify the signature
    const message = `Authenticate session: ${token}`;
    let recoveredAddress: string;

    try {
      recoveredAddress = verifyMessage(message, signature);
    } catch (error) {
      console.error('❌ [QR AUTH] Signature verification failed:', error);
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Normalize addresses for comparison
    const normalizedRecovered = recoveredAddress.toLowerCase();
    const normalizedProvided = publicAddress.toLowerCase();

    if (normalizedRecovered !== normalizedProvided) {
      console.log('❌ [QR AUTH] Address mismatch:', {
        recovered: normalizedRecovered.slice(0, 10) + '...',
        provided: normalizedProvided.slice(0, 10) + '...',
      });
      return res
        .status(401)
        .json({ error: 'Signature does not match provided address' });
    }

    // Look up the user by various methods
    let user = await getUserByAccountAddress(publicAddress);

    // If not found by address and userId provided, try by ID
    if (!user && userId) {
      user = await getUserById(String(userId));
      // Verify the user's account address matches
      if (user && user.accountAddress?.toLowerCase() !== normalizedProvided) {
        console.log('❌ [QR AUTH] User ID does not match public address');
        user = null;
      }
    }

    // If still not found and renaissanceId provided, get or create user
    if (!user && renaissanceId) {
      user = await getOrCreateUserByRenaissanceId(renaissanceId, {
        username,
        displayName,
        pfpUrl,
        publicAddress,
        accountAddress: publicAddress,
      });
    }

    if (!user) {
      console.log(
        '❌ [QR AUTH] User not found for address:',
        publicAddress.slice(0, 10) + '...'
      );
      return res
        .status(404)
        .json({ error: 'User not found. Please register first.' });
    }

    // Update the session with user info
    session.authenticated = true;
    session.userId = user.id;
    session.username = user.username || undefined;
    sessions.set(token, session);

    console.log('✅ [QR AUTH] Session authenticated successfully:', {
      token: token.slice(0, 8) + '...',
      userId: user.id,
      username: user.username,
    });

    return res.status(200).json({
      success: true,
      message: 'Session authenticated successfully',
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error('❌ [QR AUTH] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
