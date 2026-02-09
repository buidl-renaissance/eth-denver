import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@/db/user';

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  needsPhone: boolean;
  setUser: (user: User | null) => void;
  signOut: () => void;
  refreshUser: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;
  setNeedsPhone: (value: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'renaissance_app_user';

// Type for Renaissance app injected context
interface RenaissanceContext {
  isAuthenticated?: boolean;
  renaissanceUserId?: number;
  fid?: number; // Legacy support
  user?: {
    username?: string;
    displayName?: string;
    pfpUrl?: string;
    publicAddress?: string;
    renaissanceUserId?: number;
    fid?: number;
  };
}

// Extend Window interface for injected context
declare global {
  interface Window {
    RenaissanceContext?: RenaissanceContext;
    renaissanceContext?: RenaissanceContext;
    __RENAISSANCE_CONTEXT__?: RenaissanceContext;
    __renaissanceAuthContext?: RenaissanceContext;
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
    // Function that native app can call to set context
    setRenaissanceContext?: (ctx: RenaissanceContext) => void;
  }
}

// Global callback holder for context injection
let contextCallback: ((ctx: RenaissanceContext) => void) | null = null;

// Set up global function for native app to call
if (typeof window !== 'undefined') {
  window.setRenaissanceContext = (ctx: RenaissanceContext) => {
    console.log('📱 Context set via setRenaissanceContext:', ctx);
    window.RenaissanceContext = ctx;
    if (contextCallback) {
      contextCallback(ctx);
    }
  };
}

// Helper to get Renaissance context from various sources
const getRenaissanceContext = (): RenaissanceContext | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    // Debug: log all potential context locations
    console.log('🔍 Checking for Renaissance context...', {
      RenaissanceContext: typeof window.RenaissanceContext,
      renaissanceContext: typeof window.renaissanceContext,
      __RENAISSANCE_CONTEXT__: typeof window.__RENAISSANCE_CONTEXT__,
      __renaissanceAuthContext: typeof window.__renaissanceAuthContext,
    });
    
    // Check various possible injected context locations
    // Priority: __renaissanceAuthContext (set by MiniAppScreen) > others
    const ctx = window.__renaissanceAuthContext ||
                window.RenaissanceContext || 
                window.renaissanceContext || 
                window.__RENAISSANCE_CONTEXT__;
    
    if (ctx) {
      console.log('📱 Found injected context:', JSON.stringify(ctx));
      const userId = ctx.renaissanceUserId || ctx.user?.renaissanceUserId;
      if (userId) {
        // Don't require isAuthenticated - just having a userId is enough
        return { ...ctx, isAuthenticated: true, renaissanceUserId: userId };
      }
    }
    
    // Check URL parameters as fallback
    const urlParams = new URLSearchParams(window.location.search);
    const renaissanceUserId = urlParams.get('renaissanceUserId');
    if (renaissanceUserId) {
      console.log('📱 Found context in URL params:', renaissanceUserId);
      return {
        isAuthenticated: true,
        renaissanceUserId: parseInt(renaissanceUserId, 10),
        user: {
          username: urlParams.get('username') || undefined,
          displayName: urlParams.get('displayName') || undefined,
          pfpUrl: urlParams.get('pfpUrl') || undefined,
          publicAddress: urlParams.get('publicAddress') || undefined,
        },
      };
    }
    
    console.log('📱 No Renaissance context found');
    return null;
  } catch (err) {
    console.error('Error getting Renaissance context:', err);
    return null;
  }
};

// Helper to get user from localStorage
const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

