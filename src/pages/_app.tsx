import '../styles/globals.css';
import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { UserProvider } from '../contexts/user_context';
import { GlobalProvider } from '../contexts/global_context';
import { DashboardProvider } from '../contexts/dashboard_context';
import { COOKIE_NAME } from '../constants/config';

function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  useEffect(() => {
    // get cookie `COOKIE_NAME.FIDO2` and check if it is empty without third party library
    // if it is empty, redirect to login page
    const cookie = document.cookie
      .split(';')
      .find((item: string) => item.includes(COOKIE_NAME.FIDO2));
    // eslint-disable-next-line no-console
    console.log('cookie in _app.tsx:', cookie);
    if (router.pathname.startsWith('/users/') && !cookie) {
      router.push('/users/login');
    }
  }, [router.pathname]); // 注意依賴於 pathname

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
