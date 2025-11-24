import React from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
// import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import AAASharePageBody from '@/components/ai_accounting_assistance/share_page_body';

interface IAAASharePageProps {
  sessionId: string;
}

const AAASharePage: React.FC<IAAASharePageProps> = ({ sessionId }) => {
  const pageTitle = `iSunFA - Chat Title`;

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta content={pageTitle} property="og:title" />
        <meta content="" property="og:description" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>iSunFA - {pageTitle}</title>
      </Head>

      <AAASharePageBody sessionId={sessionId} />
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ params, locale }) => {
  if (!params || !params.sessionId || typeof params.sessionId !== 'string') {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      sessionId: params.sessionId,
      ...(await serverSideTranslations(locale as string, ['common'])),
    },
  };
};

export default AAASharePage;