// Helper to store user in localStorage
const storeUser = (user: User | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch {
    // Storage might be unavailable
  }
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [needsPhone, setNeedsPhone] = useState<boolean>(false);
  const authAttemptedRef = useRef(false);
  const userRef = useRef<User | null>(user);
  
  // Keep userRef in sync with user state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Sync user state to localStorage whenever it changes
  useEffect(() => {
    storeUser(user);
  }, [user]);

  // Sign out function - clears user and session
  const signOut = useCallback(() => {
    console.log('🚪 Signing out user');
    setUser(null);
    storeUser(null);
    setNeedsPhone(false);
    authAttemptedRef.current = false;
    // Clear session cookie by setting expired cookie
    document.cookie = 'user_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }, []);

  // Refresh user function - fetches latest user data from API
  const refreshUser = useCallback(async () => {
    try {
      console.log('🔄 Refreshing user data');
      const response = await fetch('/api/user/me');
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          console.log('✅ User refreshed:', data.user);
          setUser(data.user);
          setNeedsPhone(!data.user.phone);
        }
      }
    } catch (err) {
      console.error('❌ Error refreshing user:', err);
    }
  }, []);

  // Function to update user data locally
  const updateUser = useCallback((updatedUser: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...updatedUser } : null);
  }, []);

  // Authenticate from Renaissance context
  const authenticateFromContext = useCallback(async (ctx: RenaissanceContext): Promise<User | null> => {
    const renaissanceUserId = ctx.renaissanceUserId || ctx.user?.renaissanceUserId;
    if (!renaissanceUserId) {
      console.warn('⚠️ No renaissanceUserId in context');
      return null;
    }

    try {
      console.log('🔐 Authenticating from Renaissance context:', renaissanceUserId);
      
      const response = await fetch('/api/auth/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          renaissanceUserId,
          user: ctx.user,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Context auth failed:', response.status, errorData);
        return null;
      }

      const data = await response.json();
      if (data.success && data.user) {
        console.log('✅ Authenticated from context:', data.user);
        setNeedsPhone(!data.user.phone);
        return data.user;
      }
      return null;
    } catch (err) {
      console.error('❌ Error authenticating from context:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('🔍 Starting user fetch...');
        
        // Get stored user (already set as initial state, so no need to setUser again)
        const storedUser = getStoredUser();
        if (storedUser) {
          console.log('✅ Found stored user:', storedUser.id);
        }
        
        // First, check for Renaissance context injection
        const renaissanceCtx = getRenaissanceContext();
        if (renaissanceCtx && !authAttemptedRef.current) {
          const userId = renaissanceCtx.renaissanceUserId || renaissanceCtx.user?.renaissanceUserId;
          console.log('📱 Renaissance context detected:', userId);
          authAttemptedRef.current = true;
          
          const contextUser = await authenticateFromContext(renaissanceCtx);
          if (contextUser && mounted) {
            console.log('✅ User set from context');
            setUser(contextUser);
            setIsLoading(false);
            return;
          }
        }
        
        // Verify session with server
        console.log('📡 Verifying session with API...');
        const response = await fetch('/api/user/me');
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.user && mounted) {
            console.log('✅ User found from API:', data.user.id);
            setUser(data.user);
            setNeedsPhone(!data.user.phone);
            setIsLoading(false);
            return;
          }
        }
        
        // No session found - clear stale cookie
        console.log('⚠️ No valid session, clearing stale cookie');
        document.cookie = 'user_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
        
        // Try context again - ALWAYS try if we have context and no user
        const retryCtx = getRenaissanceContext();
        if (retryCtx && mounted) {
          console.log('📱 Retrying context auth after session check failed');
          const contextUser = await authenticateFromContext(retryCtx);
          if (contextUser && mounted) {
            setUser(contextUser);
            setIsLoading(false);
            return;
          }
        }
        
        // No user found
        if (mounted) {
          console.log('ℹ️ No authenticated user found');
          if (storedUser) {
            console.log('⚠️ Clearing stale stored user');
            setUser(null);
            storeUser(null);
          }
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error occurred');
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchUser();
    
    // Listen for context being injected after initial load via message
    const handleMessage = async (event: MessageEvent) => {
      try {
        // Handle postMessage from parent or React Native
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        if (data?.type === 'RENAISSANCE_CONTEXT' && data?.context) {
          console.log('📱 Received context via postMessage (RENAISSANCE_CONTEXT)');
          const ctx = data.context as RenaissanceContext;
          const contextUser = await authenticateFromContext(ctx);
          if (contextUser) {
            setUser(contextUser);
          }
        }
        
        // Handle farcaster:context:ready message from Renaissance native app
        if (data?.type === 'farcaster:context:ready' && data?.context) {
          console.log('📱 Received context via postMessage (farcaster:context:ready)');
          // Extract renaissanceUserId from context.user if not at top level
          const ctx: RenaissanceContext = {
            isAuthenticated: data.authenticated || true,
            renaissanceUserId: data.context?.renaissanceUserId || data.context?.user?.renaissanceUserId,
            user: data.context?.user,
          };
          const contextUser = await authenticateFromContext(ctx);
          if (contextUser) {
            setUser(contextUser);
          }
        }
        
        // Also check for direct context data (some apps send the context directly)
        if (data?.renaissanceUserId || data?.user?.renaissanceUserId) {
          console.log('📱 Received direct context via postMessage');
          const ctx = data as RenaissanceContext;
          const contextUser = await authenticateFromContext(ctx);
          if (contextUser) {
            setUser(contextUser);
          }
        }
      } catch {
        // Ignore non-JSON messages
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Also listen on document for React Native WebView messages
    const handleDocMessage = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail?.renaissanceUserId) {
        console.log('📱 Received context via document event');
        authenticateFromContext(customEvent.detail as RenaissanceContext).then(contextUser => {
          if (contextUser) setUser(contextUser);
        });
      }
    };
    document.addEventListener('renaissanceContext', handleDocMessage);
    
    // Listen for farcaster:context:ready CustomEvent from Renaissance native app
    const handleFarcasterContextReady = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail;
      console.log('📱 Received farcaster:context:ready CustomEvent:', detail);
      
      if (detail?.user?.renaissanceUserId || detail?.renaissanceUserId) {
        const ctx: RenaissanceContext = {
          isAuthenticated: true,
          renaissanceUserId: detail.renaissanceUserId || detail.user?.renaissanceUserId,
          user: detail.user,
        };
        const contextUser = await authenticateFromContext(ctx);
        if (contextUser) {
          setUser(contextUser);
        }
      }
    };
    window.addEventListener('farcaster:context:ready', handleFarcasterContextReady);
    
    // Listen for farcaster:context:updated CustomEvent (auth state changes)
    const handleFarcasterContextUpdated = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail;
      console.log('📱 Received farcaster:context:updated CustomEvent:', detail);
      
      const context = detail?.context;
      if (context?.user?.renaissanceUserId || context?.renaissanceUserId) {
        const ctx: RenaissanceContext = {
          isAuthenticated: detail.authenticated || true,
          renaissanceUserId: context.renaissanceUserId || context.user?.renaissanceUserId,
          user: context.user,
        };
        const contextUser = await authenticateFromContext(ctx);
        if (contextUser) {
          setUser(contextUser);
        }
      }
    };
    window.addEventListener('farcaster:context:updated', handleFarcasterContextUpdated);
    
    // Register callback for global setRenaissanceContext function
    contextCallback = async (ctx: RenaissanceContext) => {
      console.log('📱 Context callback triggered');
      const contextUser = await authenticateFromContext(ctx);
      if (contextUser) {
        setUser(contextUser);
      }
    };
    
    // Also check periodically for context injection (some apps inject after DOM load)
    let checkCount = 0;
    const maxChecks = 10;
    const checkInterval = setInterval(async () => {
      checkCount++;
      if (checkCount >= maxChecks || authAttemptedRef.current || userRef.current) {
        clearInterval(checkInterval);
        return;
      }
      
      const ctx = getRenaissanceContext();
      if (ctx && !authAttemptedRef.current) {
        console.log('📱 Context found on check', checkCount);
        authAttemptedRef.current = true;
        clearInterval(checkInterval);
        const contextUser = await authenticateFromContext(ctx);
        if (contextUser) {
          setUser(contextUser);
        }
      }
    }, 500);

    return () => {
      mounted = false;
      window.removeEventListener('message', handleMessage);
      document.removeEventListener('renaissanceContext', handleDocMessage);
      window.removeEventListener('farcaster:context:ready', handleFarcasterContextReady);
      window.removeEventListener('farcaster:context:updated', handleFarcasterContextUpdated);
      contextCallback = null;
      clearInterval(checkInterval);
    };
  }, [authenticateFromContext]);

  return (
    <UserContext.Provider value={{ user, isLoading, error, needsPhone, setUser, signOut, refreshUser, updateUser, setNeedsPhone }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
