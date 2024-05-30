/* eslint-disable */
import Head from 'next/head';
import { useEffect } from 'react';
import { useGlobalCtx } from '@/contexts/global_context';
import SelectCompanyPageBody from '@/components/select_company_page_body/select_company_page_body';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ToastId } from '@/constants/toast_id';
import NavBar from '@/components/nav_bar/nav_bar';
import { ILocale } from '@/interfaces/locale';
import { getSession } from '@/lib/utils/get_session';

const SelectCompanyPage = () => {
  const { eliminateToast } = useGlobalCtx();

  useEffect(() => {
    // Info: (20240513 - Julian) 回到選擇公司頁面時，要把提醒試用版的 Toast 關掉
    eliminateToast(ToastId.TRIAL);
  }, []);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        {/* TODO: i18n (20240409 - Shirley) */}
        <title>Select Company - iSunFA</title>
        <meta
          name="description"
          content="iSunFA: BOLT AI Forensic Accounting and Auditing is where simplicity meets accuracy in the realm of financial investigations."
        />
        <meta name="author" content="CAFECA" />
        <meta name="keywords" content="區塊鏈,人工智慧,會計" />

        <meta property="og:title" content="iSunFA" />
        <meta
          property="og:description"
          content="iSunFA: BOLT AI Forensic Accounting and Auditing is where simplicity meets accuracy in the realm of financial investigations."
        />
      </Head>

      <div className="h-screen bg-white">
        <div className="">
          <NavBar />
        </div>
        <div className="bg-surface-neutral-main-background pt-16">
          <SelectCompanyPageBody />
        </div>
      </div>
    </>
  );
};

export const getServerSideProps = async ({ req, res, locale }: any) => {
  const session = await getSession(req, res);

  // Ensure no undefined values in the session object
  // if (session && session.cookie && session.cookie.domain === undefined) {
  //   session.cookie.domain = null;
  // }

  console.log('session in select-company serverSide', session);

  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
      // session,
    },
  };
};

export default SelectCompanyPage;
