import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { RxCross2 } from 'react-icons/rx';
import { FiSearch } from 'react-icons/fi';
import { TbArrowBackUp } from 'react-icons/tb';
import { useUserCtx } from '@/contexts/user_context';
import { FREE_ACCOUNT_BOOK_ID } from '@/constants/config';
import { IAccount, IPaginatedAccount } from '@/interfaces/accounting_account';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import AccountTitleSection from '@/components/general/account_settings/account_title_section';
import AddNewTitleSection from '@/components/general/account_settings/add_new_title_section';
import { TitleFormType } from '@/constants/accounting_setting';
import { KEYBOARD_EVENT_CODE } from '@/constants/keyboard_event_code';
import { Button } from '@/components/button/button';

interface IAccountingTitleSettingModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const AccountingTitleSettingModal: React.FC<IAccountingTitleSettingModalProps> = ({
  isModalVisible,
  modalVisibilityHandler,
}) => {
  const { t } = useTranslation('common');
  const { connectedAccountBook } = useUserCtx();

  const accountBookId = connectedAccountBook?.id ?? FREE_ACCOUNT_BOOK_ID;

  const queryCondition = {
    limit: 9999, // Info: (20241212 - Julian) 全部取出
    forUser: true,
    sortBy: 'code', // Info: (20241108 - Julian) 依 code 排序
    sortOrder: 'asc',
    isDeleted: false, // Info: (20241231 - Julian) 只取未刪除的
  };

  const {
    trigger: getAccountList,
    data: accountTitleList,
    isLoading,
    success,
  } = APIHandler<IPaginatedAccount>(
    APIName.ACCOUNT_LIST,
    { params: { accountBookId }, query: queryCondition },

    false,
    true
  );

  const accountList = accountTitleList?.data ?? [];

  const [searchWord, setSearchWord] = useState<string>('');
  const [filteredAccountList, setFilteredAccountList] = useState<IAccount[]>([]);
  const [formType, setFormType] = useState<TitleFormType>(TitleFormType.ADD);
  const [selectedAccountTitle, setSelectedAccountTitle] = useState<IAccount | null>(null);
  const [isRecallApi, setIsRecallApi] = useState<boolean>(false);

  // Info: (20250522 - Julian) 手機版用來控制是否顯示 Add New Title Section
  const isShowForm = selectedAccountTitle !== null;

  const changeSearchWordHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchWord(e.target.value);
  };

  const goBackHandler = () => {
    setSelectedAccountTitle(null);
  };

  // Info: (20250214 - Julian) 按鍵事件
  const handleSearchWordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Info: (20241108 - Julian) 按下 Enter 鍵才執行搜尋
    if (e.key === KEYBOARD_EVENT_CODE.ENTER) {
      getAccountList({
        params: { accountBookId },
        query: { ...queryCondition, searchKey: searchWord },
      });
    }
  };

  useEffect(() => {
    setFilteredAccountList(accountList); // Info: (20250214 - Julian) 一開始顯示全部
  }, [accountTitleList]);

  useEffect(() => {
    // Info: (20250214 - Julian) 關鍵字為空時顯示全部
    if (searchWord === '') {
      getAccountList({ params: { accountBookId }, query: queryCondition });
    }
  }, [searchWord]);

  useEffect(() => {
    if (isModalVisible) {
      getAccountList({ params: { accountBookId } });
    } else {
      // Info: (20241108 - Julian) 關閉 Modal 時重置 state
      setSearchWord('');
      setFormType(TitleFormType.ADD);
      setSelectedAccountTitle(null);
    }
  }, [isModalVisible]);

  useEffect(() => {
    getAccountList({ params: { accountBookId } });
  }, [isRecallApi]);

  const clearSearchWord = () => {
    setSearchWord('');
    getAccountList({ params: { accountBookId } });
  };

  const leftPart = (
    <AccountTitleSection
      accountTitleList={filteredAccountList}
      isLoading={isLoading ?? true}
      setFormType={setFormType}
      setSelectedAccountTitle={setSelectedAccountTitle}
      setIsRecallApi={setIsRecallApi}
    />
  );

  const rightPart = (
    <AddNewTitleSection
      formType={formType}
      selectedAccountTitle={selectedAccountTitle}
      isRecallApi={isRecallApi}
      setIsRecallApi={setIsRecallApi}
      clearSearchWord={clearSearchWord}
    />
  );

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="mx-auto flex w-90vw flex-col items-stretch gap-y-lv-6 rounded-lg bg-card-surface-primary px-lv-5 py-lv-4 shadow-lg shadow-black/80 tablet:gap-y-24px tablet:p-40px lg:w-720px">
        <div className="relative flex flex-col">
          {/* Info: (20241108 - Julian) Title */}
          <h1 className="text-center text-xl font-bold text-text-neutral-primary">
            {t('settings:ACCOUNTING_SETTING_MODAL.MODAL_TITLE')}
          </h1>
          {/* Info: (20241108 - Julian) Close button */}
          <button
            type="button"
            className="absolute right-0 text-icon-surface-single-color-primary"
            onClick={modalVisibilityHandler}
          >
            <RxCross2 size={20} />
          </button>
        </div>

        {/* Info: (20250522 - Julian) back btn for mobile */}
        {isShowForm && (
          <div className="block tablet:hidden">
            <Button variant="tertiaryOutline" size="smallSquare" onClick={goBackHandler}>
              <TbArrowBackUp size={20} />
            </Button>
          </div>
        )}

        {/* Info: (20241108 - Julian) Search */}
        <div className="flex flex-col items-start gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t('settings:ACCOUNTING_SETTING_MODAL.SEARCH_ACCOUNTING_TITLE')}
          </p>
          <div className="flex w-full items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background px-12px py-10px placeholder:text-input-text-input-placeholder">
            <input
              id="accounting-title-search-input"
              type="text"
              value={searchWord}
              onChange={changeSearchWordHandler}
              onKeyDown={handleSearchWordKeyDown}
              placeholder={t('common:COMMON.SEARCH')}
              className="flex-1 bg-transparent text-input-text-input-filled outline-none"
            />
            <FiSearch size={20} />
          </div>
        </div>

        {/* Info: (20241108 - Julian) Modal Body for desktop */}
        <div className="hidden grid-cols-2 gap-24px tablet:grid">
          {/* Info: (20241108 - Julian) Left: Account Title Section */}
          {success === false ? (
            <div className="flex flex-col items-center justify-center gap-lv-4 rounded-sm bg-surface-brand-primary-5 shadow-Dropshadow_XS">
              <Image src="/images/empty.svg" width={120} height={135} alt="empty_icon" />
              <div className="text-center text-base text-text-state-error">
                <p>{t('settings:ACCOUNTING_SETTING_MODAL.LOADING_ERROR')}</p>
                <p>{t('settings:ACCOUNTING_SETTING_MODAL.TRY_AGAIN')}</p>
              </div>
            </div>
          ) : (
            leftPart
          )}
          {/* Info: (20241108 - Julian) Right: Add New Title Section */}
          {rightPart}
        </div>

        {/* Info: (20250522 - Julian) Modal Body for mobile */}
        <div className="block tablet:hidden">{isShowForm ? rightPart : leftPart}</div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default AccountingTitleSettingModal;
