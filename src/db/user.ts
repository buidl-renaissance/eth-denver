import { v4 as uuidv4 } from 'uuid';
import { eq, count, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from './drizzle';
import { users, UserRole, UserStatus, USER_STATUSES } from './schema';

const BCRYPT_ROUNDS = 10;
const MAX_FAILED_ATTEMPTS = 3;

export { USER_STATUSES };
export type { UserStatus };

export interface User {
  id: string;
  renaissanceId?: string | null; // Renaissance app user ID
  phone?: string | null; // Primary login method
  email?: string | null; // Optional
  username?: string | null;
  name?: string | null; // Display name
  pfpUrl?: string | null; // Profile picture URL
  displayName?: string | null; // App-specific name (editable)
  profilePicture?: string | null; // App-specific profile picture (editable)
  accountAddress?: string | null; // Wallet address
  pinHash?: string | null; // bcrypt hash of 4-digit PIN
  failedPinAttempts: number; // Failed PIN attempts counter (defaults to 0)
  lockedAt?: Date | null; // Timestamp when account was locked
  status?: UserStatus | null; // User status: active, inactive, banned (null treated as active)
  role: UserRole;
  hasPin?: boolean; // Convenience field (derived from pinHash)
  createdAt: Date;
  updatedAt: Date;
}

// Helper to get failedPinAttempts, treating null as 0
function getFailedAttempts(value: number | null | undefined): number {
  return value ?? 0;
}

// Helper to convert db row to User object
function rowToUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    renaissanceId: row.renaissanceId,
    phone: row.phone,
    email: row.email,
    username: row.username,
    name: row.name,
    pfpUrl: row.pfpUrl,
    displayName: row.displayName,
    profilePicture: row.profilePicture,
    accountAddress: row.accountAddress,
    pinHash: row.pinHash,
    failedPinAttempts: getFailedAttempts(row.failedPinAttempts),
    lockedAt: row.lockedAt || null,
    status: row.status as UserStatus | null,
    role: row.role,
    createdAt: row.createdAt || new Date(),
    updatedAt: row.updatedAt || new Date(),
  };
}

// ============================================
// USER LOOKUP FUNCTIONS
// ============================================

export async function getUserById(userId: string): Promise<User | null> {
  const results = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  
  if (results.length === 0) return null;
  return rowToUser(results[0]);
}

export async function getUserByPhone(phone: string): Promise<User | null> {
  const results = await db
    .select()
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);
  
  if (results.length === 0) return null;
  return rowToUser(results[0]);
}

export async function getUserByUsername(username: string): Promise<User | null> {
  // Use case-insensitive comparison for username lookup
  const results = await db
    .select()
    .from(users)
    .where(sql`lower(${users.username}) = lower(${username})`)
    .limit(1);
  
  if (results.length === 0) return null;
  return rowToUser(results[0]);
}

export async function getUserByAccountAddress(accountAddress: string): Promise<User | null> {
  const results = await db
    .select()
    .from(users)
    .where(eq(users.accountAddress, accountAddress))
    .limit(1);
  
  if (results.length === 0) return null;
  return rowToUser(results[0]);
}

export async function getUserByRenaissanceId(renaissanceId: string): Promise<User | null> {
  const results = await db
    .select()
    .from(users)
    .where(eq(users.renaissanceId, renaissanceId))
    .limit(1);
  
  if (results.length === 0) return null;
  return rowToUser(results[0]);
}

// ============================================
// USER CREATION & UPDATE FUNCTIONS
// ============================================

export interface CreateUserWithPhoneData {
  username: string;
  displayName: string;
  phone: string;
  email?: string;
  pin: string; // 4-digit PIN (will be hashed before storage)
  // Optional Renaissance data
  accountAddress?: string;
  renaissanceId?: string;
  pfpUrl?: string;
}

export async function createUserWithPhone(data: CreateUserWithPhoneData): Promise<User> {
  const id = uuidv4();
  const now = new Date();
  
  // Hash the PIN before storing
  const pinHash = await bcrypt.hash(data.pin, BCRYPT_ROUNDS);
  
  // Check if this is the first user - if so, make them admin
  const userCount = await db.select({ count: count() }).from(users);
  const isFirstUser = userCount[0].count === 0;
  
  const role: UserRole = isFirstUser ? 'admin' : 'user';
  
  const newUser = {
    id,
    renaissanceId: data.renaissanceId || null,
    phone: data.phone,
    email: data.email || null,
    username: data.username,
    displayName: data.displayName,
    pfpUrl: data.pfpUrl || null,
    profilePicture: data.pfpUrl || null,
    accountAddress: data.accountAddress || null,
    pinHash,
    failedPinAttempts: 0,
    lockedAt: null,
    status: 'active' as UserStatus,
    role,
    createdAt: now,
    updatedAt: now,
  };
  
  await db.insert(users).values(newUser);
  
  console.log('🆕 [CREATE USER] Created user with phone:', {
    userId: id,
    username: data.username,
    phone: data.phone,
    accountAddress: data.accountAddress,
    role,
  });
  
  return { ...newUser, lockedAt: null } as User;
}

