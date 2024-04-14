import '../styles/globals.css';
import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import React from 'react';
import { UserProvider } from '../contexts/user_context';
import { GlobalProvider } from '../contexts/global_context';
import { DashboardProvider } from '../contexts/dashboard_context';

function App({ Component, pageProps }: AppProps) {
  return (
    <div className="selection:bg-primaryYellow selection:text-tertiaryBlue">
      <UserProvider>
        <DashboardProvider>
          <GlobalProvider>
            <Component {...pageProps} />
          </GlobalProvider>
        </DashboardProvider>
      </UserProvider>{' '}
    </div>
  );
}

export default appWithTranslation(App);
