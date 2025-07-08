import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import VacancyDetailBody from '@/components/join_us/job_detail_body';
import { IVacancyDetail } from '@/interfaces/vacancy';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';
import LandingNavbar from '@/components/landing_page_v2/landing_navbar';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_v2/linear_gradient_text';

interface IVacancyDetailPageProps {
  vacancyId: string;
}

const NotFound: React.FC = () => {
  return (
    <main className="z-10 flex h-full flex-col items-center justify-center gap-10px px-20px">
      <LinearGradientText size={LinearTextSize.XL} align={TextAlign.CENTER}>
        Job Posting is not available.
      </LinearGradientText>
      <p className="text-sm lg:text-xl">
        The job posting you are looking for does not exist or has been closed. Please check the
        other job postings on our website.
      </p>
    </main>
  );
};

const VacancyDetailPage: React.FC<IVacancyDetailPageProps> = ({ vacancyId }) => {
  const [jobData, setJobData] = useState<IVacancyDetail | undefined>(undefined);

  const { trigger } = APIHandler<IVacancyDetail>(APIName.GET_VACANCY_BY_ID);

  useEffect(() => {
    const fetchJobData = async () => {
      try {
        const { data, success, error } = await trigger({ params: { vacancyId } });

        if (success && data) {
          setJobData(data);
        } else {
          // Deprecated: (20250708 - Luphia) remove eslint-disable
          // eslint-disable-next-line no-console
          console.error('Failed to fetch job data: ', error);
        }
      } catch (err) {
        // Deprecated: (20250708 - Luphia) remove eslint-disable
        // eslint-disable-next-line no-console
        console.error('Error fetching job data:', err);
      }
    };

    fetchJobData();
  }, []);

  // Info: (20250407 - Julian) 如果沒有資料，顯示錯誤訊息
  if (!jobData) {
    return (
      <>
        <Head>
          <title>Vacancy not found</title>
        </Head>
        <div className="flex h-screen flex-auto flex-col bg-landing-page-black p-32px font-dm-sans text-landing-page-white">
          {/* Info: (20250707 - Julian) Background */}
          <div className="absolute inset-x-0 -top-24 flex h-screen w-full bg-job-detail bg-cover bg-top bg-no-repeat lg:top-0 lg:bg-contain"></div>

          {/* Info: (20250707 - Julian) Header */}
          <LandingNavbar />
          {/* Info: (20250707 - Julian) Not Found Message */}
          <NotFound />
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
