import Image from 'next/image';
import { BsGraphUpArrow, BsGraphDownArrow } from 'react-icons/bs';
import { useTranslation } from 'next-i18next';

const ProjectValueBlock = () => {
  const { t } = useTranslation(['common', 'project']);
  // ToDo: (20240612 - Julian) [Beta] replace with actual data
  const totalValue = 187000;
  const apy = 1.5;
  const totalRevenue = 10000;
  const thirtyDaysRevenue = 0.5;
  const totalExpenses = 5000;
  const thirtyDaysExpenses = 0.3;
  const netProfit = totalRevenue - totalExpenses;
  const thirtyDaysNetProfit = thirtyDaysRevenue - thirtyDaysExpenses;

  const displayApy =
    apy > 0 ? (
      <div className="flex items-center gap-x-10px">
        <BsGraphUpArrow size={20} className="text-surface-state-error" />
        <p className="text-text-state-error">
          {apy}%{' '}
          <span className="ml-8px text-text-neutral-secondary">
            {t('project:PROJECT.THAN_LAST_YEAR')}
          </span>
        </p>
      </div>
    ) : (
      <div className="flex items-center gap-x-10px">
        <BsGraphDownArrow size={20} className="text-surface-state-success" />
        <p className="text-text-state-success">
          {apy}%{' '}
          <span className="ml-8px text-text-neutral-secondary">
            {t('project:PROJECT.THAN_LAST_YEAR')}
          </span>
        </p>
      </div>
    );

  const displayRevenueIcon =
    thirtyDaysRevenue > 0 ? <BsGraphUpArrow size={20} /> : <BsGraphDownArrow size={20} />;
  const displayExpensesIcon =
    thirtyDaysExpenses > 0 ? <BsGraphUpArrow size={20} /> : <BsGraphDownArrow size={20} />;
  const displayNetProfitIcon =
    thirtyDaysNetProfit > 0 ? <BsGraphUpArrow size={20} /> : <BsGraphDownArrow size={20} />;

  return (
    <div className="flex h-full flex-col gap-y-24px rounded-lg bg-surface-neutral-surface-lv2 p-20px font-medium">
      <div className="flex flex-col items-center justify-between gap-16px md:flex-row">
        {/* Info: (20240612 - Julian) Title */}
        <div className="flex items-center gap-x-8px text-base text-text-neutral-secondary">
          <Image src="/icons/value.svg" width={24} height={24} alt="value_icon" />
          <p>{t('project:PROJECT.PROJECT_VALUE')}</p>
        </div>
        {/* Info: (20240612 - Julian) Total Value */}
        <p className="text-2xl font-bold text-text-neutral-primary">
          {totalValue}
          <span className="ml-8px text-base font-medium text-text-neutral-secondary">
            {t('common:COMMON.TWD')}
          </span>
        </p>
        {/* Info: (20240612 - Julian) APY */}
        {displayApy}
      </div>
      <div className="grid grid-cols-1 items-center gap-16px md:grid-cols-3">
        {/* Info: (20240612 - Julian) Revenue */}
        <div className="flex flex-col gap-y-24px rounded-lg bg-surface-support-soft-green px-20px py-16px">
          <div className="flex items-center gap-x-8px">
            <Image src="/icons/income.svg" width={46} height={46} alt="revenue_icon" />
            <p className="font-semibold text-text-brand-secondary-solid">
              {t('project:PROJECT.TOTAL_REVENUE')}
            </p>
          </div>
          <div className="mx-auto flex items-end gap-x-8px">
            <p className="text-5xl">{totalRevenue}</p>
            <p>{t('common:COMMON.TWD')}</p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-x-8px">
              {displayRevenueIcon}
              <p className="font-semibold">{thirtyDaysRevenue} %</p>
            </div>
            <p>{t('project:PROJECT.IN_30_DAYS')}</p>
          </div>
        </div>
        {/* Info: (20240612 - Julian) Expenses */}
        <div className="flex flex-col gap-y-24px rounded-lg bg-surface-support-soft-rose px-20px py-16px">
          <div className="flex items-center gap-x-8px">
            <Image src="/icons/expend.svg" width={46} height={46} alt="expenses_icon" />
            <p className="font-semibold text-text-brand-secondary-solid">
              {t('project:PROJECT.TOTAL_EXPENSES')}
            </p>
          </div>
          <div className="mx-auto flex items-end gap-x-8px">
            <p className="text-5xl">{totalExpenses}</p>
            <p>{t('common:COMMON.TWD')}</p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-x-8px">
              {displayExpensesIcon}
              <p className="font-semibold">{thirtyDaysExpenses} %</p>
            </div>
            <p>{t('project:PROJECT.IN_30_DAYS')}</p>
          </div>
        </div>
        {/* Info: (20240612 - Julian) Net Profit */}
        <div className="flex flex-col gap-y-24px rounded-lg bg-surface-support-soft-indigo px-20px py-16px">
          <div className="flex items-center gap-x-8px">
            <Image src="/icons/net_profit.svg" width={46} height={46} alt="expenses_icon" />
            <p className="font-semibold text-text-brand-secondary-solid">
              {t('project:PROJECT.NET_PROFIT')}
            </p>
          </div>
          <div className="mx-auto flex items-end gap-x-8px">
            <p className="text-5xl">{netProfit}</p>
            <p>{t('common:COMMON.TWD')}</p>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-x-8px">
              {displayNetProfitIcon}
              <p className="font-semibold">{thirtyDaysNetProfit} %</p>
            </div>
            <p>{t('project:PROJECT.IN_30_DAYS')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProjectValueBlock;