export interface UpdateUserProfileData {
  displayName?: string;
  profilePicture?: string | null;
  phone?: string;
}

export async function updateUserProfile(userId: string, data: UpdateUserProfileData): Promise<User | null> {
  const existing = await getUserById(userId);
  if (!existing) return null;

  const now = new Date();
  const updateData: { displayName?: string; profilePicture?: string | null; phone?: string; updatedAt: Date } = { updatedAt: now };

  if (data.displayName !== undefined) updateData.displayName = data.displayName;
  if (data.profilePicture !== undefined) updateData.profilePicture = data.profilePicture;
  if (data.phone !== undefined) updateData.phone = data.phone;

  await db.update(users).set(updateData).where(eq(users.id, userId));

  return { ...existing, ...updateData } as User;
}

// ============================================
// RENAISSANCE DATA LINKING
// ============================================

export interface RenaissanceUserData {
  renaissanceId?: string;
  username?: string;
  name?: string;
  displayName?: string;
  pfpUrl?: string;
  accountAddress?: string;
  publicAddress?: string;
}

/**
 * Link Renaissance data to an existing user
 */
export async function linkAccountAddressToUser(
  userId: string,
  accountAddress: string,
  userData?: RenaissanceUserData
): Promise<User | null> {
  const existing = await getUserById(userId);
  if (!existing) return null;
  
  const now = new Date();
  const updateData: Record<string, unknown> = { 
    accountAddress,
    updatedAt: now,
  };
  
  if (userData?.renaissanceId) updateData.renaissanceId = userData.renaissanceId;
  if (userData?.username) updateData.username = userData.username;
  if (userData?.name) updateData.name = userData.name;
  if (userData?.pfpUrl) updateData.pfpUrl = userData.pfpUrl;
  
  await db.update(users).set(updateData).where(eq(users.id, userId));
  
  console.log('🔗 [USER] Linked accountAddress to user:', { userId, accountAddress });
  
  return { ...existing, ...updateData } as User;
}

/**
 * Get or create user by Renaissance ID (for context injection auth)
 */
export async function getOrCreateUserByRenaissanceId(
  renaissanceUserId: string,
  userData?: RenaissanceUserData
): Promise<User> {
  // First try to find existing user by renaissanceId
  const existing = await getUserByRenaissanceId(renaissanceUserId);
  
  if (existing) {
    // Update user with any new data
    if (userData) {
      const now = new Date();
      const updateData: Record<string, unknown> = { updatedAt: now };
      
      if (userData.username) updateData.username = userData.username;
      if (userData.displayName) updateData.name = userData.displayName;
      if (userData.pfpUrl) updateData.pfpUrl = userData.pfpUrl;
      if (userData.publicAddress) updateData.accountAddress = userData.publicAddress;
      if (userData.accountAddress) updateData.accountAddress = userData.accountAddress;
      
      await db.update(users).set(updateData).where(eq(users.id, existing.id));
      
      return { ...existing, ...updateData, updatedAt: now } as User;
    }
    return existing;
  }
  
  // Try to find by username if provided
  if (userData?.username) {
    const existingByUsername = await getUserByUsername(userData.username);
    if (existingByUsername) {
      // Link renaissanceId to existing user
      const now = new Date();
      const updateData: Record<string, unknown> = {
        renaissanceId: renaissanceUserId,
        updatedAt: now,
      };
      
      if (userData.displayName) updateData.name = userData.displayName;
      if (userData.pfpUrl) updateData.pfpUrl = userData.pfpUrl;
      if (userData.publicAddress) updateData.accountAddress = userData.publicAddress;
      if (userData.accountAddress) updateData.accountAddress = userData.accountAddress;
      
      await db.update(users).set(updateData).where(eq(users.id, existingByUsername.id));
      
      console.log('🔗 [RENAISSANCE] Linked renaissanceId to existing user:', {
        userId: existingByUsername.id,
        renaissanceUserId,
        username: userData.username,
      });
      
      return { ...existingByUsername, ...updateData, updatedAt: now } as User;
    }
  }
  
  // Create new user
  const userCount = await db.select({ count: count() }).from(users);
  const isFirstUser = userCount[0].count === 0;
  
  const role: UserRole = isFirstUser ? 'admin' : 'user';
  const id = uuidv4();
  const now = new Date();
  
  const newUser = {
    id,
    renaissanceId: renaissanceUserId,
    username: userData?.username || null,
    name: userData?.displayName || null,
    displayName: userData?.displayName || null,
    pfpUrl: userData?.pfpUrl || null,
    profilePicture: userData?.pfpUrl || null,
    accountAddress: userData?.publicAddress || userData?.accountAddress || null,
    status: 'active' as UserStatus,
    role,
    createdAt: now,
    updatedAt: now,
  };
  
  await db.insert(users).values(newUser);
  
  console.log('🆕 [RENAISSANCE] Created new user from context:', {
    userId: id,
    renaissanceUserId,
    username: userData?.username,
    role,
  });
  
  return newUser as User;
}

