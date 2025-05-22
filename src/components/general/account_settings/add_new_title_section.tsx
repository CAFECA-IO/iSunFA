import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { FaChevronDown } from 'react-icons/fa6';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { useUserCtx } from '@/contexts/user_context';
import { useModalContext } from '@/contexts/modal_context';
import { Button } from '@/components/button/button';
import { AccountTypeBeta } from '@/constants/account';
import { IAccount, IPaginatedAccount } from '@/interfaces/accounting_account';
import { TitleFormType } from '@/constants/accounting_setting';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { FREE_ACCOUNT_BOOK_ID } from '@/constants/config';
import { ToastType } from '@/interfaces/toastify';
import { ToastId } from '@/constants/toast_id';
import { FiBookOpen } from 'react-icons/fi';

interface IAddNewTitleSectionProps {
  formType: TitleFormType;
  selectedAccountTitle: IAccount | null;
  isRecallApi: boolean;
  setIsRecallApi: React.Dispatch<React.SetStateAction<boolean>>;
  clearSearchWord: () => void;
}

const AddNewTitleSection: React.FC<IAddNewTitleSectionProps> = ({
  formType,
  selectedAccountTitle,
  isRecallApi,
  setIsRecallApi,
  clearSearchWord,
}) => {
  const { t, i18n } = useTranslation(['common', 'reports']);
  const { toastHandler } = useModalContext();
  const { connectedAccountBook } = useUserCtx();

  const accountBookId = connectedAccountBook?.id ?? FREE_ACCOUNT_BOOK_ID;
  const queryCondition = {
    limit: 9999, // Info: (20250212 - Julian) 全部取出
    forUser: true,
    sortBy: 'code', // Info: (20250212 - Julian) 依 code 排序
    sortOrder: 'asc',
    isDeleted: false, // Info: (20250212 - Julian) 只取未刪除的
  };

  // Info: (20241121 - Julian) 會計科目 input ref
  const accountInputRef = useRef<HTMLInputElement>(null);

  // Info: (20241112 - Julian) 新增會計科目的 API
  const {
    trigger: createNewAccount,
    isLoading: isCreating,
    success: createSuccess,
    error: createError,
  } = APIHandler(APIName.CREATE_NEW_SUB_ACCOUNT);

  // Info: (20241112 - Julian) 更新會計科目的 API
  const {
    trigger: updateNewAccount,
    isLoading: isUpdating,
    success: updateSuccess,
    error: updateError,
  } = APIHandler<IPaginatedAccount>(APIName.UPDATE_ACCOUNT_INFO_BY_ID);

  // Info: (20250212 - Julian) 取得會計科目列表的 API
  const { trigger: getAccountList, data: accountTitleList } = APIHandler<IPaginatedAccount>(
    APIName.ACCOUNT_LIST,
    { params: { accountBookId }, query: queryCondition },
    false,
    true
  );

  // Info: (20250212 - Julian) 會計科目列表
  const accountList = accountTitleList?.data ?? [];

  // Info: (20250521 - Julian) 如果翻譯名稱不存在，則使用原本的名稱
  const getTranslatedName = (name: string) => {
    const nameKey = `reports:ACCOUNTING_ACCOUNT.${name}`;
    return i18n.exists(nameKey) ? t(nameKey) : name;
  };

  // Info: (20250212 - Julian) Category 輸入狀態
  const {
    targetRef: categoryRef,
    componentVisible: isCategoryMenuOpen,
    setComponentVisible: setIsCategoryMenuOpen,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241213 - Julian) Account 編輯狀態
  const {
    targetRef: subcategoryRef,
    componentVisible: isAccountEditing,
    setComponentVisible: setIsAccountEditing,
  } = useOuterClick<HTMLDivElement>(false);

  // Info: (20241112 - Julian) form content
  const [selectCategory, setSelectCategory] = useState<string>('');
  const [selectSubcategory, setSelectSubcategory] = useState<IAccount | null>(selectedAccountTitle);
  const [titleName, setTitleName] = useState<string>('');
  const [titleCode, setTitleCode] = useState<string>('-');
  const [titleNote, setTitleNote] = useState<string>('');
  // Info: (20241213 - Julian) 會計科目搜尋
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [filteredAccountList, setFilteredAccountList] = useState<IAccount[]>([]);

  const formTitle =
    formType === TitleFormType.ADD
      ? t('settings:ACCOUNTING_SETTING_MODAL.ADD_NEW_TITLE')
      : t('settings:ACCOUNTING_SETTING_MODAL.EDIT_TITLE');

  // Info: (20250212 - Julian) 大類別
  const accountTypeList = Object.values(AccountTypeBeta);

  const categoryString =
    selectCategory === '' ? (
      <p className="flex-1 text-input-text-input-placeholder">
        {t('settings:ACCOUNTING_SETTING_MODAL.DROPMENU_PLACEHOLDER')}
      </p>
    ) : (
      <p className="flex-1 text-input-text-input-filled">
        {t(`settings:ACCOUNTING_SETTING_MODAL.ACC_TYPE_${selectCategory.toUpperCase()}`)}
      </p>
    );
  const subcategoryString = selectSubcategory
    ? `${selectSubcategory?.code} ${getTranslatedName(selectSubcategory?.name)}`
    : t('settings:ACCOUNTING_SETTING_MODAL.DROPMENU_PLACEHOLDER');

  const submitDisabled = selectCategory === '' || selectSubcategory === null;

  const toggleCategoryMenu = () => setIsCategoryMenuOpen(!isCategoryMenuOpen);
  const toggleSubcategoryMenu = () => setIsAccountEditing(!isAccountEditing);
  const changeNameHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitleName(e.target.value);
  };
  const changeNoteHandler = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitleNote(e.target.value);
  };

  // Info: (20250212 - Julian) 清空所有欄位
  const clearAllHandler = () => {
    clearSearchWord();
    setSelectCategory('');
    setSelectSubcategory(null);
    setTitleName('');
    setTitleCode('-');
    setTitleNote('');
  };

  // Info: (20241213 - Julian) 會計科目搜尋
  const accountSearchHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
    setIsAccountEditing(true);
  };

  // Info: (20250212 - Julian) 從 API 取得會計科目列表
  useEffect(() => {
    getAccountList({ params: { accountBookId }, query: queryCondition });
    setFilteredAccountList(accountList);
  }, []);

  useEffect(() => {
    // Info: (20250212 - Julian) 過濾會計科目列表
    const filteredList = accountList
      .filter((title) => title.type === selectCategory) // Info: (20250212 - Julian) 依照 selectCategory 過濾
      .filter((title) => {
        const isNameMatch = title.name.includes(searchKeyword); // Info: (20250212 - Julian) 名稱包含關鍵字
        const isCodeMatch = title.code.startsWith(searchKeyword); // Info: (20250212 - Julian) 代碼開頭是關鍵字
        return isNameMatch || isCodeMatch;
      });
    setFilteredAccountList(filteredList);

    if (selectSubcategory?.type !== selectCategory) {
      setSelectSubcategory(null); // Info: (20250212 - Julian) selectCategory 重置時，清空 selectSubcategory
    }
  }, [selectCategory, searchKeyword]);

  // Info: (20250212 - Julian) categoryList 重新渲染時，將 dropdown (id = accounting-category-menu) 捲動至最上方
  useEffect(() => {
    const categoryMenu = document.getElementById('accounting-category-menu');
    if (categoryMenu) {
      categoryMenu.scrollTop = 0;
    }
  }, [isCategoryMenuOpen]);

  // Info: (20250212 - Julian) subcategoryList 重新渲染時，將 dropdown (id = accounting-subcategory-menu) 捲動至最上方
  useEffect(() => {
    const subcategoryMenu = document.getElementById('accounting-subcategory-menu');
    if (subcategoryMenu) {
      subcategoryMenu.scrollTop = 0;
    }
  }, [isAccountEditing]);

  useEffect(() => {
    if (!isCreating) {
      if (createSuccess) {
        // Info: (20241112 - Julian) 顯示新增成功訊息，重新呼叫 API，並清空表單
        toastHandler({
          id: ToastId.ACCOUNTING_CREATE_SUCCESS,
          type: ToastType.SUCCESS,
          content: t('settings:ACCOUNTING_SETTING_MODAL.TOAST_ACCOUNT_TITLE_CREATE_SUCCESS'),
          closeable: true,
        });
        setIsRecallApi(!isRecallApi);
        clearAllHandler();
      } else if (createError) {
        // Info: (20241112 - Julian) 顯示新增失敗訊息
        toastHandler({
          id: ToastId.ACCOUNTING_CREATE_ERROR,
          type: ToastType.ERROR,
          content: t('settings:ACCOUNTING_SETTING_MODAL.TOAST_ACCOUNT_TITLE_CREATE_FAIL'),
          closeable: true,
        });
      }
    }
  }, [createSuccess, isCreating, createError]);

  useEffect(() => {
    if (!isUpdating) {
      if (updateSuccess) {
        // Info: (20241112 - Julian) 顯示更新成功訊息，重新呼叫 API，並清空表單
        toastHandler({
          id: ToastId.ACCOUNTING_UPDATE_SUCCESS,
          type: ToastType.SUCCESS,
          content: t('settings:ACCOUNTING_SETTING_MODAL.TOAST_ACCOUNT_TITLE_UPDATE_SUCCESS'),
          closeable: true,
        });
        setIsRecallApi(!isRecallApi);
        clearAllHandler();
      } else if (updateError) {
        // Info: (20241112 - Julian) 顯示更新失敗訊息
        toastHandler({
          id: ToastId.ACCOUNTING_UPDATE_ERROR,
          type: ToastType.ERROR,
          content: t('settings:ACCOUNTING_SETTING_MODAL.TOAST_ACCOUNT_TITLE_UPDATE_FAIL'),
          closeable: true,
        });
      }
    }
  }, [updateSuccess, isUpdating, updateError]);

  useEffect(() => {
    // Info: (20241112 - Julian) 連動左邊的 <AccountTitleSection />，如果有選擇的會計科目，則將其顯示在表單中
    if (selectedAccountTitle) {
      setSelectCategory(selectedAccountTitle.type);
      setSelectSubcategory(selectedAccountTitle);
      // Info: (20241113 - Julian) 如果是新增，則名稱為空；如果是編輯，則名稱為原本的名稱
      setTitleName(formType === TitleFormType.ADD ? '' : selectedAccountTitle.name);
      // Info: (20241113 - Julian) 如果是新增，則代碼為空；如果是編輯，則代碼為原本的代碼
      setTitleCode(formType === TitleFormType.ADD ? '-' : selectedAccountTitle.code);
      // Info: (20241113 - Julian) 如果是新增，則備註為空；如果是編輯，則備註為原本的備註
      // ToDo: (20241113 - Julian) IAcount 的 note 欄位還沒有實作
      setTitleNote(selectedAccountTitle.note ?? ''); // Info: (20250120 - Shirley) @Julian 已串上後端實作的 note 功能
    }
  }, [selectedAccountTitle]);

  useEffect(() => {
    // Info: (20241112 - Julian) 如果重選小分類，則清空將大分類指向對應的 type
    const selectSubcategoryType = selectSubcategory?.type;
    if (selectSubcategoryType) {
      setSelectCategory(selectSubcategoryType);
    }
  }, [selectSubcategory]);

  useEffect(() => {
    // Info: (20241213 - Julian) 查詢會計科目關鍵字時聚焦
    if (isAccountEditing && accountInputRef.current) {
      accountInputRef.current.focus();
    }

    // Info: (20241213 - Julian) 查詢模式關閉後清除搜尋關鍵字
    if (!isAccountEditing) {
      setSearchKeyword('');
    }
  }, [isAccountEditing]);

  const isEditAccounting = isAccountEditing ? (
    <input
      id="account-input"
      ref={accountInputRef}
      value={searchKeyword}
      onChange={accountSearchHandler}
      placeholder={subcategoryString}
      className="w-full truncate bg-transparent text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder"
    />
  ) : (
    <p
      className={`flex-1 truncate ${selectSubcategory ? 'text-input-text-input-filled' : 'text-input-text-input-placeholder'}`}
    >
      {subcategoryString}
    </p>
  );

  const categoryList = accountTypeList.map((category) => {
    const categoryClickHandler = () => setSelectCategory(category);
    return (
      <div
        key={category}
        onClick={categoryClickHandler}
        className="px-12px py-8px text-sm text-dropdown-text-primary hover:bg-drag-n-drop-surface-hover"
      >
        <p>{t(`settings:ACCOUNTING_SETTING_MODAL.ACC_TYPE_${category.toUpperCase()}`)}</p>
      </div>
    );
  });

  const subcategoryList =
    filteredAccountList.length > 0 ? (
      filteredAccountList
        .filter((title) => !title.code.includes('-'))
        .map((title) => {
          const translatedName = getTranslatedName(title.name);
          const subcategoryClickHandler = () => setSelectSubcategory(title);

          return (
            <div
              key={title.id}
              onClick={subcategoryClickHandler}
              className="flex items-center gap-4px px-12px py-8px hover:bg-drag-n-drop-surface-hover"
            >
              <p className="text-sm text-dropdown-text-primary">{title.code}</p>
              <p className="text-xs text-dropdown-text-secondary">{translatedName}</p>
            </div>
          );
        })
    ) : (
      <p className="px-12px py-8px text-sm text-input-text-input-placeholder">
        {t('settings:ACCOUNTING_SETTING_MODAL.NO_ACCOUNTING_FOUND')}
      </p>
    );

  const displayCategoryMenu = (
    <div
      className={`absolute left-0 top-50px z-10 grid w-full rounded-sm ${isCategoryMenuOpen ? 'grid-rows-1 shadow-dropmenu' : 'grid-rows-0'} overflow-hidden transition-all duration-300 ease-in-out`}
    >
      <div
        id="accounting-category-menu"
        className="flex max-h-180px flex-col overflow-y-auto overflow-x-hidden rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px"
      >
        {categoryList}
      </div>
    </div>
  );

  const displaySubcategoryMenu = (
    <div
      className={`absolute left-0 top-50px z-10 grid w-full rounded-sm ${isAccountEditing ? 'grid-rows-1 shadow-dropmenu' : 'grid-rows-0'} overflow-hidden transition-all duration-300 ease-in-out`}
    >
      <div
        id="accounting-subcategory-menu"
        className="flex max-h-180px flex-col overflow-y-auto overflow-x-hidden rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px"
      >
        {subcategoryList}
      </div>
    </div>
  );

  const addBtnClickHandler = async () => {
    if (selectSubcategory) {
      createNewAccount({
        params: { accountBookId },

        body: {
          accountId: selectSubcategory.id,
          name: titleName,
          note: titleNote, // Info: (20250120 - Shirley) @Julian 已串上後端實作的 note 功能
        },
      });
    }
  };

  const updateBtnClickHandler = async () => {
    if (selectSubcategory) {
      updateNewAccount({
        params: { accountBookId, accountId: selectSubcategory.id },
        body: {
          code: selectSubcategory.code,
          name: titleName,
          note: titleNote, // Info: (20250120 - Shirley) @Julian 已串上後端實作的 note 功能
        },
      });
    }
  };

  const submitBtn =
    formType === TitleFormType.ADD ? (
      // ToDo: (20241113 - Julian) Create API
      <Button
        type="button"
        variant="default"
        disabled={submitDisabled}
        onClick={addBtnClickHandler}
      >
        {t('settings:ACCOUNTING_SETTING_MODAL.ADD_BTN')}
      </Button>
    ) : (
      // ToDo: (20241113 - Julian) Update API
      <Button
        type="button"
        variant="default"
        disabled={submitDisabled}
        onClick={updateBtnClickHandler}
      >
        {t('settings:ACCOUNTING_SETTING_MODAL.SAVE_BTN')}
      </Button>
    );

  return (
    <div className="flex h-350px flex-col gap-24px rounded-sm bg-surface-neutral-surface-lv1 p-24px shadow-Dropshadow_XS tablet:h-500px">
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
            {t('settings:ACCOUNTING_SETTING_MODAL.CATEGORY_TYPE')}
            <span className="text-text-state-error">*</span>
          </p>
          <div
            ref={categoryRef}
            onClick={toggleCategoryMenu}
            className="relative flex items-center rounded-sm border border-input-stroke-input px-12px py-10px hover:cursor-pointer"
          >
            {categoryString}
            <div
              className={`text-icon-surface-single-color-primary ${isCategoryMenuOpen ? 'rotate-180' : 'rotate-0'}`}
            >
              <FaChevronDown />
            </div>
            {displayCategoryMenu}
          </div>
        </div>
        {/* Info: (20241112 - Julian) Subcategory Type */}
        <div className="flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t('settings:ACCOUNTING_SETTING_MODAL.SUBCATEGORY_TYPE')}
            <span className="text-text-state-error">*</span>
          </p>
          <div
            ref={subcategoryRef}
            onClick={toggleSubcategoryMenu}
            className="relative flex items-center rounded-sm border border-input-stroke-input px-12px py-10px hover:cursor-pointer"
          >
            {isEditAccounting}
            <div className="h-20px w-20px">
              <FiBookOpen size={20} />
            </div>
            {displaySubcategoryMenu}
          </div>
        </div>

        {/* Info: (20241112 - Julian) Divider */}
        <hr className="w-full border-divider-stroke-lv-4" />

        {/* Info: (20241112 - Julian) Title Name */}
        <div className="flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t('settings:ACCOUNTING_SETTING_MODAL.TITLE_NAME')}
          </p>
          <input
            id="add-title-name-input"
            type="text"
            value={titleName}
            onChange={changeNameHandler}
            className="rounded-sm border border-input-stroke-input px-12px py-10px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
            placeholder={t('settings:ACCOUNTING_SETTING_MODAL.TITLE_NAME_PLACEHOLDER')}
          />
        </div>

        {/* Info: (20241112 - Julian) Title Code */}
        <div className="flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t('settings:ACCOUNTING_SETTING_MODAL.TITLE_CODE')}
          </p>
          <input
            id="add-title-code-input"
            type="text"
            value={titleCode}
            placeholder={t('settings:ACCOUNTING_SETTING_MODAL.TITLE_CODE')}
            disabled
            readOnly
            className="rounded-sm border border-input-stroke-input px-12px py-10px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
          />
        </div>

        {/* Info: (20241112 - Julian) Title Note */}
        <div className="flex flex-col gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t('settings:ACCOUNTING_SETTING_MODAL.TITLE_NOTE')}
          </p>
          <textarea
            id="add-title-note-input"
            rows={4}
            value={titleNote}
            onChange={changeNoteHandler}
            className="rounded-sm border border-input-stroke-input px-12px py-10px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
            placeholder={t('settings:ACCOUNTING_SETTING_MODAL.TITLE_NOTE_PLACEHOLDER')}
          />
        </div>
      </div>

      {/* Info: (20241112 - Julian) Buttons */}
      <div className="ml-auto flex items-center gap-12px">
        <Button type="button" variant="secondaryBorderless" onClick={clearAllHandler}>
          {t('settings:ACCOUNTING_SETTING_MODAL.CLEAR_ALL_BTN')}
        </Button>
        {submitBtn}
      </div>
    </div>
  );
};

export default AddNewTitleSection;
