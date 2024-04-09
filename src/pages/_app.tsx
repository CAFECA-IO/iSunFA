import '../styles/globals.css';
import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import React from 'react';
import { UserProvider } from '../contexts/user_context';
import { GlobalProvider } from '../contexts/global_context';

function App({ Component, pageProps }: AppProps) {
  return (
    <div className="selection:bg-primaryYellow selection:text-tertiaryBlue">
      <UserProvider>
        <GlobalProvider>
          <Component {...pageProps} />
        </GlobalProvider>
      </UserProvider>{' '}
    </div>
  );
}

export default appWithTranslation(App);
