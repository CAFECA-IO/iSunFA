import React, { useState, useEffect } from 'react';
import { FaPlus, FaChevronDown, FaArrowRight } from 'react-icons/fa6';
import { RxCross2 } from 'react-icons/rx';
import { useTranslation } from 'next-i18next';
import { Button } from '@/components/button/button';
import { APIName } from '@/constants/api_connection';
import { IAccount, IPaginatedAccount } from '@/interfaces/accounting_account';
import APIHandler from '@/lib/utils/api_handler';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { useUserCtx } from '@/contexts/user_context';
import { FREE_COMPANY_ID } from '@/constants/config';

interface IManualAccountOpeningModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

interface IManualAccountOpeningItemProps {
  data: IManualAccountOpeningItem;
  setFocusIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setSearchWord: React.Dispatch<React.SetStateAction<string>>;
}

// Info: (20241112 - Julian) ========= May move to interfaces =========
interface IManualAccountOpeningItem {
  id: number;
  subcategory: IAccount | null;
  titleName: string;
  titleCode: string;
  beginningAmount: number;
  isDebit: boolean | null;
}

const defaultManualAccountOpeningItem: IManualAccountOpeningItem = {
  id: 0,
  subcategory: null,
  titleName: '',
  titleCode: '',
  beginningAmount: 0,
  isDebit: null,
};

const tableCellStyle =
  'table-cell px-16px py-8px align-middle text-center border-stroke-neutral-quaternary';

const ManualAccountOpeningItem: React.FC<IManualAccountOpeningItemProps> = ({
  data,
  setFocusIndex,
  setSearchWord,
}) => {
  const { t } = useTranslation('common');
  const { id, subcategory, titleName, isDebit } = data;

  const [nameInput, setNameInput] = useState<string>(titleName);

  const subcategoryPlaceholder = subcategory
    ? `${subcategory.code} ${subcategory.name}`
    : t('setting:MANUAL_ACCOUNT_OPENING_MODAL.DROPMENU_PLACEHOLDER');

  const debitDisabled = isDebit === null ? false : !isDebit;
  const creditDisabled = isDebit === null ? false : isDebit;

  const {
    targetRef: subcategoryInputRef,
    componentVisible: isEditing,
    setComponentVisible: setEditing,
  } = useOuterClick<HTMLInputElement>(false);

  const toggleEditing = () => setEditing(!isEditing);
  const changeSearchWordHandler = (e: React.ChangeEvent<HTMLInputElement>) =>
    setSearchWord(e.target.value);
  const changeNameInputHandler = (e: React.ChangeEvent<HTMLInputElement>) =>
    setNameInput(e.target.value);

  useEffect(() => {
    // Info: (20241112 - Julian) 編輯模式時，自動 focus 到 subcategoryInput
    if (isEditing) {
      subcategoryInputRef.current?.focus();
      setFocusIndex(id);
    } else {
      setFocusIndex(null);
    }
  }, [isEditing]);

  const subcategoryStr = isEditing ? (
    <input
      type="text"
      ref={subcategoryInputRef}
      onChange={changeSearchWordHandler}
      className="w-9/10 bg-transparent outline-none"
      placeholder={subcategoryPlaceholder}
    />
  ) : (
    <>
      <div
        className={`flex-1 truncate text-left ${subcategory ? 'text-input-text-input-filled' : 'text-input-text-input-placeholder'}`}
      >
        {subcategoryPlaceholder}
      </div>
      <div className="text-icon-surface-single-color-primary">
        <FaChevronDown />
      </div>
    </>
  );

  return (
    <div className="table-row bg-surface-neutral-surface-lv2 text-sm">
      {/* Info: (20241112 - Julian) Subcategory Type */}
      <div className={`${tableCellStyle} border-r`}>
        <div
          onClick={toggleEditing}
          className="relative flex w-150px items-center rounded-sm border border-input-stroke-input px-12px py-10px hover:cursor-pointer"
        >
          {subcategoryStr}
        </div>
      </div>
      {/* Info: (20241112 - Julian) Title Name */}
      <div className={`${tableCellStyle} border-r`}>
        <input
          id="manual-account-name-input"
          type="text"
          value={nameInput}
          onChange={changeNameInputHandler}
          className="w-150px rounded-sm border border-input-stroke-input px-12px py-10px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
          placeholder={t('setting:MANUAL_ACCOUNT_OPENING_MODAL.NAME_PLACEHOLDER')}
        />
      </div>
      {/* Info: (20241112 - Julian) Title Code */}
      <div className={`${tableCellStyle} border-r`}>
        <input
          id="manual-account-code-input"
          type="text"
          className="w-150px rounded-sm border border-input-stroke-input px-12px py-10px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
          placeholder="-" // ToDo: (20241112 - Julian) get code from API
          disabled
        />
      </div>
      {/* Info: (20241112 - Julian) Beginning Debit */}
      <div className={`${tableCellStyle} border-r`}>
        <input
          id="manual-account-debit-input"
          type="number"
          onWheel={(e) => e.currentTarget.blur()} // Info: (20241112 - Julian) 防止滾輪滾動
          min={0}
          className="w-150px rounded-sm border border-input-stroke-input px-12px py-10px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
          placeholder="0"
          disabled={debitDisabled}
        />
      </div>
      {/* Info: (20241112 - Julian) Beginning Credit */}
      <div className={`${tableCellStyle}`}>
        <input
          id="manual-account-credit-input"
          type="number"
          onWheel={(e) => e.currentTarget.blur()} // Info: (20241112 - Julian) 防止滾輪滾動
          min={0}
          className="w-150px rounded-sm border border-input-stroke-input px-12px py-10px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
          placeholder="0"
          disabled={creditDisabled}
        />
      </div>
    </div>
  );
};

