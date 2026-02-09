import styled, { keyframes } from "styled-components";

export const Loading = ({ text }: { text?: string }) => {
  return (
    <LoadingOverlay>
      <VoidSymbol>
        <InnerCircle />
      </VoidSymbol>
      <LoadingText>{text || "Loading..."}</LoadingText>
    </LoadingOverlay>
  );
};

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
`;

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: ${({ theme }) => theme.background};
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const VoidSymbol = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 2px solid ${({ theme }) => theme.accent};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  animation: ${rotate} 8s linear infinite;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    border: 1px solid ${({ theme }) => theme.border};
  }
  
  &::after {
    content: '';
    position: absolute;
    inset: 4px;
    border-radius: 50%;
    border: 1px dashed ${({ theme }) => theme.border};
    animation: ${rotate} 4s linear infinite reverse;
  }
`;

const InnerCircle = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${({ theme }) => theme.accent};
  animation: ${pulse} 2s ease-in-out infinite;
`;

const LoadingText = styled.p`
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 500;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.textMuted};
  letter-spacing: 0.15em;
  text-transform: uppercase;
  animation: ${fadeIn} 0.5s ease-out 0.2s both;
`;

export { LoadingOverlay, VoidSymbol as Spinner, LoadingText };
