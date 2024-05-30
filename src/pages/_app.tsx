/* eslint-disable */
import { NotificationProvider } from '@/contexts/notification_context';
import 'react-toastify/dist/ReactToastify.css';
import { appWithTranslation } from 'next-i18next';
import type { AppContext, AppProps } from 'next/app';
import React, { useEffect } from 'react';
import { UserProvider } from '@/contexts/user_context';
import { GlobalProvider } from '@/contexts/global_context';
import { DashboardProvider } from '@/contexts/dashboard_context';
import { AccountingProvider } from '@/contexts/accounting_context';
import '@/styles/globals.css';
import { ISessionData } from '@/interfaces/session_data';
import { APIName, APIPath } from '@/constants/api_connection';
import { ISUNFA_ROUTE } from '../constants/url';
import APIHandler from '@/lib/utils/api_handler';
import { useRouter } from 'next/router';

function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const {
    data: userSessionData,
    error: getUserSessionError,
    success: getUserSessionSuccess,
    isLoading: isGetUserSessionLoading,
    code: getUserSessionCode,
  } = APIHandler<ISessionData>(APIName.SESSION_GET, {}, false, true);

  console.log('userSessionData in _app', userSessionData);

  useEffect(() => {
    console.log('useEffect in _app', router.pathname);
    if (isGetUserSessionLoading) return;
    // if (!router.pathname.startsWith('/users')) {
    //   return;
    // }

    // if (!router.pathname.includes(ISUNFA_ROUTE.LOGIN)) {
    if (userSessionData) {
      if (
        'user' in userSessionData &&
        userSessionData.user &&
        Object.keys(userSessionData.user).length > 0
      ) {
        // router.push(ISUNFA_ROUTE.SELECT_COMPANY);
      } else {
        router.push(ISUNFA_ROUTE.LOGIN);
      }
    } else {
      router.push(ISUNFA_ROUTE.LOGIN);
    }
    // }
  }, [userSessionData, isGetUserSessionLoading]);

  return (
    <div className="font-barlow selection:bg-text-brand-primary-lv3 selection:text-button-surface-strong-secondary">
      <NotificationProvider>
        <UserProvider>
          <DashboardProvider>
            <AccountingProvider>
              <GlobalProvider>
                <Component {...pageProps} />
              </GlobalProvider>
            </AccountingProvider>
          </DashboardProvider>
        </UserProvider>
      </NotificationProvider>
    </div>
  );
}

// App.getInitialProps = async (appContext: AppContext) => {
//   let userSession: ISessionData | null = null;
//   const domain = `http://localhost:3000`;
//   try {
//     const res = await fetch(`${domain}/${APIPath.SESSION_GET}`, {
//       method: 'GET',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       credentials: 'include', // 確保 cookies 包含在請求中
//     });

//     if (res.ok) {
//       userSession = await res.json();
//       console.log('userSession in AppFile', userSession);
//       console.log('appContext.ctx in AppFile', appContext.ctx);
//     } else {
//       console.error('Failed to fetch user session:', res.statusText);
//     }
//   } catch (error) {
//     console.error('Error fetching user session:', error);
//   }

//   if (
//     appContext.ctx.pathname.startsWith('/users/') &&
//     !appContext.ctx.pathname.includes('/users/login') &&
//     (!userSession || !userSession.user)
//   ) {
//     appContext.ctx.res?.writeHead(302, { Location: `${ISUNFA_ROUTE.LOGIN}` });
//     appContext.ctx.res?.end();
//   }

//   return {
//     userSession,
//   };
// };

// Info: _app 不能用 getServerSideProps ，只能用靜態的 getInitialProps
// export async function getServerSideProps(context: any) {
//   let userSession: ISessionData | null = null;

//   try {
//     const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/session`, {
//       method: 'GET',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       credentials: 'include', // 確保 cookies 包含在請求中
//     });

//     if (res.ok) {
//       userSession = await res.json();
//       console.log('userSession in AppFile in getServerSideProps', userSession);
//       console.log('appContext.ctx in AppFile in getServerSideProps', appContext.ctx);
//     } else {
//       console.error('Failed to fetch user session:', res.statusText);
//     }
//   } catch (error) {
//     console.error('Error fetching user session:', error);
//   }

//   if (
//     context.resolvedUrl.startsWith('/users/') &&
//     context.resolvedUrl !== ISUNFA_ROUTE.LOGIN &&
//     (!userSession || !userSession.user)
//   ) {
//     context.res.writeHead(302, { Location: ISUNFA_ROUTE.LOGIN });
//     context.res.end();
//   }

//   return {
//     props: {
//       userSession,
//     },
//   };
// }

export default appWithTranslation(App);
