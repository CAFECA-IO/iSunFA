import React, { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { RxCross2 } from 'react-icons/rx';
import { FiSearch } from 'react-icons/fi';
import { useUserCtx } from '@/contexts/user_context';
import { FREE_ACCOUNT_BOOK_ID } from '@/constants/config';
import { IAccount, IPaginatedAccount } from '@/interfaces/accounting_account';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import AccountTitleSection from '@/components/account_settings/account_title_section';
import AddNewTitleSection from '@/components/account_settings/add_new_title_section';
import { TitleFormType } from '@/constants/accounting_setting';
import Image from 'next/image';

interface IAccountingTitleSettingModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const AccountingTitleSettingModal: React.FC<IAccountingTitleSettingModalProps> = ({
  isModalVisible,
  modalVisibilityHandler,
}) => {
  const { t } = useTranslation('common');
  const { selectedAccountBook } = useUserCtx();

  const accountBookId = selectedAccountBook?.id ?? FREE_ACCOUNT_BOOK_ID;

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
    { params: { companyId: accountBookId }, query: queryCondition },
    // ToDo: (20250212 - Liz) 因應設計稿修改將公司改為帳本，後端 API 也需要將 companyId 修改成 accountBookId
    false,
    true
  );

  const accountList = accountTitleList?.data ?? [];

  const [searchWord, setSearchWord] = useState<string>('');
  const [filteredAccountList, setFilteredAccountList] = useState<IAccount[]>([]);
  const [formType, setFormType] = useState<TitleFormType>(TitleFormType.add);
  const [selectedAccountTitle, setSelectedAccountTitle] = useState<IAccount | null>(null);
  const [isRecallApi, setIsRecallApi] = useState<boolean>(false);

  const changeSearchWordHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchWord(e.target.value);
  };

  // Info: (20241108 - Julian) 按下 Enter 鍵才執行搜尋
  const handleSearchWordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      getAccountList({
        params: { companyId: accountBookId },
        query: { ...queryCondition, searchKey: searchWord },
      });
    }
  };

  useEffect(() => {
    if (isModalVisible) {
      getAccountList({ params: { companyId: accountBookId } });
      // ToDo: (20250212 - Liz) 因應設計稿修改將公司改為帳本，後端 API 也需要將 companyId 修改成 accountBookId
    } else {
      // Info: (20241108 - Julian) 關閉 Modal 時重置 state
      setSearchWord('');
      setFormType(TitleFormType.add);
      setSelectedAccountTitle(null);
    }
  }, [isModalVisible]);

  useEffect(() => {
    getAccountList({ params: { companyId: accountBookId } });
    // ToDo: (20250212 - Liz) 因應設計稿修改將公司改為帳本，後端 API 也需要將 companyId 修改成 accountBookId
  }, [isRecallApi]);

  useEffect(() => {
    setFilteredAccountList(accountList);
  }, [accountTitleList]);

  const clearSearchWord = () => {
    setSearchWord('');
    getAccountList({ params: { companyId: accountBookId } });
    // ToDo: (20250212 - Liz) 因應設計稿修改將公司改為帳本，後端 API 也需要將 companyId 修改成 accountBookId
  };

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-black/50">
      <div className="relative mx-auto flex w-90vw flex-col items-stretch gap-y-24px rounded-lg bg-card-surface-primary p-40px shadow-lg shadow-black/80 lg:w-720px">
        {/* Info: (20241108 - Julian) Title */}
        <h1 className="text-center text-xl font-bold text-text-neutral-primary">
          {t('setting:ACCOUNTING_SETTING_MODAL.MODAL_TITLE')}
        </h1>

        {/* Info: (20241108 - Julian) Close button */}
        <button
          type="button"
          className="absolute right-40px text-icon-surface-single-color-primary"
          onClick={modalVisibilityHandler}
        >
          <RxCross2 size={20} />
        </button>

        {/* Info: (20241108 - Julian) Search */}
        <div className="flex flex-col items-start gap-8px">
          <p className="text-sm font-semibold text-input-text-primary">
            {t('setting:ACCOUNTING_SETTING_MODAL.SEARCH_ACCOUNTING_TITLE')}
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

        {/* Info: (20241108 - Julian) Modal Body */}
        <div className="grid grid-cols-2 gap-24px">
          {/* Info: (20241108 - Julian) Left: Account Title Section */}
          {success === false ? (
            <div className="flex flex-col items-center justify-center gap-lv-4 rounded-sm bg-surface-brand-primary-5 shadow-Dropshadow_XS">
              <Image src="/images/empty.svg" width={120} height={135} alt="empty_icon" />
              <div className="text-center text-base text-text-state-error">
                <p>{t('setting:ACCOUNTING_SETTING_MODAL.LOADING_ERROR')}</p>
                <p>{t('setting:ACCOUNTING_SETTING_MODAL.TRY_AGAIN')}</p>
              </div>
            </div>
          ) : (
            <AccountTitleSection
              accountTitleList={filteredAccountList}
              isLoading={isLoading ?? true}
              setFormType={setFormType}
              setSelectedAccountTitle={setSelectedAccountTitle}
              setIsRecallApi={setIsRecallApi}
            />
          )}
          {/* Info: (20241108 - Julian) Right: Add New Title Section */}
          <AddNewTitleSection
            formType={formType}
            selectedAccountTitle={selectedAccountTitle}
            isRecallApi={isRecallApi}
            setIsRecallApi={setIsRecallApi}
            clearSearchWord={clearSearchWord}
          />
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default AccountingTitleSettingModal;
