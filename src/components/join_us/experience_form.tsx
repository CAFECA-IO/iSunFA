import React, { useState } from 'react';
import { FaPlus } from 'react-icons/fa6';
import { useTranslation } from 'next-i18next';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import EducationExperienceModal from '@/components/join_us/education_experience_modal';

interface IExperienceFormProps {
  toNextStep: () => void;
}

const ExperienceForm: React.FC<IExperienceFormProps> = ({ toNextStep }) => {
  const { t } = useTranslation(['hiring']);

  const [isShowEducationModal, setIsShowEducationModal] = useState(false);

  const toggleEducationModal = () => setIsShowEducationModal((prev) => !prev);

  return (
    <div className="relative flex flex-col items-stretch gap-10px">
      <LandingButton variant="primary" className="font-bold" onClick={toggleEducationModal}>
        <FaPlus size={20} /> {t('hiring:EXPERIENCE.EDUCATION_TITLE')}
      </LandingButton>

      <div className="w-90vw overflow-x-auto">
        <div className="h-480px w-2000px bg-gradient-to-r from-lime-300 to-pink-500"></div>
      </div>

      <div className="flex items-center justify-between">
        <LandingButton variant="primary" className="font-bold">
          <FaPlus size={20} /> {t('hiring:EXPERIENCE.WORK_TITLE')}
        </LandingButton>

        <div className="flex items-center gap-lv-6">
          {/* Info: (20250411 - Julian) Back Button */}
          <LandingButton variant="default" className="font-bold">
            {t('common:COMMON.CANCEL')}
          </LandingButton>

          {/* Info: (20250411 - Julian) Next Button */}
          <LandingButton variant="primary" className="font-bold" onClick={toNextStep}>
            {t('hiring:COMMON.NEXT')}
          </LandingButton>
        </div>
      </div>

      {/* Info: (20250411 - Julian) Education Experience Modal */}
      {isShowEducationModal && (
        <EducationExperienceModal modalVisibilityHandler={toggleEducationModal} />
      )}
    </div>
  );
};

export default ExperienceForm;
