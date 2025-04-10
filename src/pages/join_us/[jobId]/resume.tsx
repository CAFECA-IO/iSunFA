import React from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import ResumePageBody from '@/components/join_us/resume_page_body';

interface IResumePageProps {
  jobId: string;
}

const ResumePage: React.FC<IResumePageProps> = ({ jobId }) => {
  const { t } = useTranslation(['hiring']);

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>iSunFA - {t('hiring:JOIN_US_PAGE.HEAD_TITLE')}</title>
      </Head>

      <ResumePageBody jobId={jobId} />
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ params, locale }) => {
  if (!params || !params.jobId || typeof params.jobId !== 'string') {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      jobId: params.jobId,
      ...(await serverSideTranslations(locale as string, ['landing_page_v2', 'hiring', 'common'])),
    },
  };
};

export default ResumePage;
