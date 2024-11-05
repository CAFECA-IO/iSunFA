import React, { useState, useEffect } from 'react';
import SelectFilter from '@/components/filter_section/select_filter';
import { useTranslation } from 'next-i18next';

// Info: (20241105 - Anna) 科目選項
interface AccountRangeFilterProps {
  assetOptions: string[];
  liabilityOptions: string[];
  equityOptions: string[];
  revenueOptions: string[];
  costOptions: string[];
  expenseOptions: string[];
  incomeOptions: string[];
  otherComprehensiveIncomeOptions: string[];
  onRangeSelected: (from: string, to: string) => void; // Info: (20241015 - Anna) 當用戶選擇範圍後的回調
}

const AccountRangeFilter: React.FC<AccountRangeFilterProps> = ({
  assetOptions,
  liabilityOptions,
  equityOptions,
  revenueOptions,
  costOptions,
  expenseOptions,
  incomeOptions,
  otherComprehensiveIncomeOptions,
  onRangeSelected,
}) => {
  const { t } = useTranslation('common');
  // Info: (20241015 - Anna) From 部分的狀態
  const [fromCategory, setFromCategory] = useState<
    | 'Asset'
    | 'Liability'
    | 'Equity'
    | 'Revenue'
    | 'Cost'
    | 'Expense'
    | 'Income'
    | 'OtherComprehensiveIncome'
  >('Asset');
  const [fromAccount, setFromAccount] = useState<string>('');

  // Info: (20241015 - Anna) To 部分的狀態
  const [toCategory, setToCategory] = useState<
    | 'Asset'
    | 'Liability'
    | 'Equity'
    | 'Revenue'
    | 'Cost'
    | 'Expense'
    | 'Income'
    | 'OtherComprehensiveIncome'
  >('Asset');
  const [toAccount, setToAccount] = useState<string>('');

  const getOptionsByCategory = (
    category:
      | 'Asset'
      | 'Liability'
      | 'Equity'
      | 'Revenue'
      | 'Cost'
      | 'Expense'
      | 'Income'
      | 'OtherComprehensiveIncome'
  ) => {
    switch (category) {
      case 'Asset':
        return assetOptions;
      case 'Liability':
        return liabilityOptions;
      case 'Equity':
        return equityOptions;
      case 'Revenue':
        return revenueOptions;
      case 'Cost':
        return costOptions;
      case 'Expense':
        return expenseOptions;
      case 'Income':
        return incomeOptions;
      case 'OtherComprehensiveIncome':
        return otherComprehensiveIncomeOptions;
      default:
        return [];
    }
  };

  useEffect(() => {
    if (fromAccount && toAccount) {
      onRangeSelected(fromAccount, toAccount);
    }
  }, [fromAccount, toAccount, onRangeSelected]);

  return (
    <div className="flex w-full space-x-4">
      {/* Info: (20241015 - Anna) From 篩選 */}
      <div className="flex w-1/2 items-center">
        <span className="mr-2 mt-2 text-sm text-neutral-600">{t('common:COMMON.FROM')}</span>
        <SelectFilter
          label="NONE"
          options={[
            'Asset',
            'Liability',
            'Equity',
            'Revenue',
            'Cost',
            'Expense',
            'Income',
            'OtherComprehensiveIncome',
          ]}
          selectedValue={fromCategory}
          onChange={(value) =>
            setFromCategory(
              value as
                | 'Asset'
                | 'Liability'
                | 'Equity'
                | 'Revenue'
                | 'Cost'
                | 'Expense'
                | 'Income'
                | 'OtherComprehensiveIncome'
            )}
          className="rounded-r-none border-r-0" // Info: (20241015 - Anna) 移除右側圓角
        />
        <SelectFilter
          label="NONE"
          options={getOptionsByCategory(fromCategory)}
          selectedValue={fromAccount}
          onChange={(value) => setFromAccount(value)}
          containerClassName="grow"
          className="rounded-l-none" // Info: (20241015 - Anna) 移除左側圓角
        />
      </div>

      {/* Info: (20241015 - Anna) To 篩選 */}
      <div className="flex w-1/2 items-center">
        <span className="mr-2 mt-2 text-sm text-neutral-600">{t('common:COMMON.TO')}</span>
        <SelectFilter
          label="NONE"
          options={[
            'Asset',
            'Liability',
            'Equity',
            'Revenue',
            'Cost',
            'Expense',
            'Income',
            'OtherComprehensiveIncome',
          ]}
          selectedValue={toCategory}
          onChange={(value) =>
            setToCategory(
              value as
                | 'Asset'
                | 'Liability'
                | 'Equity'
                | 'Revenue'
                | 'Cost'
                | 'Expense'
                | 'Income'
                | 'OtherComprehensiveIncome'
            )}
          className="rounded-r-none border-r-0" // Info: (20241015 - Anna) 移除右側圓角
        />
        <SelectFilter
          label="NONE"
          options={getOptionsByCategory(toCategory)}
          selectedValue={toAccount}
          onChange={(value) => setToAccount(value)}
          containerClassName="grow"
          className="rounded-l-none" // Info: (20241015 - Anna) 移除左側圓角
        />
      </div>
    </div>
  );
};

export default AccountRangeFilter;
