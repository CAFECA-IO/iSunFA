import React, { useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { useTranslation } from 'next-i18next';
import { haloStyle, orangeRadioStyle } from '@/constants/display';
import { LandingButton } from '@/components/landing_page_v2/landing_button';
import { ILanguageSkill, Proficiency } from '@/interfaces/skill';
import { useHiringCtx } from '@/contexts/hiring_context';
import { IoClose } from 'react-icons/io5';

interface ILanguageSkillModalProps {
  modalVisibilityHandler: () => void;
  editId: number | null;
}

const LanguageSkillModal: React.FC<ILanguageSkillModalProps> = ({
  modalVisibilityHandler,
  editId,
}) => {
  const { t } = useTranslation(['hiring', 'common']);
  const { tempLanguageList, addLanguageSkill, updateLanguageSkill, removeLanguageSkill } =
    useHiringCtx();

  const inputStyle = `${haloStyle} rounded-full h-60px w-full px-24px placeholder:text-landing-page-gray placeholder:opacity-50 focus:border-surface-brand-primary`;
  const isEditMode = editId !== null;

  const initialData = tempLanguageList.find((lang) => lang.id === editId);

  // Info: (20250506 - Julian) 用於「編輯」的預設值
  const initialLang = initialData ? initialData.language : '';
  const initialProf = initialData ? initialData.proficiency : null;

  const [langInput, setLangInput] = useState<string>(initialLang);
  const [proficiencyInput, setProficiencyInput] = useState<keyof typeof Proficiency | null>(
    initialProf
  );

  const changeLangInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLangInput(e.target.value);
  };

  const saveDisable = langInput === '' || proficiencyInput === null;

  const deleteLangHandler = () => {
    if (isEditMode) {
      removeLanguageSkill(editId);
      modalVisibilityHandler();
    }
  };

  const saveClickHandler = (e: React.FormEvent<HTMLFormElement>) => {
    if (saveDisable) return;

    e.preventDefault();

    if (isEditMode) {
      // Info: (20250506 - Julian) 編輯模式
      const updatedData: ILanguageSkill = {
        id: editId,
        language: langInput,
        proficiency: proficiencyInput as keyof typeof Proficiency,
      };
      updateLanguageSkill(editId, updatedData);
    } else {
      // Info: (20250506 - Julian) 新增模式
      const newId =
        tempLanguageList.length > 0 ? tempLanguageList[tempLanguageList.length - 1].id + 1 : 1;
      const newData: ILanguageSkill = {
        id: newId,
        language: langInput,
        proficiency: proficiencyInput as keyof typeof Proficiency,
      };
      addLanguageSkill(newData);
    }

    // Info: (20250506 - Julian) 提交後關閉 Modal
    modalVisibilityHandler();
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
  const cancelButton = isEditMode ? (
    <LandingButton
      type="button"
      variant="default"
      className="font-bold"
      onClick={deleteLangHandler}
    >
      <FiTrash2 size={20} /> {t('hiring:COMMON.DELETE')}
    </LandingButton>
  ) : (
    <LandingButton
      type="button"
      variant="default"
      className="font-bold"
      onClick={modalVisibilityHandler}
    >
      {t('common:COMMON.CANCEL')}
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
            <IoClose size={24} />
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

export default LanguageSkillModal;