const ManualAccountOpeningModal: React.FC<IManualAccountOpeningModalProps> = ({
  isModalVisible,
  modalVisibilityHandler,
}) => {
  const { t } = useTranslation('common');

  const { selectedCompany } = useUserCtx();

  // Info: (20241114 - Julian) 用來判斷是否展開 subcategory menu，以及展開的項目 index
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  // Info: (20241114 - Julian) 用來搜尋會計科目
  const [searchWord, setSearchWord] = useState<string>('');
  // Info: (20241114 - Julian) 用來儲存新增的會計科目列表
  const [manualAccountOpeningList, setManualAccountOpeningList] = useState<
    IManualAccountOpeningItem[]
  >([defaultManualAccountOpeningItem]);

  const companyId = selectedCompany?.id ?? FREE_COMPANY_ID;

  const queryCondition = {
    limit: 1000, // Info: (20241108 - Julian) 一次取得 1000 筆
    forUser: true,
    sortBy: 'code', // Info: (20241108 - Julian) 依 code 排序
    sortOrder: 'asc',
  };

  const { trigger: getAccountList, data: accountList } = APIHandler<IPaginatedAccount>(
    APIName.ACCOUNT_LIST,
    { params: { companyId }, query: queryCondition },
    false,
    true
  );

  const subcategoryList = accountList?.data ?? [];
  // Info: (20241114 - Julian) 如果有 focusIndex，則代表有展開的 subcategory menu
  const isExpanded = focusIndex !== null;
  // Info: (20241114 - Julian) 根據 focusIndex 來決定 subcategory menu 的位置
  const topStyle = focusIndex && focusIndex !== 0 ? `top-${90 + 60 * focusIndex}px` : 'top-90px';

  const addListClickHandler = () => {
    const lastItem = manualAccountOpeningList[manualAccountOpeningList.length - 1];
    const newId = lastItem.id + 1;
    const newItem = { ...defaultManualAccountOpeningItem, id: newId };

    setManualAccountOpeningList([...manualAccountOpeningList, newItem]);
  };

  useEffect(() => {
    // Info: (20241114 - Julian) 如果 modal 關閉，則重置 manualAccountOpeningList
    if (!isModalVisible) {
      setManualAccountOpeningList([defaultManualAccountOpeningItem]);
    }
  }, [isModalVisible]);

  useEffect(() => {
    // Info: (20241114 - Julian) 關鍵字搜尋
    getAccountList({
      params: { companyId },
      query: { ...queryCondition, searchKey: searchWord },
    });
  }, [searchWord]);

  useEffect(() => {
    // Info: (20241114 - Julian) 如果 focusIndex 重置，則清空搜尋字串
    if (focusIndex === null) {
      setSearchWord('');
    }
  }, [focusIndex]);

  // useEffect(() => {
  //   console.log('manual', manualAccountOpeningList);
  // }, [manualAccountOpeningList]);

  const tableBody = manualAccountOpeningList.map((item) => (
    <ManualAccountOpeningItem
      key={item.id}
      data={item}
      setFocusIndex={setFocusIndex}
      setSearchWord={setSearchWord}
    />
  ));

  const subcategoryMenu =
    subcategoryList.length > 0 ? (
      subcategoryList.map((title) => {
        const subcategoryClickHandler = () => {
          // Info: (20241114 - Julian) 根據 focusIndex 來決定要修改哪一筆資料
          if (focusIndex !== null) {
            const duplicateList = { ...manualAccountOpeningList[focusIndex] };
            duplicateList.subcategory = title;
            setManualAccountOpeningList(
              manualAccountOpeningList.map((list, index) => {
                return index === focusIndex ? duplicateList : list;
              })
            );
          }
        };
        return (
          <div
            key={title.id}
            onClick={subcategoryClickHandler}
            className="flex items-center gap-4px px-12px py-8px text-left text-xs hover:bg-drag-n-drop-surface-hover"
          >
            <p className="text-dropdown-text-primary">{title.code}</p>
            <p className="text-dropdown-text-secondary">{title.name}</p>
          </div>
        );
      })
    ) : (
      <div className="text-xs text-input-text-input-placeholder">
        {t('setting:MANUAL_ACCOUNT_OPENING_MODAL.NO_ACCOUNTING_FOUND')}
      </div>
    );

  const displaySubcategoryMenu = (
    <div
      className={`absolute left-0 ${topStyle} z-10 grid w-1/5 rounded-sm ${isExpanded ? 'grid-rows-1 shadow-dropmenu' : 'grid-rows-0'} overflow-hidden transition-all duration-300 ease-in-out`}
    >
      <div className="flex max-h-180px flex-col overflow-y-auto overflow-x-hidden rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px">
        {subcategoryMenu}
      </div>
    </div>
  );

  const displayTable = (
    <div className="table w-full rounded-md">
      <div className="table-row-group">
        {/* Info: (20241112 - Julian) table header */}
        <div className="table-row bg-surface-brand-secondary-5 text-xs font-medium text-text-brand-secondary-lv2">
          <div className={`${tableCellStyle} border-r`}>
            {t('setting:MANUAL_ACCOUNT_OPENING_MODAL.SUBCATEGORY_TYPE')}
          </div>
          <div className={`${tableCellStyle} border-r`}>
            {t('setting:MANUAL_ACCOUNT_OPENING_MODAL.TITLE_NAME')}
          </div>
          <div className={`${tableCellStyle} border-r`}>
            {t('setting:MANUAL_ACCOUNT_OPENING_MODAL.TITLE_CODE')}
          </div>
          <div className={`${tableCellStyle} border-r`}>
            {t('setting:MANUAL_ACCOUNT_OPENING_MODAL.BEGINNING_DEBIT')}
          </div>
          <div className={`${tableCellStyle}`}>
            {t('setting:MANUAL_ACCOUNT_OPENING_MODAL.BEGINNING_CREDIT')}
          </div>
        </div>
        {/* Info: (20241112 - Julian) table body */}
        {tableBody}
      </div>
    </div>
  );

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="relative mx-auto flex w-90vw flex-col items-stretch gap-y-24px rounded-lg bg-card-surface-primary p-40px shadow-lg shadow-black/80 lg:w-fit">
        {/* Info: (20241112 - Julian) Title */}
        <h1 className="text-center text-xl font-bold text-text-neutral-primary">
          {t('setting:MANUAL_ACCOUNT_OPENING_MODAL.MODAL_TITLE')}
        </h1>

        {/* Info: (20241112 - Julian) Close button */}
        <button
          type="button"
          className="absolute right-40px text-icon-surface-single-color-primary"
          onClick={modalVisibilityHandler}
        >
          <RxCross2 size={20} />
        </button>

        {/* Info: (20241112 - Julian) body */}
        <div className="flex flex-col items-center gap-24px">
          {/* Info: (20241112 - Julian) table */}
          <div className="relative flex flex-col">
            <div className="max-h-300px overflow-y-auto rounded-md shadow-Dropshadow_XS">
              {displayTable}
            </div>
            {displaySubcategoryMenu}
          </div>

          <Button
            type="button"
            variant="secondaryOutline"
            onClick={addListClickHandler}
            className="w-full"
          >
            <FaPlus /> {t('setting:MANUAL_ACCOUNT_OPENING_MODAL.ADD_LIST_BTN')}
          </Button>
        </div>

        {/* Info: (20241112 - Julian) buttons */}
        <div className="ml-auto flex items-center gap-12px">
          <Button type="button" variant="secondaryBorderless" onClick={modalVisibilityHandler}>
            {t('common:COMMON.CANCEL')}
          </Button>
          <Button type="submit" variant="tertiary">
            {t('common:COMMON.SUBMIT')} <FaArrowRight />
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default ManualAccountOpeningModal;
