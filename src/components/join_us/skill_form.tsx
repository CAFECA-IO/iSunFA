import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FaPlus } from 'react-icons/fa6';
import { FiTrash2 } from 'react-icons/fi';
import { LuPencil } from 'react-icons/lu';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import LanguageModal from '@/components/join_us/language_modal';
import CertificateUploadModal from '@/components/join_us/certificate_upload_modal';
import { ILanguageSkill, LangModalType, Proficiency } from '@/interfaces/skill';

interface ISkillFormProps {
  toPrevStep: () => void;
  toNextStep: () => void;
}

interface ISkillItemProps {
  langData: ILanguageSkill;
  editLangHandler: () => void;
  deleteLangHandler: () => void;
}

const SkillItem: React.FC<ISkillItemProps> = ({ langData, editLangHandler, deleteLangHandler }) => {
  const { t } = useTranslation(['hiring']);

  const { language, proficiency } = langData;

  return (
    <div className="flex justify-between">
      {/* Info: (20250415 - Julian) Detail */}
      <div className="flex flex-col items-start gap-12px">
        <div className="border-b-5px border-surface-brand-primary-moderate font-bold">
          {language}
        </div>
        <p className="text-sm font-normal text-landing-page-gray">
          {t(`hiring:SKILLS.PROF_${proficiency}`)}
        </p>
      </div>

      {/* Info: (20250415 - Julian) Button */}
      <div className="flex items-center gap-4px">
        <LandingButton variant="default" size="square" onClick={deleteLangHandler}>
          <FiTrash2 size={20} />
        </LandingButton>
        <LandingButton variant="default" size="square" onClick={editLangHandler}>
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

  // Info: (20250428 - Julian) Skill state
  const [langSkillList, setLangSkillList] = useState<ILanguageSkill[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [certSkillList, setCertSkillList] = useState<ILanguageSkill[]>([]);
  // Info: (20250428 - Julian) Modal visibility
  const [isShowLangModal, setIsShowLangModal] = useState<boolean>(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isShowCertModal, setIsShowCertModal] = useState<boolean>(false);

  // Info: (20250428 - Julian) Language state
  const [langModalType, setLangModalType] = useState<LangModalType>(LangModalType.CREATE);
  const [editedLangData, setEditedLangData] = useState<ILanguageSkill | undefined>(undefined);

  const toggleLangModal = () => setIsShowLangModal((prev) => !prev);
  const toggleCertModal = () => setIsShowCertModal((prev) => !prev);

  // Info: (20250428 - Julian) 「新增」語言技能
  const createLangHandler = () => {
    setLangModalType(LangModalType.CREATE);
    setEditedLangData(undefined);
    setIsShowLangModal(true);
  };

  // Info: (20250428 - Julian) 「編輯」語言技能
  const editLangHandler = (landData: ILanguageSkill) => {
    setLangModalType(LangModalType.EDIT);
    setEditedLangData(landData);
    setIsShowLangModal(true);
  };

  // Info: (20250428 - Julian) 更新 languageSkillList
  const saveLangHandler = (language: string, proficiency: keyof typeof Proficiency) => {
    if (langModalType === LangModalType.CREATE) {
      // Info: (20250428 - Julian) 「新增」直接加入
      const newId = (langSkillList[langSkillList.length - 1]?.id ?? 0) + 1; // Info: (20250428 - Julian) 新增 id: 找到最後一個 id + 1
      const newData: ILanguageSkill = {
        id: newId,
        language,
        proficiency,
      };

      setLangSkillList((prev) => [...prev, newData]);
    } else {
      // Info: (20250428 - Julian) 「編輯」找出對應的 id，並更新
      setLangSkillList((prev) => {
        const targetIndex = prev.findIndex((lang) => lang.id === editedLangData?.id);
        if (targetIndex === -1) return prev; // Info: (20250428 - Julian) 找不到對應的 id，則不更新

        const newData: ILanguageSkill = {
          id: prev[targetIndex].id,
          language,
          proficiency,
        };
        const updatedList = [...prev];
        updatedList[targetIndex] = newData;
        return updatedList;
      });
    }
    setIsShowLangModal(false);
  };

  // Info: (20250428 - Julian) 刪除語言技能
  const deleteLangHandler = (langId: number) => {
    const targetIndex = langSkillList.findIndex((lang) => lang.id === langId);
    setLangSkillList((prev) => {
      const updatedList = [...prev];
      updatedList.splice(targetIndex, 1);
      return updatedList;
    });
    setIsShowLangModal(false);
  };

  const languageList = langSkillList.map((lang) => (
    <SkillItem
      key={`lang-${lang.id}`}
      langData={lang}
      editLangHandler={() => editLangHandler(lang)}
      deleteLangHandler={() => deleteLangHandler(lang.id)}
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
          <LandingButton variant="primary" className="font-bold" onClick={toggleCertModal}>
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

      {/* Info: (20250428 - Julian) Language Modal */}
      {isShowLangModal && (
        <LanguageModal
          modalVisibilityHandler={toggleLangModal}
          modalType={langModalType}
          langData={editedLangData}
          saveHandler={saveLangHandler}
          deleteHandler={deleteLangHandler}
        />
      )}

      {/* Info: (20250428 - Julian) Certificate Modal */}
      {isShowCertModal && <CertificateUploadModal modalVisibilityHandler={toggleCertModal} />}
    </div>
  );
};

export default SkillForm;
