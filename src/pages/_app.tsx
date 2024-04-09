import '../styles/globals.css';
import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import React from 'react';
import { UserProvider } from '../contexts/user_context';
import { GlobalProvider } from '../contexts/global_context';

function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <GlobalProvider>
        <Component {...pageProps} />
      </GlobalProvider>
    </UserProvider>
  );
}

export default appWithTranslation(App);
