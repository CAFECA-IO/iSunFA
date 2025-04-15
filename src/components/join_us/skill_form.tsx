import React from 'react';
import { useTranslation } from 'next-i18next';
import { FaPlus } from 'react-icons/fa6';
import { FiTrash2 } from 'react-icons/fi';
import { LuPencil } from 'react-icons/lu';
import { LandingButton } from '@/components/landing_page_v2/landing_button';

interface ISkillFormProps {
  toPrevStep: () => void;
  toNextStep: () => void;
}

const SkillItem: React.FC = () => {
  return (
    <div className="flex justify-between">
      {/* Info: (20250415 - Julian) Detail */}
      <div className="flex flex-col items-start gap-12px">
        <div className="border-b-5px border-surface-brand-primary-moderate font-bold">Chinese</div>
        <p className="text-sm font-normal text-landing-page-gray">
          Native or bilingual proficiency
        </p>
      </div>

      {/* Info: (20250415 - Julian) Button */}
      <div className="flex items-center gap-4px">
        <LandingButton variant="default" size="square">
          <FiTrash2 size={20} />
        </LandingButton>
        <LandingButton variant="default" size="square">
          <LuPencil size={20} />
        </LandingButton>
      </div>
    </div>
  );
};

// ToDo: (20250415 - Julian) During the development
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SkillForm: React.FC<ISkillFormProps> = ({ toPrevStep, toNextStep }) => {
  const { t } = useTranslation(['hiring']);

  const dummyLanguageList = Array.from({ length: 2 }, (_, i) => <SkillItem key={i} />);

  return (
    <div className="flex flex-col">
      <div className="grid w-full grid-cols-2 divide-x divide-landing-page-black2">
        {/* Info: (20250415 - Julian) Language List */}
        <div className="flex min-h-500px min-w-400px flex-col items-center gap-40px px-14px">
          <LandingButton variant="primary" className="font-bold">
            <FaPlus /> {t('hiring:SKILLS.LANGUAGE')}
          </LandingButton>

          <div className="flex w-full flex-col items-stretch gap-lv-6">{dummyLanguageList}</div>
        </div>

        {/* Info: (20250415 - Julian) Certificate List */}
        <div className="flex min-h-500px min-w-400px flex-col items-center gap-40px px-14px">
          <LandingButton variant="primary" className="font-bold">
            <FaPlus /> {t('hiring:SKILLS.CERTIFICATE')}
          </LandingButton>

          <div className="flex w-full flex-col items-stretch gap-lv-6"></div>
        </div>
      </div>

      <div className="ml-auto mt-70px flex items-center gap-lv-6">
        {/* Info: (20250415 - Julian) Back Button */}
        <LandingButton variant="default" className="font-bold" onClick={toPrevStep}>
          {t('hiring:COMMON.PREVIOUS')}
        </LandingButton>

        {/* Info: (20250415 - Julian) Next Button */}
        <LandingButton type="submit" variant="primary" className="font-bold">
          {t('hiring:COMMON.NEXT')}
        </LandingButton>
      </div>
    </div>
  );
};

export default SkillForm;
