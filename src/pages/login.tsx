import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import styled, { keyframes } from 'styled-components';
import { QRCodeSVG } from 'qrcode.react';
import { useUser } from '@/contexts/UserContext';

const pulseGlow = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(123, 92, 255, 0.3);
  }
  50% {
    box-shadow: 0 0 40px rgba(123, 92, 255, 0.5);
  }
`;

const Container = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.background};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  
  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 80%, rgba(123, 92, 255, 0.05) 0%, transparent 40%),
      radial-gradient(circle at 80% 20%, rgba(123, 92, 255, 0.03) 0%, transparent 40%);
    pointer-events: none;
  }
`;

const FormCard = styled.div`
  background: ${({ theme }) => theme.surface};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  padding: 2.5rem;
  max-width: 400px;
  width: 100%;
  position: relative;
  z-index: 1;
  animation: ${pulseGlow} 4s ease-in-out infinite;
`;

const Title = styled.h1`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
  text-align: center;
  margin-bottom: 0.5rem;
  letter-spacing: 1px;
`;

const Subtitle = styled.p`
  font-size: 0.9rem;
  color: ${({ theme }) => theme.textSecondary};
  text-align: center;
  margin-bottom: 2rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.accent};
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const Input = styled.input`
  background: ${({ theme }) => theme.background};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  padding: 0.875rem 1rem;
  font-size: 16px;
  color: ${({ theme }) => theme.text};
  transition: border-color 0.2s, box-shadow 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.accent};
    box-shadow: 0 0 10px ${({ theme }) => theme.accentGlow};
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.textMuted};
  }
`;

const SubmitButton = styled.button<{ $loading?: boolean }>`
  background: ${({ theme, $loading }) => $loading ? theme.border : theme.accent};
  border: none;
  border-radius: 8px;
  padding: 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.background};
  text-transform: uppercase;
  letter-spacing: 2px;
  cursor: ${({ $loading }) => $loading ? 'wait' : 'pointer'};
  transition: all 0.2s;
  margin-top: 0.5rem;
  
  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.accentHover};
    transform: translateY(-2px);
    box-shadow: 0 4px 20px ${({ theme }) => theme.accentGlow};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid ${({ theme }) => theme.danger};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.85rem;
  color: ${({ theme }) => theme.danger};
`;

const LockedMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid ${({ theme }) => theme.danger};
  border-radius: 8px;
  padding: 1.25rem;
  text-align: center;
`;

const LockedTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${({ theme }) => theme.danger};
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const LockedText = styled.p`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.textSecondary};
  margin-bottom: 1rem;
`;

const BackButton = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${({ theme }) => theme.textSecondary};
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: ${({ theme }) => theme.accent};
    color: ${({ theme }) => theme.accent};
  }
`;

const PhoneDisplay = styled.div`
  background: ${({ theme }) => theme.accentMuted};
  border: 1px solid ${({ theme }) => theme.accent}40;
  border-radius: 8px;
  padding: 0.875rem 1rem;
  font-size: 16px;
  color: ${({ theme }) => theme.accent};
  margin-bottom: 0.5rem;
`;

const TabRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const Tab = styled.button<{ $active?: boolean }>`
  flex: 1;
  background: ${({ theme, $active }) => ($active ? theme.accentMuted : 'transparent')};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.accent : theme.border)};
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme, $active }) => ($active ? theme.accent : theme.textSecondary)};
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    border-color: ${({ theme }) => theme.accent};
    color: ${({ theme }) => theme.text};
  }
`;

const QRCodeContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1.25rem;
  background: ${({ theme }) => theme.background};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.border};
  margin-bottom: 1rem;
`;

const StatusText = styled.p<{ $type?: 'error' }>`
  font-size: 0.9rem;
  color: ${({ theme, $type }) => ($type === 'error' ? theme.danger : theme.textSecondary)};
  text-align: center;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const TimerText = styled.span`
  font-size: 0.8rem;
  color: ${({ theme }) => theme.textMuted};
`;

const RefreshButton = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.accent};
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ theme }) => theme.accent};
  cursor: pointer;
  margin-top: 0.5rem;
  transition: all 0.2s;
  &:hover {
    background: ${({ theme }) => theme.accentMuted};
  }
`;

const PulsingDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme }) => theme.accent};
  animation: ${pulseGlow} 1.5s ease-in-out infinite;
`;

const OpenAppLink = styled.a`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.accent};
  margin-top: 0.75rem;
  display: inline-block;
  &:hover {
    text-decoration: underline;
  }
`;

const DesktopOnlySection = styled.div`
  @media (max-width: 767px) {
    display: none;
  }
`;

const MobileSection = styled.div`
  display: none;
  @media (max-width: 767px) {
    display: block;
  }
`;

const OrDivider = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1.5rem 0;
  color: ${({ theme }) => theme.textMuted};
  font-size: 0.85rem;
  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${({ theme }) => theme.border};
  }
`;

const MobileAppButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.accent};
  background: ${({ theme }) => theme.accent};
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    opacity: 0.9;
  }
`;

const SecondaryButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.border};
  background: transparent;
  color: ${({ theme }) => theme.text};
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    border-color: ${({ theme }) => theme.accent};
    color: ${({ theme }) => theme.accent};
  }
`;

const LinksContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.border};
`;

const StyledLink = styled(Link)`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.accent};
  text-decoration: none;
  opacity: 0.8;
  &:hover {
    opacity: 1;
  }
`;

const GuestLink = styled(Link)`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.textMuted};
  text-decoration: none;
  &:hover {
    color: ${({ theme }) => theme.text};
  }
