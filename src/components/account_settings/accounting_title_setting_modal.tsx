import React, { useEffect } from 'react';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { RxCross2 } from 'react-icons/rx';
import { FiSearch } from 'react-icons/fi';
import { useUserCtx } from '@/contexts/user_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
import { AccountType } from '@/constants/account';
import { FREE_COMPANY_ID } from '@/constants/config';

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
  const { getAccountListHandler, accountList } = useAccountingCtx();

  const companyId = selectedCompany?.id ?? FREE_COMPANY_ID;

  useEffect(() => {
    getAccountListHandler(companyId);
  }, []);

  // Info: (20241004 - Julian) Remove AccountType.OTHER_COMPREHENSIVE_INCOME, AccountType.CASH_FLOW, AccountType.OTHER
  const accountTypeList = Object.values(AccountType).filter(
    (value) =>
      value !== AccountType.OTHER_COMPREHENSIVE_INCOME &&
      value !== AccountType.CASH_FLOW &&
      value !== AccountType.OTHER
  );

  const accountTitleMenu = accountTypeList.map((value) => {
    // Info: (20241004 - Julian) 子項目
    const childAccountList = accountList.filter((account) => account.type === value);
    const childAccountMenu = childAccountList.map((account) => {
      return (
        <div
          key={account.id}
          className="flex w-full items-center gap-4px rounded-full p-8px text-left text-xs font-semibold text-text-brand-secondary-lv1 hover:bg-dropdown-surface-menu-background-secondary"
        >
          <div className="flex w-36px items-center justify-center gap-4px">
            <Image src="/icons/folder.svg" width={16} height={16} alt="folder_icon" />
            <Image src="/icons/caret.svg" width={16} height={16} alt="caret_icon" />
          </div>

          <p>{account.code}</p>
          <p className="truncate">{account.name}</p>
        </div>
      );
    });

    return (
      // Info: (20241004 - Julian) 顯示有子項目的 AccountType
      childAccountList.length > 0 ? (
        <div key={value} className="flex flex-col">
          <div className="flex items-center gap-8px">
            <Image
              src={`/icons/account_type_${value}.svg`} // ToDo: (20241108 - Julian) 還差 revenue, cost, income, expense 的 icon
              width={16}
              height={16}
              alt={`${value}_icon`}
            />
            <p className="whitespace-nowrap text-sm text-divider-text-lv-1">
              {t(`journal:ACCOUNT_TYPE.${value.toUpperCase()}`)}
            </p>
            <hr className="w-fit flex-1 border-divider-stroke-lv-1" />
          </div>
          <div className="flex flex-col py-4px">{childAccountMenu}</div>
        </div>
      ) : null
    );
  });

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
              placeholder={t('common:COMMON.SEARCH')}
              className="flex-1 bg-transparent text-input-text-input-filled outline-none"
            />
            <FiSearch size={20} />
          </div>
        </div>

        {/* Info: (20241108 - Julian) Modal Body */}
        <div className="grid grid-cols-2 gap-24px">
          {/* Info: (20241108 - Julian) Left: Assets Section */}
          <div className="flex max-h-600px flex-col overflow-y-auto rounded-sm bg-surface-brand-primary-5 p-24px shadow-Dropshadow_XS">
            {accountTitleMenu}
          </div>
          {/* Info: (20241108 - Julian) Right: Add New Title Section */}
          <div className="flex flex-col rounded-sm bg-surface-neutral-surface-lv1 p-24px shadow-Dropshadow_XS">
            Add New Title Section
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default AccountingTitleSettingModal;
