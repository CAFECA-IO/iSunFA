import React from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import JobDetailBody from '@/components/join_us/job_detail_body';
import { dummyJobList } from '@/interfaces/job';

interface IJobDetailPageProps {
  jobId: string;
}

const JobDetailPage: React.FC<IJobDetailPageProps> = ({ jobId }) => {
  // Info: (20250407 - Julian) 取得 Data
  const jobIdNumber = parseInt(jobId, 10);
  const jobData = dummyJobList.find((job) => job.id === jobIdNumber);

  // Info: (20250407 - Julian) 如果沒有資料，顯示錯誤訊息
  if (!jobData) {
    return (
      <>
        <Head>
          <title>Job not found</title>
        </Head>
        <div className="flex h-screen flex-auto flex-col bg-landing-page-black p-32px font-dm-sans text-4xl text-landing-page-white">
          Job not found
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon/favicon.ico" />
        <title>{jobData.title}</title>
      </Head>

      <JobDetailBody jobData={jobData} />
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

export default JobDetailPage;