`;

// Format phone number as user types: (XXX) XXX-XXXX or +1 (XXX) XXX-XXXX
const formatPhoneNumber = (value: string): string => {
  // Strip all non-digit characters except leading +
  const hasPlus = value.startsWith('+');
  const digits = value.replace(/\D/g, '');
  
  if (!digits) return hasPlus ? '+' : '';
  
  // Handle +1 or 1 prefix (US country code)
  let formatted = '';
  let digitIndex = 0;
  
  if (hasPlus || digits.startsWith('1')) {
    // International format: +1 (XXX) XXX-XXXX
    if (digits.startsWith('1')) {
      formatted = '+1 ';
      digitIndex = 1;
    } else {
      formatted = '+';
    }
  }
  
  const remaining = digits.slice(digitIndex);
  
  if (remaining.length === 0) return formatted.trim();
  
  // Format remaining digits as (XXX) XXX-XXXX
  if (remaining.length <= 3) {
    formatted += `(${remaining}`;
  } else if (remaining.length <= 6) {
    formatted += `(${remaining.slice(0, 3)}) ${remaining.slice(3)}`;
  } else {
    formatted += `(${remaining.slice(0, 3)}) ${remaining.slice(3, 6)}-${remaining.slice(6, 10)}`;
  }
  
  return formatted;
};

type LoginStep = 'method' | 'phone' | 'pin' | 'setPin' | 'locked';

const APP_AUTH_DEEP_LINK = 'renaissance://authenticate';
const APP_DEEP_LINK = 'renaissance://';

export default function LoginPage() {
  const router = useRouter();
  const { redirect } = router.query;
  const { user, isLoading: userLoading, refreshUser } = useUser();
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>('method');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [userName, setUserName] = useState('');

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 4 characters
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);
  };

  const handleConfirmPinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, max 4 characters
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setConfirmPin(value);
  };

  // Get the redirect URL or default to dashboard
  const redirectUrl = typeof redirect === 'string' ? redirect : '/';

  useEffect(() => {
    if (!userLoading && user) {
      window.location.href = redirectUrl;
    }
  }, [user, userLoading, redirectUrl]);

  // Get pending user data from localStorage (set by Renaissance app auth)
  const getPendingUserData = () => {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem('renaissance_pending_user_data');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  };

  // Clear pending user data after successful auth
  const clearPendingUserData = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('renaissance_pending_user_data');
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Normalize phone number
    const normalized = phone.replace(/[\s\-\(\)]/g, '');
    setNormalizedPhone(normalized);

    try {
      const pendingUserData = getPendingUserData();
      const res = await fetch('/api/auth/phone-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized, pendingUserData }),
        credentials: 'include',
      });

      const data = await res.json();

      if (res.status === 404) {
        // Phone not found - redirect to register with phone pre-filled
        const registerUrl = `/register?phone=${encodeURIComponent(normalized)}&redirect=${encodeURIComponent(redirectUrl)}`;
        router.push(registerUrl);
        return;
      }

      if (res.status === 423) {
        // Account is locked
        setStep('locked');
        setLoading(false);
        return;
      }

      if (data.needsSetPin) {
        // User doesn't have a PIN - prompt them to set one
        setUserName(data.displayName || '');
        setStep('setPin');
        setLoading(false);
        return;
      }

      if (data.requiresPin) {
        // Move to PIN step
        setStep('pin');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Store user in localStorage so UserContext picks it up on redirect
      if (data.user) {
        localStorage.setItem('renaissance_app_user', JSON.stringify(data.user));
      }

      // Success - use hard redirect to ensure fresh UserContext state
      window.location.href = redirectUrl;
    } catch (err) {
      console.error('Login error:', err);
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const pendingUserData = getPendingUserData();
      const res = await fetch('/api/auth/phone-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone, pin, pendingUserData }),
        credentials: 'include',
      });

      const data = await res.json();

      if (res.status === 423) {
        // Account is locked
        setStep('locked');
        setLoading(false);
        return;
      }

      if (res.status === 401) {
        // Invalid PIN
        setError(data.error || 'Invalid PIN');
        setPin('');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Clear pending data and store user
      clearPendingUserData();
      if (data.user) {
        localStorage.setItem('renaissance_app_user', JSON.stringify(data.user));
      }

      // Success - use hard redirect to ensure fresh UserContext state
      window.location.href = redirectUrl;
    } catch (err) {
      console.error('Login error:', err);
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleSetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setLoading(true);

    try {
      const pendingUserData = getPendingUserData();
      const res = await fetch('/api/auth/set-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizedPhone, pin, pendingUserData }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to set PIN');
        setLoading(false);
        return;
      }

      // Clear pending data and store user
      clearPendingUserData();
      if (data.user) {
        localStorage.setItem('renaissance_app_user', JSON.stringify(data.user));
      }

      // Success - use hard redirect to ensure fresh UserContext state
      window.location.href = redirectUrl;
    } catch (err) {
      console.error('Set PIN error:', err);
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setPin('');
    setConfirmPin('');
    setError('');
  };

  const handleBackToMethod = () => {
    setStep('method');
    setPin('');
    setConfirmPin('');
    setError('');
    if (!sessionToken) createSession();
  };

  // Create session for QR login (generates token for QR payload)
  const createSession = useCallback(async () => {
    setIsCreatingSession(true);
    setQrError(null);
    try {
      const response = await fetch('/api/auth/session', { method: 'POST', credentials: 'include' });
      const data = await response.json();
      if (!response.ok) {
        setQrError(data.error || 'Failed to create session');
        return;
      }
      if (!data.token || typeof data.token !== 'string') {
        setQrError('Session did not return a token');
        return;
      }
      const expiresAt = typeof data.expiresAt === 'number' ? data.expiresAt : Date.now() + 5 * 60 * 1000;
      setSessionToken(data.token);
      setSessionExpiresAt(expiresAt);
    } catch (err) {
      console.error('Error creating session:', err);
      setQrError('Failed to create login session');
    } finally {
      setIsCreatingSession(false);
    }
  }, []);

  // Create session when on method step
  useEffect(() => {
    if (step === 'method' && !sessionToken && !isCreatingSession && !userLoading && !user) {
      createSession();
    }
  }, [step, sessionToken, isCreatingSession, createSession, userLoading, user]);

  // Poll for session authentication
  useEffect(() => {
    if (!sessionToken || user || step !== 'method') return;
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/auth/session?token=${sessionToken}`, {
          credentials: 'include',
        });
        const data = await response.json();
        if (data.authenticated) {
          await refreshUser();
          setSessionToken(null);
          setSessionExpiresAt(null);
          window.location.href = redirectUrl;
        } else if (data.expired) {
          setSessionToken(null);
          setSessionExpiresAt(null);
          createSession();
        }
      } catch (err) {
        console.error('Error polling session:', err);
      }
    }, 2000);
    return () => clearInterval(pollInterval);
  }, [sessionToken, user, step, refreshUser, redirectUrl, createSession]);

  // QR session timer
  useEffect(() => {
    if (!sessionExpiresAt) {
      setTimeRemaining(0);
      return;
    }
    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.floor((sessionExpiresAt - Date.now()) / 1000)
      );
      setTimeRemaining(remaining);
      if (remaining === 0 && sessionToken) {
        setSessionToken(null);
        setSessionExpiresAt(null);
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [sessionExpiresAt, sessionToken]);

  // URL format so device camera opens app; app POSTs to callbackUrl for auth (same as People)
  const getQRCodeData = () => {
    if (!sessionToken) return '';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const callbackUrl = `${baseUrl}/api/auth/qr-authenticate`;
    return `renaissance://authenticate?token=${encodeURIComponent(sessionToken)}&callbackUrl=${encodeURIComponent(callbackUrl)}&appName=${encodeURIComponent('App')}`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOpenApp = () => {
    if (sessionToken) {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const callbackUrl = `${baseUrl}/api/auth/qr-authenticate`;
      window.location.href = `${APP_AUTH_DEEP_LINK}?token=${encodeURIComponent(sessionToken)}&callbackUrl=${encodeURIComponent(callbackUrl)}&appName=${encodeURIComponent('App')}`;
    } else {
      window.location.href = APP_DEEP_LINK;
    }
  };

  if (userLoading) return null;

  // Method step (default): QR + Use Phone Number
  if (step === 'method') {
    return (
      <>
        <Head>
          <title>Sign In</title>
          <meta name="description" content="Sign in to your account" />
        </Head>
        <Container>
          <FormCard>
            <Title>Sign In</Title>
            <DesktopOnlySection>
              <Subtitle>Scan this QR code with the Renaissance app to sign in</Subtitle>
              {isCreatingSession ? (
                <StatusText>Creating session...</StatusText>
              ) : qrError ? (
                <>
                  <StatusText $type="error">{qrError}</StatusText>
                  <RefreshButton onClick={createSession} type="button">Try Again</RefreshButton>
                </>
              ) : sessionToken ? (
                <div style={{ textAlign: 'center' }}>
                  <QRCodeContainer>
                    <QRCodeSVG value={getQRCodeData()} size={200} level="M" includeMargin={false} />
                  </QRCodeContainer>
                  <StatusText>
                    <PulsingDot />
                    Waiting for authentication...
                  </StatusText>
                  {timeRemaining > 0 && (
                    <TimerText>Expires in {formatTime(timeRemaining)}</TimerText>
                  )}
                  {timeRemaining === 0 && (
                    <RefreshButton onClick={createSession} type="button">Refresh QR Code</RefreshButton>
                  )}
                  <OpenAppLink href="#" onClick={(e) => { e.preventDefault(); handleOpenApp(); }}>
                    Open Renaissance app instead
                  </OpenAppLink>
                </div>
              ) : null}
            </DesktopOnlySection>
            <MobileSection>
              <Subtitle>Open the Renaissance app to sign in to your account</Subtitle>
              <MobileAppButton onClick={handleOpenApp} type="button">Open Renaissance App</MobileAppButton>
              <OrDivider>or</OrDivider>
              {sessionToken ? (
                <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                  <StatusText style={{ marginBottom: '0.5rem' }}>Show this QR code to another device</StatusText>
                  <QRCodeContainer>
                    <QRCodeSVG value={getQRCodeData()} size={160} level="M" includeMargin={false} />
                  </QRCodeContainer>
                  <StatusText><PulsingDot /> Waiting...</StatusText>
                </div>
              ) : null}
            </MobileSection>
            <OrDivider>or sign in with phone</OrDivider>
            <SecondaryButton type="button" onClick={() => setStep('phone')}>Use Phone Number</SecondaryButton>
            <LinksContainer>
              <StyledLink href={`/register?redirect=${encodeURIComponent(redirectUrl)}`}>
                Create a new account
              </StyledLink>
              <GuestLink href="/dashboard">Continue as guest</GuestLink>
            </LinksContainer>
          </FormCard>
        </Container>
      </>
    );
  }

  // Locked account view
  if (step === 'locked') {
    return (
      <>
        <Head>
          <title>Account Locked</title>
          <meta name="description" content="Account locked" />
        </Head>
        <Container>
          <FormCard>
            <Title>Account Locked</Title>
            <LockedMessage>
              <LockedTitle>Too Many Failed Attempts</LockedTitle>
              <LockedText>
                Your account has been locked for security reasons. Please contact an administrator to unlock your account.
              </LockedText>
              <BackButton onClick={handleBackToMethod}>
                Try Different Method
              </BackButton>
            </LockedMessage>
          </FormCard>
        </Container>
      </>
    );
  }

  // Set PIN step (for users without a PIN)
  if (step === 'setPin') {
    return (
      <>
        <Head>
          <title>Set PIN</title>
          <meta name="description" content="Set your PIN to secure your account" />
        </Head>
        <Container>
          <FormCard>
            <Title>Set Your PIN</Title>
            <Subtitle>
              {userName ? `Welcome back, ${userName}! ` : ''}
              Create a 4-digit PIN to secure your account
            </Subtitle>
            
            <Form onSubmit={handleSetPinSubmit}>
              {error && <ErrorMessage>{error}</ErrorMessage>}
              
              <FormGroup>
                <Label>Phone Number</Label>
                <PhoneDisplay>{phone}</PhoneDisplay>
                <BackButton type="button" onClick={handleBack}>
                  Change Number
                </BackButton>
              </FormGroup>
              
              <FormGroup>
                <Label>Create PIN</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={pin}
                  onChange={handlePinChange}
                  placeholder="0000"
                  required
                  maxLength={4}
                  autoComplete="off"
                  autoFocus
                />
              </FormGroup>

              <FormGroup>
                <Label>Confirm PIN</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={handleConfirmPinChange}
                  placeholder="0000"
                  required
                  maxLength={4}
                  autoComplete="off"
                />
              </FormGroup>
              
              <SubmitButton 
                type="submit" 
                disabled={loading || pin.length !== 4 || confirmPin.length !== 4} 
                $loading={loading}
              >
                {loading ? 'Setting PIN...' : 'Set PIN & Sign In'}
              </SubmitButton>
            </Form>
          </FormCard>
        </Container>
      </>
    );
  }

  // PIN entry step
  if (step === 'pin') {
    return (
      <>
        <Head>
          <title>Enter PIN</title>
          <meta name="description" content="Enter your PIN to sign in" />
        </Head>
        <Container>
          <FormCard>
            <Title>Enter PIN</Title>
            <Subtitle>Enter your 4-digit PIN to continue</Subtitle>
            
            <Form onSubmit={handlePinSubmit}>
              {error && <ErrorMessage>{error}</ErrorMessage>}
              
              <FormGroup>
                <Label>Phone Number</Label>
                <PhoneDisplay>{phone}</PhoneDisplay>
                <BackButton type="button" onClick={handleBack}>
                  Change Number
                </BackButton>
              </FormGroup>
              
              <FormGroup>
                <Label>PIN</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={pin}
                  onChange={handlePinChange}
                  placeholder="0000"
                  required
                  maxLength={4}
                  autoComplete="off"
                  autoFocus
                />
              </FormGroup>
              
              <SubmitButton type="submit" disabled={loading || pin.length !== 4} $loading={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </SubmitButton>
            </Form>
          </FormCard>
        </Container>
      </>
    );
  }

  // Phone entry step
  return (
    <>
      <Head>
        <title>Sign In</title>
        <meta name="description" content="Sign in to your account" />
      </Head>
      <Container>
        <FormCard>
          <Title>Sign In</Title>
          <Subtitle>Enter your phone number to continue</Subtitle>
          <Form onSubmit={handlePhoneSubmit}>
            {error && <ErrorMessage>{error}</ErrorMessage>}
            <FormGroup>
              <Label>Phone Number</Label>
              <Input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="+1 (555) 123-4567"
                required
                autoComplete="tel"
                autoFocus
              />
            </FormGroup>
            <SubmitButton type="submit" disabled={loading} $loading={loading}>
              {loading ? 'Checking...' : 'Continue'}
            </SubmitButton>
            <SecondaryButton type="button" onClick={handleBackToMethod} style={{ marginTop: '1rem' }}>
              Back to sign-in options
            </SecondaryButton>
          </Form>
        </FormCard>
      </Container>
    </>
  );
}
