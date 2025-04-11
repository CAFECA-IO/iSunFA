import React from 'react';
import { FaPlus } from 'react-icons/fa6';
import { useTranslation } from 'next-i18next';
import { LandingButton } from '@/components/landing_page_v2/landing_button';

const ExperienceForm: React.FC = () => {
  const { t } = useTranslation(['hiring']);

  return (
    <div className="relative flex flex-col items-stretch gap-10px">
      <LandingButton variant="primary" className="font-bold">
        <FaPlus size={20} /> Education
      </LandingButton>

      <div className="w-90vw overflow-x-auto">
        <div className="h-480px w-2000px bg-gradient-to-r from-lime-300 to-pink-500"></div>
      </div>

      <div className="flex items-center justify-between">
        <LandingButton variant="primary" className="font-bold">
          <FaPlus size={20} /> Work Experience
        </LandingButton>

        <div className="flex items-center gap-lv-6">
          {/* Info: (20250410 - Julian) Back Button */}
          <LandingButton variant="default" className="font-bold">
            {t('common:COMMON.CANCEL')}
          </LandingButton>

          {/* Info: (20250410 - Julian) Next Button */}
          <LandingButton variant="primary" className="font-bold">
            {t('hiring:RESUME_PAGE.NEXT_BTN')}
          </LandingButton>
        </div>
      </div>
    </div>
  );
};

export default ExperienceForm;
