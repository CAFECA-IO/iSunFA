import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import { ISUNFA_ROUTE } from '@/constants/url';
import ResumeStepper from '@/components/join_us/resume_stepper';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import PersonalInfoForm from '@/components/join_us/personal_info_form';

const ResumeProcessBody: React.FC = () => {
  const { t } = useTranslation(['hiring', 'common']);
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState<number>(1);

  const backClickHandler = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      router.push(`${ISUNFA_ROUTE.JOIN_US}/${router.query.jobId}`);
    }
  };

  const nextClickHandler = () => {
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  return (
    <div className="flex flex-col items-center gap-90px py-60px">
      <ResumeStepper currentStep={currentStep} />
      <PersonalInfoForm />

      <div className="ml-auto flex items-center gap-lv-6">
        {/* Info: (20250410 - Julian) Back Button */}
        <LandingButton variant="default" className="font-bold" onClick={backClickHandler}>
          {t('common:COMMON.CANCEL')}
        </LandingButton>

        {/* Info: (20250410 - Julian) Next Button */}
        <LandingButton
          type="submit"
          variant="primary"
          className="font-bold"
          onClick={nextClickHandler}
          disabled
        >
          {t('hiring:NEXT')}
        </LandingButton>
      </div>
    </div>
  );
};

export default ResumeProcessBody;
