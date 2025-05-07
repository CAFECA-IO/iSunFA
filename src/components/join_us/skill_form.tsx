import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FaPlus } from 'react-icons/fa6';
import { FiTrash2 } from 'react-icons/fi';
import { LuPencil } from 'react-icons/lu';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import LanguageSkillModal from '@/components/join_us/language_skill_modal';
import CertificateUploadModal from '@/components/join_us/certificate_upload_modal';
import { ICertificateSkill, ILanguageSkill } from '@/interfaces/skill';
import { useHiringCtx } from '@/contexts/hiring_context';

interface ISkillFormProps {
  toPrevStep: () => void;
  toNextStep: () => void;
}

interface ISkillItemProps {
  skillData: ILanguageSkill | ICertificateSkill;
  editLangHandler: () => void;
}

const SkillItem: React.FC<ISkillItemProps> = ({ skillData, editLangHandler }) => {
  const { t } = useTranslation(['hiring']);
  const { removeLanguageSkill, removeCertificateSkill } = useHiringCtx();

  // Info: (20250429 - Julian) 取得語言技能的名稱、熟練程度
  const { language, proficiency } = skillData as ILanguageSkill;
  // Info: (20250429 - Julian) 取得證書技能的名稱、發證機構
  const { name, issuingOrganization } = skillData as ICertificateSkill;

  const isLang = !!language; // Info: (20250506 - Julian) 判斷是否為語言技能

  const title = language || name;
  const subtitle = isLang ? t(`hiring:SKILLS.PROF_${proficiency}`) : issuingOrganization;

  const removeSkillHandler = () => {
    if (isLang) {
      removeLanguageSkill(skillData.id);
    } else {
      removeCertificateSkill(skillData.id);
    }
  };

  return (
    <div className="flex justify-between">
      {/* Info: (20250415 - Julian) Detail */}
      <div className="flex flex-col items-start gap-12px">
        <div className="border-b-5px border-surface-brand-primary-moderate font-bold">{title}</div>
        <p className="text-sm font-normal text-landing-page-gray">{subtitle}</p>
      </div>

      {/* Info: (20250415 - Julian) Button */}
      <div className="flex items-center gap-4px">
        <LandingButton variant="default" size="square" onClick={removeSkillHandler}>
          <FiTrash2 size={20} />
        </LandingButton>
        <LandingButton variant="default" size="square" onClick={editLangHandler}>
          <LuPencil size={20} />
        </LandingButton>
      </div>
    </div>
  );
};

const SkillForm: React.FC<ISkillFormProps> = ({ toPrevStep, toNextStep }) => {
  const { t } = useTranslation(['hiring']);

  const { tempLanguageList, tempCertificateList } = useHiringCtx();

  // Info: (20250428 - Julian) Modal visibility
  const [isShowLangModal, setIsShowLangModal] = useState<boolean>(false);
  const [isShowCertModal, setIsShowCertModal] = useState<boolean>(false);

  // Info: (20250429 - Julian) Edited data id
  const [editLangId, setEditLangId] = useState<number | null>(null);
  const [editCertId, setEditCertId] = useState<number | null>(null);

  // Info: (20250506 - Julian) Modal visibility handler
  const toggleLangModal = () => setIsShowLangModal((prev) => !prev);
  const toggleCertModal = () => setIsShowCertModal((prev) => !prev);

  // Info: (20250506 - Julian) 「新增」語言技能
  const createLangHandler = () => {
    setEditLangId(null);
    setIsShowLangModal(true);
  };

  // Info: (20250506 - Julian) 「編輯」語言技能
  const editLangHandler = (id: number) => {
    setEditLangId(id);
    setIsShowLangModal(true);
  };

  // Info: (20250506 - Julian) 「新增」證書技能
  const createCertHandler = () => {
    setEditCertId(null);
    setIsShowCertModal(true);
  };

  // Info: (20250429 - Julian) 「編輯」證書技能
  const editCertHandler = (id: number) => {
    setEditCertId(id);
    setIsShowCertModal(true);
  };

  // Info: (20250429 - Julian) 語言技能列表
  const languageList = tempLanguageList.map((lang) => (
    <SkillItem
      key={`lang-${lang.id}`}
      skillData={lang}
      editLangHandler={() => editLangHandler(lang.id)}
    />
  ));

  // Info: (20250429 - Julian) 證書技能列表
  const certificateList = tempCertificateList.map((cert) => (
    <SkillItem
      key={`cert-${cert.id}`}
      skillData={cert}
      editLangHandler={() => editCertHandler(cert.id)}
    />
  ));

  return (
    <div className="flex flex-col">
      <div className="grid w-full grid-cols-2 divide-x divide-landing-page-black2">
        {/* Info: (20250415 - Julian) Language List */}
        <div className="flex min-h-500px min-w-400px flex-col items-center gap-40px px-14px">
          <LandingButton variant="primary" className="font-bold" onClick={createLangHandler}>
            <FaPlus /> {t('hiring:SKILLS.LANGUAGE')}
          </LandingButton>

          <div className="flex w-full flex-col items-stretch gap-lv-6">{languageList}</div>
        </div>

        {/* Info: (20250415 - Julian) Certificate List */}
        <div className="flex min-h-500px min-w-400px flex-col items-center gap-40px px-14px">
          <LandingButton variant="primary" className="font-bold" onClick={createCertHandler}>
            <FaPlus /> {t('hiring:SKILLS.CERTIFICATE')}
          </LandingButton>

          <div className="flex w-full flex-col items-stretch gap-lv-6">{certificateList}</div>
        </div>
      </div>

      <div className="ml-auto mt-70px flex items-center gap-lv-6">
        {/* Info: (20250415 - Julian) Back Button */}
        <LandingButton variant="default" className="font-bold" onClick={toPrevStep}>
          {t('hiring:COMMON.PREVIOUS')}
        </LandingButton>

        {/* Info: (20250415 - Julian) Next Button */}
        <LandingButton type="submit" variant="primary" className="font-bold" onClick={toNextStep}>
          {t('hiring:COMMON.NEXT')}
        </LandingButton>
      </div>

      {/* Info: (20250428 - Julian) Language Modal */}
      {isShowLangModal && (
        <LanguageSkillModal modalVisibilityHandler={toggleLangModal} editId={editLangId} />
      )}

      {/* Info: (20250428 - Julian) Certificate Modal */}
      {isShowCertModal && (
        <CertificateUploadModal modalVisibilityHandler={toggleCertModal} editId={editCertId} />
      )}
    </div>
  );
};

export default SkillForm;
