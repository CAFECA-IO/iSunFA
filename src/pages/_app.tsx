import '../styles/globals.css';
import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { UserProvider } from '../contexts/user_context';
import { GlobalProvider } from '../contexts/global_context';
import { DashboardProvider } from '../contexts/dashboard_context';
import { AccountingProvider } from '../contexts/accounting_context';
import { COOKIE_NAME } from '../constants/config';

function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // Info: get cookie `COOKIE_NAME.FIDO2` and check if it is empty, if it is empty, redirect to login page (20240425 - Shirley)
    const cookie = document.cookie
      .split(';')
      .find((item: string) => item.includes(COOKIE_NAME.FIDO2));
    if (router.pathname.startsWith('/users/') && !cookie) {
      router.push('/users/login');
    }
  }, [router.pathname]);

  return (
    <div className="font-barlow selection:bg-text-brand-primary-lv3 selection:text-button-surface-strong-secondary">
      <UserProvider>
        <DashboardProvider>
          <AccountingProvider>
            <GlobalProvider>
              <Component {...pageProps} />
            </GlobalProvider>
          </AccountingProvider>
        </DashboardProvider>
      </UserProvider>{' '}
    </div>
  );
}

export default appWithTranslation(App);
