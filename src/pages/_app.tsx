import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { StyleSheetManager } from "styled-components";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UserProvider } from "@/contexts/UserContext";
import { GlobalStyle } from "@/styles/globalStyles";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <UserProvider>
        <StyleSheetManager shouldForwardProp={(prop) => !prop.startsWith('$')}>
          <GlobalStyle />
          <Component {...pageProps} />
        </StyleSheetManager>
      </UserProvider>
    </ThemeProvider>
  );
}
