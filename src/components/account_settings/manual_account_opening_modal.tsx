import React, { useState, useRef, useEffect } from 'react';
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
  subcategoryChangeHandler: (acc: IAccount) => void;
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

const tableCellStyle = 'table-cell px-16px py-8px align-middle text-center';

const ManualAccountOpeningItem: React.FC<IManualAccountOpeningItemProps> = ({
  data,
  subcategoryChangeHandler,
}) => {
  //  const { t } = useTranslation('common');
  const { selectedCompany } = useUserCtx();
  const { subcategory, titleName, isDebit } = data;

  const subcategoryInputRef = useRef<HTMLInputElement>(null);
  const [searchWord, setSearchWord] = useState<string>('');
  const [selectSubcategory, setSelectSubcategory] = useState<IAccount | null>(subcategory);

  const [nameInput, setNameInput] = useState<string>(titleName);

  const companyId = selectedCompany?.id ?? FREE_COMPANY_ID;
  const subcategoryPlaceholder = selectSubcategory
    ? `${selectSubcategory?.code} ${selectSubcategory?.name}`
    : 'Please select';

  const debitDisabled = isDebit === null ? false : !isDebit;
  const creditDisabled = isDebit === null ? false : isDebit;

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

  const {
    targetRef: subcategoryRef,
    componentVisible: isEditing,
    setComponentVisible: setEditing,
  } = useOuterClick<HTMLDivElement>(false);

  const accountTitleList = accountList?.data ?? [];

  const toggleEditing = () => setEditing(!isEditing);
  const changeSearchWordHandler = (e: React.ChangeEvent<HTMLInputElement>) =>
    setSearchWord(e.target.value);
  const changeNameInputHandler = (e: React.ChangeEvent<HTMLInputElement>) =>
    setNameInput(e.target.value);

  useEffect(() => {
    // Info: (20241112 - Julian) 編輯模式時，自動 focus 到 subcategoryInput
    if (isEditing) {
      subcategoryInputRef.current?.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    getAccountList({
      params: { companyId },
      query: { ...queryCondition, searchKey: searchWord },
    });
  }, [searchWord]);

  const subcategoryList = accountTitleList.filter((title) => !title.code.includes('-'));

  const subcategoryStr = isEditing ? (
    <input
      type="text"
      ref={subcategoryInputRef}
      value={searchWord}
      onChange={changeSearchWordHandler}
      className="w-9/10 bg-transparent outline-none"
      placeholder={subcategoryPlaceholder}
    />
  ) : (
    <>
      <div
        className={`flex-1 truncate text-left ${selectSubcategory ? 'text-input-text-input-filled' : 'text-input-text-input-placeholder'}`}
      >
        {subcategoryPlaceholder}
      </div>
      <div className="text-icon-surface-single-color-primary">
        <FaChevronDown />
      </div>
    </>
  );

  const subcategoryMenu =
    subcategoryList.length > 0 ? (
      subcategoryList.map((title) => {
        const subcategoryClickHandler = () => {
          setSelectSubcategory(title);
          subcategoryChangeHandler(title);
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
      <div className="text-xs text-input-text-input-placeholder">No Account Title Found</div>
    );

  const displaySubcategoryMenu = (
    <div
      ref={subcategoryRef}
      className={`absolute left-0 top-50px z-10 grid w-full rounded-sm ${isEditing ? 'grid-rows-1 shadow-dropmenu' : 'grid-rows-0'} overflow-hidden transition-all duration-300 ease-in-out`}
    >
      <div className="flex max-h-180px flex-col overflow-y-auto overflow-x-hidden rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px">
        {subcategoryMenu}
      </div>
    </div>
  );

  return (
    <div className="table-row bg-surface-neutral-surface-lv2 text-sm">
      {/* Info: (20241112 - Julian) Subcategory Type */}
      <div className={`${tableCellStyle} border-r border-stroke-neutral-quaternary`}>
        <div
          onClick={toggleEditing}
          className="relative flex w-150px items-center rounded-sm border border-input-stroke-input px-12px py-10px hover:cursor-pointer"
        >
          {subcategoryStr}
          {displaySubcategoryMenu}
        </div>
      </div>
      {/* Info: (20241112 - Julian) Title Name */}
      <div className={`${tableCellStyle} border-r border-stroke-neutral-quaternary`}>
        <input
          id="manual-account-name-input"
          type="text"
          value={nameInput}
          onChange={changeNameInputHandler}
          className="w-150px rounded-sm border border-input-stroke-input px-12px py-10px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
          placeholder={'Enter text'}
        />
      </div>
      {/* Info: (20241112 - Julian) Title Code */}
      <div className={`${tableCellStyle} border-r border-stroke-neutral-quaternary`}>
        <input
          id="manual-account-code-input"
          type="text"
          className="w-150px rounded-sm border border-input-stroke-input px-12px py-10px text-input-text-input-filled outline-none placeholder:text-input-text-input-placeholder disabled:border-input-stroke-disable disabled:bg-input-surface-input-disable disabled:text-input-text-disable"
          placeholder="-" // ToDo: (20241112 - Julian) get code from API
          disabled
        />
      </div>
      {/* Info: (20241112 - Julian) Beginning Debit */}
      <div className={`${tableCellStyle} border-r border-stroke-neutral-quaternary`}>
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
      <div className="table-cell px-16px py-8px">
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

  const [manualAccountOpeningList, setManualAccountOpeningList] = useState<
    IManualAccountOpeningItem[]
  >([defaultManualAccountOpeningItem]);

  const addListClickHandler = () =>
    setManualAccountOpeningList([...manualAccountOpeningList, defaultManualAccountOpeningItem]);

  useEffect(() => {
    if (!isModalVisible) {
      setManualAccountOpeningList([defaultManualAccountOpeningItem]);
    }
  }, [isModalVisible]);

  const tableBody = manualAccountOpeningList.map((item) => {
    const duplicateList = { ...item };

    const subcategoryChangeHandler = (acc: IAccount) => {
      duplicateList.subcategory = acc;
      setManualAccountOpeningList(
        manualAccountOpeningList.map((list) => (list.id === item.id ? duplicateList : list))
      );
    };
    return (
      <ManualAccountOpeningItem
        key={item.titleCode}
        data={item}
        subcategoryChangeHandler={subcategoryChangeHandler}
      />
    );
  });

  const displayTable = (
    <div className="table w-full bg-transparent shadow-Dropshadow_XS">
      <div className="table-row-group">
        {/* Info: (20241112 - Julian) table header */}
        <div className="table-row bg-surface-brand-secondary-5 text-xs font-medium text-text-brand-secondary-lv2">
          <div className={`${tableCellStyle} border-r border-stroke-neutral-quaternary`}>
            Subcategory Type
          </div>
          <div className={`${tableCellStyle} border-r border-stroke-neutral-quaternary`}>
            Title Name
          </div>
          <div className={`${tableCellStyle} border-r border-stroke-neutral-quaternary`}>
            Title Code
          </div>
          <div className={`${tableCellStyle} border-r border-stroke-neutral-quaternary`}>
            Beginning debit
          </div>
          <div className="table-cell px-16px py-8px">Beginning credit</div>
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
          Manual Account Opening
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
          {displayTable}
          <Button
            type="button"
            variant="secondaryOutline"
            onClick={addListClickHandler}
            className="w-full"
          >
            <FaPlus /> Add list
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
