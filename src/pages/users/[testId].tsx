// Deprecated: (20241130 - Luphia) Remove test page before version release
import Head from 'next/head';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { ILocale } from '@/interfaces/locale';

const TestMe = () => {
  const router = useRouter();
  const { testId } = router.query;

  const [currentTestId, setCurrentTestId] = useState<string | string[] | null>(null);

  useEffect(() => {
    if (router.isReady) {
      // Deprecated: (20241129 - Liz)
      // eslint-disable-next-line no-console
      console.log('Router Query:', router.query); // Info: (20241129 - Liz) 確認是否有取得 testId
      // Deprecated: (20241129 - Liz)
      // eslint-disable-next-line no-console
      console.log('testId:', testId); // Info: (20241129 - Liz) 確認 testId 是否為 undefined
      if (testId !== undefined) {
        setCurrentTestId(testId);
      }
    }
  }, [router.isReady, testId]);

  if (!currentTestId) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>Test - iSunFA</title>
        <meta
          name="description"
          content="iSunFA: Blockchain AI Forensic Accounting and Auditing is where simplicity meets accuracy in the realm of financial investigations."
        />
        <meta name="author" content="CAFECA" />
        <meta name="keywords" content="區塊鏈,人工智慧,會計" />
        <meta property="og:title" content="iSunFA" />
        <meta
          property="og:description"
          content="iSunFA: Blockchain AI Forensic Accounting and Auditing is where simplicity meets accuracy in the realm of financial investigations."
        />
      </Head>
      <div>TestMe, testId: {currentTestId}</div>;
    </>
  );
};

export const getServerSideProps = async ({ locale }: ILocale) => {
  return {
    props: {
      ...(await serverSideTranslations(locale as string, ['layout'])),
    },
  };
};
export default TestMe;