// ============================================
// PIN SECURITY FUNCTIONS
// ============================================

export function isUserLocked(user: User): boolean {
  return user.lockedAt !== null && user.lockedAt !== undefined;
}

export function hasPin(user: User): boolean {
  return user.pinHash !== null && user.pinHash !== undefined;
}

export async function verifyUserPin(user: User, pin: string): Promise<boolean> {
  if (!user.pinHash) return false;
  return bcrypt.compare(pin, user.pinHash);
}

export async function incrementFailedAttempts(userId: string): Promise<{ user: User; wasLocked: boolean }> {
  const existing = await getUserById(userId);
  if (!existing) throw new Error('User not found');

  const now = new Date();
  const newAttempts = existing.failedPinAttempts + 1;
  const shouldLock = newAttempts >= MAX_FAILED_ATTEMPTS;

  await db.update(users).set({
    failedPinAttempts: newAttempts,
    lockedAt: shouldLock ? now : existing.lockedAt,
    updatedAt: now,
  }).where(eq(users.id, userId));

  return {
    user: { ...existing, failedPinAttempts: newAttempts, lockedAt: shouldLock ? now : existing.lockedAt, updatedAt: now },
    wasLocked: shouldLock,
  };
}

export async function resetFailedAttempts(userId: string): Promise<void> {
  const now = new Date();
  await db.update(users).set({ failedPinAttempts: 0, updatedAt: now }).where(eq(users.id, userId));
}

export async function lockUser(userId: string): Promise<User | null> {
  const existing = await getUserById(userId);
  if (!existing) return null;

  const now = new Date();
  await db.update(users).set({ lockedAt: now, updatedAt: now }).where(eq(users.id, userId));

  return { ...existing, lockedAt: now, updatedAt: now };
}

export async function unlockUser(userId: string): Promise<User | null> {
  const existing = await getUserById(userId);
  if (!existing) return null;

  const now = new Date();
  await db.update(users).set({ lockedAt: null, failedPinAttempts: 0, updatedAt: now }).where(eq(users.id, userId));

  return { ...existing, lockedAt: null, failedPinAttempts: 0, updatedAt: now };
}

export async function setUserPin(userId: string, pin: string): Promise<User | null> {
  const existing = await getUserById(userId);
  if (!existing) return null;

  const now = new Date();
  const pinHash = await bcrypt.hash(pin, BCRYPT_ROUNDS);

  await db.update(users).set({ pinHash, updatedAt: now }).where(eq(users.id, userId));

  return { ...existing, pinHash, updatedAt: now };
}

export async function updateUserPin(userId: string, newPin: string): Promise<User | null> {
  const existing = await getUserById(userId);
  if (!existing) return null;

  const now = new Date();
  const pinHash = await bcrypt.hash(newPin, BCRYPT_ROUNDS);

  await db.update(users).set({ pinHash, failedPinAttempts: 0, updatedAt: now }).where(eq(users.id, userId));

  return { ...existing, pinHash, failedPinAttempts: 0, updatedAt: now };
}

// ============================================
// USER STATUS FUNCTIONS
// ============================================

export async function updateUserStatus(userId: string, status: UserStatus): Promise<User | null> {
  const existing = await getUserById(userId);
  if (!existing) return null;

  const now = new Date();
  await db.update(users).set({ status, updatedAt: now }).where(eq(users.id, userId));

  console.log('🔄 [USER STATUS] Updated user status:', { userId, status });

  return { ...existing, status, updatedAt: now };
}

export function isUserActive(user: User): boolean {
  return user.status === 'active' || user.status === null;
}

export function isUserBanned(user: User): boolean {
  return user.status === 'banned';
}

// ============================================
// ROLE MANAGEMENT
// ============================================

export async function updateUserRole(userId: string, role: UserRole): Promise<User | null> {
  const user = await getUserById(userId);
  if (!user) return null;
  
  const now = new Date();
  await db.update(users).set({ role, updatedAt: now }).where(eq(users.id, userId));
  
  return { ...user, role, updatedAt: now };
}

export async function promoteToOrganizer(userId: string): Promise<User | null> {
  return updateUserRole(userId, 'organizer');
}

export async function promoteToAdmin(userId: string): Promise<User | null> {
  return updateUserRole(userId, 'admin');
}

export async function demoteToUser(userId: string): Promise<User | null> {
  return updateUserRole(userId, 'user');
}

export function canManageUsers(user: User): boolean {
  return user.role === 'admin';
}

export function isOrganizer(user: User): boolean {
  return user.role === 'admin' || user.role === 'organizer';
}

export function isAdmin(user: User): boolean {
  return user.role === 'admin';
}
