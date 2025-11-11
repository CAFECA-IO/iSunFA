import Script from 'next/script';
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
  const widgetKey = process.env.ZENDESK_WIDGET_KEY || '';

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

                        {/* Info:(20251111 - Julian) Start of isunfa Zendesk Widget script */}
                        <Script
                          id="ze-snippet"
                          src={`https://static.zdassets.com/ekr/snippet.js?key=${widgetKey}`}
                          strategy="afterInteractive"
                          defer // Info:(20251111 - Julian) Avoid blocking page rendering
                        ></Script>
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
