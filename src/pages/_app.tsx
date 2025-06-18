import { GoogleAnalytics } from '@next/third-parties/google';
import { NotificationProvider } from '@/contexts/notification_context';
import 'react-toastify/dist/ReactToastify.css';
import { appWithTranslation } from 'next-i18next';
import type { AppProps } from 'next/app';
import React from 'react';
import { UserProvider } from '@/contexts/user_context';
import { GlobalProvider } from '@/contexts/global_context';
import { DashboardProvider } from '@/contexts/dashboard_context';
import { AccountingProvider } from '@/contexts/accounting_context';
import { HiringProvider } from '@/contexts/hiring_context';
import { SessionProvider } from 'next-auth/react';
import { ModalProvider } from '@/contexts/modal_context';
import { CurrencyProvider } from '@/contexts/currency_context';
import '@/styles/globals.css';

function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID || '';
  return (
    <div className="font-barlow selection:bg-text-brand-primary-lv3 selection:text-button-surface-strong-secondary">
      <GoogleAnalytics gaId={gaId} />
      <SessionProvider session={session}>
        <NotificationProvider>
          <UserProvider>
            <DashboardProvider>
              <AccountingProvider>
                <CurrencyProvider>
                  <ModalProvider>
                    <HiringProvider>
                      <GlobalProvider>
                        <Component {...pageProps} />
                      </GlobalProvider>
                    </HiringProvider>
                  </ModalProvider>
                </CurrencyProvider>
              </AccountingProvider>
            </DashboardProvider>
          </UserProvider>
        </NotificationProvider>
      </SessionProvider>
    </div>
  );
}

export default appWithTranslation(App);
