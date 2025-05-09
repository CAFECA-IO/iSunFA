import React from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import VacancyDetailBody from '@/components/join_us/job_detail_body';
import { dummyVacancyList } from '@/interfaces/vacancy';

interface IVacancyDetailPageProps {
  vacancyId: string;
}

const VacancyDetailPage: React.FC<IVacancyDetailPageProps> = ({ vacancyId }) => {
  // Info: (20250407 - Julian) 取得 Data
  const vacancyIdNumber = parseInt(vacancyId, 10);
  const jobData = dummyVacancyList.find((job) => job.id === vacancyIdNumber);

  // Info: (20250407 - Julian) 如果沒有資料，顯示錯誤訊息
  if (!jobData) {
    return (
      <>
        <Head>
          <title>Vacancy not found</title>
        </Head>
        <div className="flex h-screen flex-auto flex-col bg-landing-page-black p-32px font-dm-sans text-4xl text-landing-page-white">
          Vacancy not found
        </div>
      </>
    );
  }

  // Info: (20250507 - Julian) 取得網址
  const domain = process.env.WEB_URL;
  const jobUrl = `${domain}/join_us/${vacancyId}`;

  // Info: (20250507 - Julian) 標題
  const pageTitle = `${jobData.title} - iSunFA`;

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:url" content={jobUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />

        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{pageTitle}</title>
      </Head>

      <VacancyDetailBody jobData={jobData} />
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ params, locale }) => {
  if (!params || !params.vacancyId || typeof params.vacancyId !== 'string') {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      vacancyId: params.vacancyId,
      ...(await serverSideTranslations(locale as string, ['landing_page_v2', 'hiring', 'common'])),
    },
  };
};

export default VacancyDetailPage;
