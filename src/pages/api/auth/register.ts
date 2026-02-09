import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserByPhone, getUserByUsername, createUserWithPhone } from '@/db/user';

interface PendingUserData {
  renaissanceId?: string;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  accountAddress?: string;
}

/**
 * Register a new user with phone number and PIN
 * POST /api/auth/register
 * Body: { username, name, phone, pin, email?, pendingUserData? }
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
    const { username, name, phone, pin, email, pendingUserData } = req.body as {
      username?: string;
      name?: string;
      phone?: string;
      pin?: string;
      email?: string;
      pendingUserData?: PendingUserData;
    };

    // Validate required fields
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Validate username format: only letters (A-Za-z), numbers (0-9), and underscores, no dashes
    const usernameRegex = /^[A-Za-z0-9_]+$/;
    if (!usernameRegex.test(username.trim())) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, and underscores' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Validate PIN
    if (!pin || !pin.trim()) {
      return res.status(400).json({ error: 'PIN is required' });
    }

    // PIN must be exactly 4 digits
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    }

    // Normalize phone number (remove spaces, dashes)
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');

    // Validate phone format (basic check)
    if (!/^\+?[\d]{10,15}$/.test(normalizedPhone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Check if phone already exists
    const existingPhone = await getUserByPhone(normalizedPhone);
    if (existingPhone) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    // Check if username already exists
    const existingUsername = await getUserByUsername(username.trim());
    if (existingUsername) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Create user with PIN and optional Renaissance data
    const user = await createUserWithPhone({
      username: username.trim(),
      displayName: name.trim(),
      phone: normalizedPhone,
      pin: pin,
      email: email?.trim() || undefined,
      // Link Renaissance data if provided
      accountAddress: pendingUserData?.accountAddress,
      renaissanceId: pendingUserData?.renaissanceId,
      pfpUrl: pendingUserData?.pfpUrl,
    });

    // Set session cookie
    res.setHeader('Set-Cookie', `user_session=${user.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);

    console.log('✅ [REGISTER] User registered successfully:', {
      userId: user.id,
      username: user.username,
      phone: user.phone,
      accountAddress: user.accountAddress,
      role: user.role,
    });

    return res.status(201).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        phone: user.phone,
        email: user.email,
        accountAddress: user.accountAddress,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Error registering user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
