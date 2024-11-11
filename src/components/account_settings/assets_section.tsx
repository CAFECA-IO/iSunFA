import React from 'react';
import Image from 'next/image';
import { IAccount } from '@/interfaces/accounting_account';
import { useTranslation } from 'next-i18next';
import { AccountType } from '@/constants/account';

interface IAccountingTitleSettingModalProps {
  accountTitleList: IAccount[];
}

// ToDo: (20241108 - Julian) 須插入 skeleton loading

const AssetsSection: React.FC<IAccountingTitleSettingModalProps> = ({ accountTitleList }) => {
  const { t } = useTranslation('common');

  // Info: (20241004 - Julian) Remove AccountType.OTHER_COMPREHENSIVE_INCOME, AccountType.CASH_FLOW, AccountType.OTHER
  const accountTypeList = Object.values(AccountType).filter(
    (value) =>
      value !== AccountType.OTHER_COMPREHENSIVE_INCOME &&
      value !== AccountType.CASH_FLOW &&
      value !== AccountType.OTHER
  );

  const getChildAccountList = (accountType: AccountType) => {
    const childAccountList = accountTitleList.filter((account) => account.type === accountType);
    const childAccountMenu = childAccountList.map((account) => {
      const appendAccountList = childAccountList.filter((childAccount) =>
        childAccount.code.includes('-')
      );

      return (
        <div key={account.id} className="flex flex-col">
          {/* Info: (20241108 - Julian) 項目標題 */}
          <div className="flex w-full items-center gap-4px rounded-full px-8px py-4px text-left text-xs font-semibold text-text-brand-secondary-lv1 hover:bg-dropdown-surface-menu-background-secondary">
            <div className="flex w-36px items-center justify-center gap-4px">
              <Image src="/icons/folder.svg" width={16} height={16} alt="folder_icon" />
              <Image src="/icons/caret.svg" width={16} height={16} alt="caret_icon" />
            </div>

            <p>{account.code}</p>
            <p className="truncate">{account.name}</p>
          </div>
          {/* Info: (20241108 - Julian) 顯示子項目 */}
          <div className="flex flex-col gap-4px px-8px">
            {appendAccountList.map((appendAccount) => (
              <div
                key={appendAccount.id}
                className="flex w-full items-center gap-4px rounded-full px-8px py-4px text-left text-xs font-semibold text-text-brand-secondary-lv1 hover:bg-dropdown-surface-menu-background-secondary"
              >
                <div className="flex w-36px items-center justify-center gap-4px">
                  <Image src="/icons/caret.svg" width={16} height={16} alt="caret_icon" />
                </div>
                <p>{appendAccount.code}</p>
                <p className="truncate">{appendAccount.name}</p>
              </div>
            ))}
          </div>
        </div>
      );
    });

    return childAccountMenu;
  };

  const accountTitleMenu = accountTypeList.map((value) => {
    // Info: (20241004 - Julian) 子項目
    const secondLayerAccountMenu = getChildAccountList(value);

    return (
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
        <div className="flex flex-col py-4px">{secondLayerAccountMenu}</div>
      </div>
    );
  });

  return (
    <div className="flex h-600px flex-col overflow-y-auto rounded-sm bg-surface-brand-primary-5 p-24px shadow-Dropshadow_XS">
      {accountTitleMenu}
    </div>
  );
};

export default AssetsSection;
