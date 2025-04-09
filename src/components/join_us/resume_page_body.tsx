import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { TbArrowBack } from 'react-icons/tb';
import LandingNavbar from '@/components/landing_page_v2/landing_navbar';
import {
  LinearGradientText,
  LinearTextSize,
  TextAlign,
} from '@/components/landing_page_v2/linear_gradient_text';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import { ISUNFA_ROUTE } from '@/constants/url';

interface IResumePageBodyProps {
  jobId: string;
}

const ResumePageBody: React.FC<IResumePageBodyProps> = ({ jobId }) => {
  const { t } = useTranslation(['hiring']);

  return (
    <div className="relative flex min-h-screen flex-auto flex-col bg-landing-page-black py-32px font-dm-sans text-landing-page-white">
      {/* Info: (20250409 - Julian) Header */}
      <LandingNavbar />

      <main className="z-10 flex flex-1 flex-col overflow-hidden p-80px">
        {/* Info: (20250409 - Julian) Back Button */}
        <Link href={`${ISUNFA_ROUTE.JOIN_US}/${jobId}`} className="w-fit">
          <LandingButton type="button" variant="default" className="font-bold">
            <TbArrowBack size={28} />
            {t('common:COMMON.BACK')}
          </LandingButton>
        </Link>

        <div className="mt-120px flex flex-col items-center gap-lv-4">
          <p className="text-lg font-semibold text-surface-brand-primary">Welcome</p>
          <LinearGradientText align={TextAlign.CENTER} size={LinearTextSize.XL}>
            How may we know you?
          </LinearGradientText>
        </div>
      </main>
    </div>
  );
};

export default ResumePageBody;
