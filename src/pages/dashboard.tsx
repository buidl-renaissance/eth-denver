import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import styled, { keyframes } from "styled-components";
import { useRouter } from "next/router";
import { useUser } from "@/contexts/UserContext";
import { Loading } from "@/components/Loading";

// App configuration - customize these
const APP_NAME = "App Block";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.background};
`;

const Main = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  background: ${({ theme }) => theme.surface};
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ProfileImageContainer = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid ${({ theme }) => theme.accent};
  background: ${({ theme }) => theme.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const ProfileImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const DefaultAvatar = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${({ theme }) => theme.accent};
`;

const UserName = styled.span`
  font-size: 0.9rem;
  font-weight: 500;
  color: ${({ theme }) => theme.text};
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const LogoutButton = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: ${({ theme }) => theme.textMuted};
  cursor: pointer;
  transition: all 0.15s ease;
  
  &:hover {
    color: ${({ theme }) => theme.text};
    border-color: ${({ theme }) => theme.textMuted};
    background: ${({ theme }) => theme.backgroundAlt};
  }
`;

const HeaderSpacer = styled.div`
  height: 60px;
`;

const ContentArea = styled.div`
  flex: 1;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  padding: 2rem 1rem;
  animation: ${fadeIn} 0.4s ease-out;
`;

const WelcomeCard = styled.div`
  background: ${({ theme }) => theme.surface};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  margin-bottom: 2rem;
`;

const WelcomeTitle = styled.h1`
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
  margin: 0 0 0.5rem;
`;

const WelcomeSubtitle = styled.p`
  font-size: 0.95rem;
  color: ${({ theme }) => theme.textMuted};
  margin: 0;
`;

const Section = styled.section`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
`;

const QuickLinks = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const QuickLinkCard = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.25rem;
  background: ${({ theme }) => theme.surface};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.15s ease;
  
  &:hover {
    border-color: ${({ theme }) => theme.accent};
    background: ${({ theme }) => theme.surfaceHover};
    transform: translateY(-2px);
  }
`;

const LinkTitle = styled.span`
  font-weight: 600;
  color: ${({ theme }) => theme.text};
`;

const LinkDescription = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.textMuted};
`;

const InfoBox = styled.div`
  background: ${({ theme }) => theme.backgroundAlt};
  border: 1px dashed ${({ theme }) => theme.border};
  border-radius: 8px;
  padding: 1.5rem;
  margin-top: 2rem;
`;

const InfoTitle = styled.h3`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text};
  margin: 0 0 0.75rem;
`;

const InfoText = styled.p`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.textMuted};
  margin: 0;
  line-height: 1.6;
  
  code {
    background: ${({ theme }) => theme.surface};
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    font-size: 0.8rem;
    color: ${({ theme }) => theme.accent};
  }
`;

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const { user, isLoading: isUserLoading, signOut } = useUser();
  const [imageError, setImageError] = useState(false);

  // Redirect to /app if not authenticated
  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/app');
    }
  }, [isUserLoading, user, router]);

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  // Loading state
  if (isUserLoading && !user) {
    return <Loading text="Loading..." />;
  }

  if (!isUserLoading && !user) {
    return null;
  }

  if (!user) {
    return null;
  }

  const displayName = user.username || user.displayName || `User`;
  const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  
  // Hide sign out for Renaissance-authenticated users (they manage auth in the parent app)
  const isRenaissanceUser = !!user.renaissanceId;

  return (
    <Container>
      <Head>
        <title>Dashboard | {APP_NAME}</title>
        <meta name="description" content={`${APP_NAME} Dashboard`} />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <Main>
        <Header>
          <UserSection>
            <ProfileImageContainer>
              {user.pfpUrl && !imageError ? (
                <ProfileImage
                  src={user.pfpUrl}
                  alt={displayName}
                  onError={() => setImageError(true)}
                />
              ) : (
                <DefaultAvatar>{initials}</DefaultAvatar>
              )}
            </ProfileImageContainer>
            <UserName>{displayName}</UserName>
          </UserSection>
          <HeaderRight>
            {!isRenaissanceUser && (
              <LogoutButton onClick={handleLogout}>
                Sign Out
              </LogoutButton>
            )}
          </HeaderRight>
        </Header>

        <HeaderSpacer />
        
        <ContentArea>
          <WelcomeCard>
            <WelcomeTitle>Welcome, {displayName}!</WelcomeTitle>
            <WelcomeSubtitle>
              You&apos;re signed in to {APP_NAME}. This is your dashboard.
            </WelcomeSubtitle>
          </WelcomeCard>

          <InfoBox>
            <InfoTitle>🚀 Getting Started</InfoTitle>
            <InfoText>
              This is a template dashboard. Customize it by editing{' '}
              <code>src/pages/dashboard.tsx</code>. Add your app&apos;s main features,
              navigation, and content here. The authentication flow is already
              set up - users who aren&apos;t signed in will be redirected to the
              app entry page.
            </InfoText>
          </InfoBox>
        </ContentArea>
      </Main>
    </Container>
  );
};

export default DashboardPage;
