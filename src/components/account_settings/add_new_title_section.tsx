import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { FaChevronDown } from 'react-icons/fa6';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { Button } from '@/components/button/button';
import { AccountTypeBeta } from '@/constants/account';
import { IAccount } from '@/interfaces/accounting_account';
import { TitleFormType } from '@/constants/accounting_setting';

interface IAddNewTitleSectionProps {
  accountTitleList: IAccount[];
  formType: TitleFormType;
  selectedAccountTitle: IAccount | null;
}

const AddNewTitleSection: React.FC<IAddNewTitleSectionProps> = ({
  accountTitleList,
  formType,
  selectedAccountTitle,
}) => {
  const { t } = useTranslation('common');

  const {
    targetRef: categoryRef,
    componentVisible: isCategoryMenuOpen,
    setComponentVisible: setIsCategoryMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const {
    targetRef: subcategoryRef,
    componentVisible: isSubcategoryMenuOpen,
    setComponentVisible: setIsSubcategoryMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241112 - Julian) form content
  const [selectCategory, setSelectCategory] = useState<string>('');
  const [selectSubcategory, setSelectSubcategory] = useState<IAccount | null>(selectedAccountTitle);
  const [titleName, setTitleName] = useState<string>('');
  const [titleCode, setTitleCode] = useState<string>('-');
  const [titleNote, setTitleNote] = useState<string>('');

  const formTitle =
    formType === TitleFormType.add
      ? t('setting:ACCOUNTING_SETTING_MODAL.ADD_NEW_TITLE')
      : t('setting:ACCOUNTING_SETTING_MODAL.EDIT_TITLE');

  const accountTypeList = Object.values(AccountTypeBeta);

  const categoryString =
    selectCategory === '' ? (
      <p className="flex-1 text-input-text-input-placeholder">
        {t('setting:ACCOUNTING_SETTING_MODAL.DROPMENU_PLACEHOLDER')}
      </p>
    ) : (
      <p className="flex-1 text-input-text-input-filled">
        {t(`setting:ACCOUNTING_SETTING_MODAL.ACC_TYPE_${selectCategory.toUpperCase()}`)}
      </p>
    );
  const subcategoryString = !selectSubcategory ? (
    <p className="flex-1 text-input-text-input-placeholder">
      {t('setting:ACCOUNTING_SETTING_MODAL.DROPMENU_PLACEHOLDER')}
    </p>
  ) : (
    <p className="w-200px flex-1 truncate text-input-text-input-filled">
      {selectSubcategory?.code} {selectSubcategory?.name}
    </p>
  );

  const submitDisabled = selectCategory === '' || selectSubcategory === null;

  const toggleCategoryMenu = () => setIsCategoryMenuOpen(!isCategoryMenuOpen);
  const toggleSubcategoryMenu = () => setIsSubcategoryMenuOpen(!isSubcategoryMenuOpen);
  const changeNameHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitleName(e.target.value);
  };
  const changeNoteHandler = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitleNote(e.target.value);
  };

  const clearAllHandler = () => {
    setSelectCategory('');
    setSelectSubcategory(null);
    setTitleName('');
    setTitleCode('');
    setTitleNote('');
  };

  useEffect(() => {
    // Info: (20241112 - Julian) 連動左邊的 <AccountTitleSection />，如果有選擇的會計科目，則將其顯示在表單中
    if (selectedAccountTitle) {
      setSelectCategory(selectedAccountTitle.type);
      setSelectSubcategory(selectedAccountTitle);
      // Info: (20241113 - Julian) 如果是新增，則代碼為空；如果是編輯，則代碼為原本的代碼
      setTitleCode(formType === TitleFormType.add ? '-' : selectedAccountTitle.code);
      // ToDo: (20241113 - Julian) IAcount 的 note 欄位還沒有實作
      //  setTitleNote(selectedAccountTitle.note);
    }
  }, [selectedAccountTitle]);

  useEffect(() => {
    // Info: (20241112 - Julian) 如果重選大分類，且小分類不包含在更新的大分類中，則清空小分類
    const selectSubcategoryType = selectSubcategory?.type;
    const isSubCategoryInclude = selectSubcategoryType?.includes(selectCategory);
    if (!isSubCategoryInclude) {
      setSelectSubcategory(null);
    }
  }, [selectCategory]);

  useEffect(() => {
    // Info: (20241112 - Julian) 如果重選小分類，則清空將大分類指向對應的 type
    const selectSubcategoryType = selectSubcategory?.type;
    if (selectSubcategoryType) {
      setSelectCategory(selectSubcategoryType);
    }
  }, [selectSubcategory]);

  const categoryList = accountTypeList.map((category) => {
    const categoryClickHandler = () => setSelectCategory(category);
    return (
      <div
        key={category}
        onClick={categoryClickHandler}
        className="px-12px py-8px text-sm text-dropdown-text-primary hover:bg-drag-n-drop-surface-hover"
      >
        <p>{t(`setting:ACCOUNTING_SETTING_MODAL.ACC_TYPE_${category.toUpperCase()}`)}</p>
      </div>
    );
  });

  const subcategoryList = accountTitleList
    .filter((title) => !title.code.includes('-'))
    .map((title) => {
      const subcategoryClickHandler = () => setSelectSubcategory(title);
      return (
        <div
          key={title.id}
          onClick={subcategoryClickHandler}
          className="flex items-center gap-4px px-12px py-8px hover:bg-drag-n-drop-surface-hover"
        >
          <p className="text-sm text-dropdown-text-primary">{title.code}</p>
          <p className="text-xs text-dropdown-text-secondary">{title.name}</p>
        </div>
      );
    });

  const displayCategoryMenu = (
    <div
      ref={categoryRef}
      className={`absolute left-0 top-50px z-10 grid w-full rounded-sm ${isCategoryMenuOpen ? 'grid-rows-1 shadow-dropmenu' : 'grid-rows-0'} overflow-hidden transition-all duration-300 ease-in-out`}
    >
      <div className="flex max-h-180px flex-col overflow-y-auto overflow-x-hidden rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px">
        {categoryList}
      </div>
    </div>
  );

  const displaySubcategoryMenu = (
    <div
      ref={subcategoryRef}
      className={`absolute left-0 top-50px z-10 grid w-full rounded-sm ${isSubcategoryMenuOpen ? 'grid-rows-1 shadow-dropmenu' : 'grid-rows-0'} overflow-hidden transition-all duration-300 ease-in-out`}
    >
      <div className="flex max-h-180px flex-col overflow-y-auto overflow-x-hidden rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px">
        {subcategoryList}
      </div>
    </div>
  );

  const submitBtn =
    formType === TitleFormType.add ? (
      // ToDo: (20241113 - Julian) Create API
      <Button type="submit" variant="default" disabled={submitDisabled}>
        {t('setting:ACCOUNTING_SETTING_MODAL.ADD_BTN')}
      </Button>
    ) : (
      // ToDo: (20241113 - Julian) Update API
      <Button type="submit" variant="default" disabled={submitDisabled}>
        {t('setting:ACCOUNTING_SETTING_MODAL.SAVE_BTN')}
      </Button>
    );

  return (
    <form className="flex flex-col gap-24px rounded-sm bg-surface-neutral-surface-lv1 p-24px shadow-Dropshadow_XS">
      {/* Info: (20241112 - Julian) Title */}
      <div className="flex items-center gap-8px">
        <Image src="/icons/add_accounting_title.svg" width={16} height={16} alt="add_icon" />
        <p className="whitespace-nowrap text-sm font-medium text-divider-text-lv-1">{formTitle}</p>
        <hr className="w-fit flex-1 border-divider-stroke-lv-1" />
      </div>

      {/* Info: (20241112 - Julian) Body */}
      <div className="flex max-h-440px flex-1 flex-col gap-24px overflow-x-auto overflow-y-auto">
        {/* Info: (20241112 - Julian) Category Type */}
        <div className="flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t('setting:ACCOUNTING_SETTING_MODAL.CATEGORY_TYPE')}
            <span className="text-text-state-error">*</span>
          </p>
          <div
            onClick={toggleCategoryMenu}
            className="relative flex items-center rounded-sm border border-input-stroke-input px-12px py-10px hover:cursor-pointer"
          >
            {categoryString}
            <div className="text-icon-surface-single-color-primary">
              <FaChevronDown />
            </div>
            {displayCategoryMenu}
          </div>
        </div>
        {/* Info: (20241112 - Julian) Subcategory Type */}
        <div className="flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t('setting:ACCOUNTING_SETTING_MODAL.SUBCATEGORY_TYPE')}
            <span className="text-text-state-error">*</span>
          </p>
          <div
            onClick={toggleSubcategoryMenu}
            className="relative flex items-center rounded-sm border border-input-stroke-input px-12px py-10px hover:cursor-pointer"
          >
            {subcategoryString}
            <div className="text-icon-surface-single-color-primary">
              <FaChevronDown />
            </div>
            {displaySubcategoryMenu}
          </div>
        </div>

        {/* Info: (20241112 - Julian) Divider */}
        <hr className="w-full border-divider-stroke-lv-4" />

        {/* Info: (20241112 - Julian) Title Name */}
        <div className="flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t('setting:ACCOUNTING_SETTING_MODAL.TITLE_NAME')}
          </p>
          <input
            id="add-title-name-input"
            type="text"
            value={titleName}
            onChange={changeNameHandler}
            className="rounded-sm border border-input-stroke-input px-12px py-10px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
            placeholder={t('setting:ACCOUNTING_SETTING_MODAL.TITLE_NAME_PLACEHOLDER')}
          />
        </div>

        {/* Info: (20241112 - Julian) Title Code */}
        <div className="flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t('setting:ACCOUNTING_SETTING_MODAL.TITLE_CODE')}
          </p>
          <input
            id="add-title-code-input"
            type="text"
            value={titleCode}
            placeholder={t('setting:ACCOUNTING_SETTING_MODAL.TITLE_CODE')}
            disabled
            readOnly
            className="rounded-sm border border-input-stroke-input px-12px py-10px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
          />
        </div>

        {/* Info: (20241112 - Julian) Title Note */}
        <div className="flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t('setting:ACCOUNTING_SETTING_MODAL.TITLE_NOTE')}
          </p>
          <textarea
            id="add-title-note-input"
            rows={4}
            value={titleNote}
            onChange={changeNoteHandler}
            className="rounded-sm border border-input-stroke-input px-12px py-10px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
            placeholder={t('setting:ACCOUNTING_SETTING_MODAL.TITLE_NOTE_PLACEHOLDER')}
          />
        </div>
      </div>

      {/* Info: (20241112 - Julian) Buttons */}
      <div className="ml-auto flex items-center gap-12px">
        <Button type="button" variant="secondaryBorderless" onClick={clearAllHandler}>
          {t('setting:ACCOUNTING_SETTING_MODAL.CLEAR_ALL_BTN')}
        </Button>
        {submitBtn}
      </div>
    </form>
  );
};

export default AddNewTitleSection;
