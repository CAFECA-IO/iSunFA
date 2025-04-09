import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { TbArrowBack } from 'react-icons/tb';
import LandingNavbar from '@/components/landing_page_v2/landing_navbar';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import { ISUNFA_ROUTE } from '@/constants/url';
import ResumeMainBody from '@/components/join_us/resume_main_body';

interface IResumePageBodyProps {
  jobId: string;
}

const ResumePageBody: React.FC<IResumePageBodyProps> = ({ jobId }) => {
  const { t } = useTranslation(['hiring']);

  return (
    <div className="relative flex min-h-screen flex-auto flex-col bg-landing-page-black py-32px font-dm-sans text-landing-page-white">
      {/* Info: (20250409 - Julian) Header */}
      <LandingNavbar />

      <main className="z-10 flex flex-1 flex-col overflow-y-auto overflow-x-hidden px-80px pt-70px">
        {/* Info: (20250409 - Julian) Back Button */}
        <Link href={`${ISUNFA_ROUTE.JOIN_US}/${jobId}`} className="w-fit">
          <LandingButton type="button" variant="default" className="font-bold">
            <TbArrowBack size={28} />
            {t('common:COMMON.BACK')}
          </LandingButton>
        </Link>

        <ResumeMainBody />
      </main>
    </div>
  );
};

export default ResumePageBody;
