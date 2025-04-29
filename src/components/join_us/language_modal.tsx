import React, { useState } from 'react';
import Image from 'next/image';
import { FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import { haloStyle, orangeRadioStyle } from '@/constants/display';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import { ILanguageSkill, Proficiency, ModalType, ILanguageSkillData } from '@/interfaces/skill';

interface ILanguageModalProps {
  modalVisibilityHandler: () => void;
  modalType: ModalType;
  langData?: ILanguageSkill;
  saveHandler: (data: ILanguageSkillData) => void;
  deleteHandler?: (langId: number) => void;
}

const LanguageModal: React.FC<ILanguageModalProps> = ({
  modalVisibilityHandler,
  modalType,
  langData,
  saveHandler,
  deleteHandler,
}) => {
  const { t } = useTranslation(['hiring', 'common']);
  const inputStyle = `${haloStyle} rounded-full h-60px w-full px-24px placeholder:text-landing-page-gray placeholder:opacity-50 focus:border-surface-brand-primary`;

  // Info: (20250428 - Julian) 「用於編輯」熟練程度的預設值
  const defaultProf = langData?.proficiency
    ? (langData.proficiency as keyof typeof Proficiency)
    : null;

  const [langInput, setLangInput] = useState<string>(langData?.language ?? '');
  const [proficiencyInput, setProficiencyInput] = useState<keyof typeof Proficiency | null>(
    defaultProf
  );

  const changeLangInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLangInput(e.target.value);
  };

  const saveDisable = langInput === '' || proficiencyInput === null;

  const deleteLangHandler = () => {
    if (langData && deleteHandler) {
      deleteHandler(langData.id);
    }
  };

  const saveClickHandler = (e: React.FormEvent<HTMLFormElement>) => {
    if (saveDisable) return;

    e.preventDefault();
    saveHandler({ language: langInput, proficiency: proficiencyInput as keyof typeof Proficiency });
  };

  const proficiencyOptions = Object.keys(Proficiency);

  const proficiencyButtons = proficiencyOptions.map((option) => {
    const changeProficiencyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
      const proficiency = e.target.value as keyof typeof Proficiency;
      setProficiencyInput(proficiency);
    };

    return (
      <div key={option} className="flex items-center gap-lv-2 text-white">
        <input
          type="radio"
          id={option}
          name="proficiency"
          value={option}
          checked={proficiencyInput === option}
          onChange={changeProficiencyInput}
          className={orangeRadioStyle}
          required
        />
        <label htmlFor={option} className="hover:cursor-pointer">
          {t(`hiring:SKILLS.PROF_${option}`)}
        </label>
      </div>
    );
  });

  // Info: (20250428 - Julian) 新增 -> 取消按鈕 / 編輯 -> 刪除按鈕
  const cancelButton =
    modalType === ModalType.CREATE ? (
      <LandingButton
        type="button"
        variant="default"
        className="font-bold"
        onClick={modalVisibilityHandler}
      >
        {t('common:COMMON.CANCEL')}
      </LandingButton>
    ) : (
      <LandingButton
        type="button"
        variant="default"
        className="font-bold"
        onClick={deleteLangHandler}
      >
        <FiTrash2 size={20} /> {t('hiring:COMMON.DELETE')}
      </LandingButton>
    );

  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <form
        onSubmit={saveClickHandler}
        className="relative mx-auto flex w-90vw flex-col items-stretch rounded-lg border border-white bg-landing-nav px-52px py-40px shadow-lg shadow-black/80 backdrop-blur-lg"
      >
        {/* Info: (20250428 - Julian) Modal Title */}
        <div className="flex items-center justify-between">
          <h2 className="text-36px font-bold text-text-brand-primary-lv3">
            {t('hiring:SKILLS.LANGUAGE_MODAL_TITLE')}
          </h2>
          {/* Info: (20250428 - Julian) Close Button */}
          <button type="button" className="p-12px" onClick={modalVisibilityHandler}>
            <Image src="/icons/x_close.svg" width={24} height={24} alt="close_icon" />
          </button>
        </div>
        {/* Info: (20250428 - Julian) Form Content */}
        <div className="mt-40px grid grid-cols-1 gap-y-24px px-150px">
          {/* Info: (20250428 - Julian) Language */}
          <div className="mb-32px flex flex-col gap-6px">
            <p className="ml-27px text-base font-normal">
              {t('hiring:SKILLS.LANGUAGE')}
              <span className="ml-4px text-stroke-state-error">*</span>
            </p>
            <input
              type="text"
              placeholder={t('hiring:SKILLS.LANG_PLACEHOLDER')}
              value={langInput}
              onChange={changeLangInput}
              className={inputStyle}
              required
            />
          </div>
          {/* Info: (20250428 - Julian) Proficiency */}
          <div className="flex items-center justify-between">
            <p className="ml-27px text-base font-normal">
              {t('hiring:SKILLS.LANGUAGE_MODAL_PROF')}
              <span className="ml-4px text-stroke-state-error">*</span>
            </p>
            {proficiencyButtons}
          </div>
        </div>
        {/* Info: (20250428 - Julian) Buttons */}
        <div className="ml-auto mt-40px flex items-center gap-lv-6">
          {cancelButton}
          <LandingButton
            type="submit"
            variant="primary"
            className="font-bold"
            disabled={saveDisable}
          >
            {t('hiring:COMMON.SAVE')}
          </LandingButton>
        </div>
      </form>
    </div>
  );
};

export default LanguageModal;
