import React, { useEffect, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { RxCross2 } from 'react-icons/rx';
import { FiSearch } from 'react-icons/fi';
import { useUserCtx } from '@/contexts/user_context';
import { FREE_COMPANY_ID } from '@/constants/config';
import { IAccount, IPaginatedAccount } from '@/interfaces/accounting_account';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import AccountTitleSection from '@/components/account_settings/account_title_section';

interface IAccountingTitleSettingModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
}

const AccountingTitleSettingModal: React.FC<IAccountingTitleSettingModalProps> = ({
  isModalVisible,
  modalVisibilityHandler,
}) => {
  const { t } = useTranslation('common');
  const { selectedCompany } = useUserCtx();

  const companyId = selectedCompany?.id ?? FREE_COMPANY_ID;

  const queryCondition = {
    limit: 1000, // Info: (20241108 - Julian) 一次取得 1000 筆
    forUser: true,
    sortBy: 'code', // Info: (20241108 - Julian) 依 code 排序
    sortOrder: 'asc',
  };

  const {
    trigger: getAccountList,
    data: accountTitleList,
    isLoading,
  } = APIHandler<IPaginatedAccount>(
    APIName.ACCOUNT_LIST,
    { params: { companyId }, query: queryCondition },
    false,
    true
  );

  const accountList = accountTitleList?.data ?? [];

  const [searchWord, setSearchWord] = useState<string>('');
  const [filteredAccountList, setFilteredAccountList] = useState<IAccount[]>([]);
  const [addAccountCode, setAddAccountCode] = useState<string>('');

  const changeSearchWordHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchWord(e.target.value);
  };

  // Info: (20241108 - Julian) 按下 Enter 鍵才執行搜尋
  const handleSearchWordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      getAccountList({
        params: { companyId },
        query: { ...queryCondition, searchKey: searchWord },
      });
    }
  };

  useEffect(() => {
    getAccountList({ params: { companyId } });
  }, []);

  useEffect(() => {
    setFilteredAccountList(accountList);
  }, [accountTitleList]);

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="relative mx-auto flex w-90vw flex-col items-stretch gap-y-24px rounded-lg bg-card-surface-primary p-40px shadow-lg shadow-black/80 lg:w-720px">
        {/* Info: (20241108 - Julian) Title */}
        <h1 className="text-center text-xl font-bold text-text-neutral-primary">
          Accounting Title Setting
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
          <p className="text-sm font-semibold text-input-text-primary">Search Accounting Title</p>
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
          <AccountTitleSection
            accountTitleList={filteredAccountList}
            isLoading={isLoading ?? true}
            setAddAccountCode={setAddAccountCode}
          />
          {/* Info: (20241108 - Julian) Right: Add New Title Section */}
          <div className="flex flex-col rounded-sm bg-surface-neutral-surface-lv1 p-24px shadow-Dropshadow_XS">
            Add New Title Section: {addAccountCode}
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default AccountingTitleSettingModal;
