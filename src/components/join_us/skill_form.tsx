import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FaPlus } from 'react-icons/fa6';
import { FiTrash2 } from 'react-icons/fi';
import { LuPencil } from 'react-icons/lu';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import LanguageModal from '@/components/join_us/language_modal';
import CertificateUploadModal from '@/components/join_us/certificate_upload_modal';
import {
  ICertificateData,
  ICertificateSkill,
  ILanguageSkill,
  ILanguageSkillData,
  ModalType,
} from '@/interfaces/skill';

interface ISkillFormProps {
  toPrevStep: () => void;
  toNextStep: () => void;
}

interface ISkillItemProps {
  skillData: ILanguageSkill | ICertificateSkill;
  editLangHandler: () => void;
  deleteLangHandler: () => void;
}

const SkillItem: React.FC<ISkillItemProps> = ({
  skillData,
  editLangHandler,
  deleteLangHandler,
}) => {
  const { t } = useTranslation(['hiring']);

  // Info: (20250429 - Julian) 取得語言技能的名稱、熟練程度
  const { language, proficiency } = skillData as ILanguageSkill;
  // Info: (20250429 - Julian) 取得證書技能的名稱、發證機構
  const { name, issuingOrganization } = skillData as ICertificateSkill;

  const title = language || name;
  const subtitle = proficiency ? t(`hiring:SKILLS.PROF_${proficiency}`) : issuingOrganization;

  return (
    <div className="flex justify-between">
      {/* Info: (20250415 - Julian) Detail */}
      <div className="flex flex-col items-start gap-12px">
        <div className="border-b-5px border-surface-brand-primary-moderate font-bold">{title}</div>
        <p className="text-sm font-normal text-landing-page-gray">{subtitle}</p>
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

const SkillForm: React.FC<ISkillFormProps> = ({ toPrevStep, toNextStep }) => {
  const { t } = useTranslation(['hiring']);

  // Info: (20250428 - Julian) Skill state
  const [langSkillList, setLangSkillList] = useState<ILanguageSkill[]>([]);
  const [certSkillList, setCertSkillList] = useState<ICertificateSkill[]>([]);

  // Info: (20250428 - Julian) Modal visibility
  const [isShowLangModal, setIsShowLangModal] = useState<boolean>(false);
  const [isShowCertModal, setIsShowCertModal] = useState<boolean>(false);

  // Info: (20250429 - Julian) Modal Type
  const [langModalType, setLangModalType] = useState<ModalType>(ModalType.CREATE);
  const [certModalType, setCertModalType] = useState<ModalType>(ModalType.CREATE);

  // Info: (20250429 - Julian) Edited Data Placeholder
  const [editedLangData, setEditedLangData] = useState<ILanguageSkill | undefined>(undefined);
  const [editedCertData, setEditedCertData] = useState<ICertificateSkill | undefined>(undefined);

  const toggleLangModal = () => setIsShowLangModal((prev) => !prev);
  const toggleCertModal = () => setIsShowCertModal((prev) => !prev);

  // Info: (20250428 - Julian) 「新增」語言技能
  const createLangHandler = () => {
    setLangModalType(ModalType.CREATE);
    setEditedLangData(undefined);
    setIsShowLangModal(true);
  };

  // Info: (20250428 - Julian) 「編輯」語言技能
  const editLangHandler = (landData: ILanguageSkill) => {
    setLangModalType(ModalType.EDIT);
    setEditedLangData(landData);
    setIsShowLangModal(true);
  };

  // Info: (20250428 - Julian) 更新 languageSkillList
  const saveLangHandler = (data: ILanguageSkillData) => {
    if (langModalType === ModalType.CREATE) {
      // Info: (20250428 - Julian) 「新增」直接加入
      const newId = (langSkillList[langSkillList.length - 1]?.id ?? 0) + 1; // Info: (20250428 - Julian) 新增 id: 找到最後一個 id + 1
      const newData: ILanguageSkill = {
        id: newId,
        language: data.language,
        proficiency: data.proficiency,
      };

      setLangSkillList((prev) => [...prev, newData]);
    } else {
      // Info: (20250428 - Julian) 「編輯」找出對應的 id，並更新
      setLangSkillList((prev) => {
        const targetIndex = prev.findIndex((lang) => lang.id === editedLangData?.id);
        if (targetIndex === -1) return prev; // Info: (20250428 - Julian) 找不到對應的 id，則不更新

        const newData: ILanguageSkill = {
          id: prev[targetIndex].id,
          language: data.language,
          proficiency: data.proficiency,
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

  // Info: (20250429 - Julian) 「新增」證書技能
  const createCertHandler = () => {
    setCertModalType(ModalType.CREATE);
    setEditedCertData(undefined);
    setIsShowCertModal(true);
  };

  // Info: (20250429 - Julian) 「編輯」證書技能
  const editCertHandler = (certData: ICertificateSkill) => {
    setCertModalType(ModalType.EDIT);
    setEditedCertData(certData);
    setIsShowCertModal(true);
  };

  // Info: (20250429 - Julian) 更新 certificateSkillList
  const saveCertHandler = (data: ICertificateData) => {
    if (certModalType === ModalType.CREATE) {
      // Info: (20250429 - Julian) 「新增」直接加入
      const newId = (certSkillList[certSkillList.length - 1]?.id ?? 0) + 1; // Info: (20250429 - Julian) 新增 id: 找到最後一個 id + 1
      const newData: ICertificateSkill = {
        id: newId,
        name: data.name,
        issuingOrganization: data.issuingOrganization,
        issueDate: data.issueDate,
        expirationDate: data.expirationDate,
        certificate: data.certificate,
      };

      setCertSkillList((prev) => [...prev, newData]);
    } else {
      // Info: (20250429 - Julian) 「編輯」找出對應的 id，並更新
      setCertSkillList((prev) => {
        const targetIndex = prev.findIndex((cert) => cert.id === editedCertData?.id);
        if (targetIndex === -1) return prev; // Info: (20250429 - Julian) 找不到對應的 id，則不更新

        const newData: ICertificateSkill = {
          id: prev[targetIndex].id,
          name: data.name,
          issuingOrganization: data.issuingOrganization,
          issueDate: data.issueDate,
          expirationDate: data.expirationDate,
          certificate: data.certificate,
        };
        const updatedList = [...prev];
        updatedList[targetIndex] = newData;
        return updatedList;
      });
    }
    setIsShowCertModal(false);
  };

  // Info: (20250429 - Julian) 刪除證書技能
  const deleteCertHandler = (certId: number) => {
    const targetIndex = certSkillList.findIndex((cert) => cert.id === certId);
    setCertSkillList((prev) => {
      const updatedList = [...prev];
      updatedList.splice(targetIndex, 1);
      return updatedList;
    });
    setIsShowCertModal(false);
  };

  // Info: (20250429 - Julian) 語言技能列表
  const languageList = langSkillList.map((lang) => (
    <SkillItem
      key={`lang-${lang.id}`}
      skillData={lang}
      editLangHandler={() => editLangHandler(lang)}
      deleteLangHandler={() => deleteLangHandler(lang.id)}
    />
  ));

  // Info: (20250429 - Julian) 證書技能列表
  const certificateList = certSkillList.map((cert) => (
    <SkillItem
      key={`cert-${cert.id}`}
      skillData={cert}
      editLangHandler={() => editCertHandler(cert)}
      deleteLangHandler={() => deleteCertHandler(cert.id)}
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
        <LanguageModal
          modalVisibilityHandler={toggleLangModal}
          modalType={langModalType}
          langData={editedLangData}
          saveHandler={saveLangHandler}
          deleteHandler={deleteLangHandler}
        />
      )}

      {/* Info: (20250428 - Julian) Certificate Modal */}
      {isShowCertModal && (
        <CertificateUploadModal
          modalVisibilityHandler={toggleCertModal}
          modalType={certModalType}
          certData={editedCertData}
          saveHandler={saveCertHandler}
          deleteHandler={deleteCertHandler}
        />
      )}
    </div>
  );
};

export default SkillForm;
