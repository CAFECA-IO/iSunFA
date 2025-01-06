import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';
import { numberBeDashIfFalsy } from '@/lib/utils/common';
import { useTranslation } from 'next-i18next';

interface RowsProps {
  flattenAccounts: IAccountReadyForFrontend[];
  isPrint?: boolean;
}

const Rows = ({ flattenAccounts, isPrint }: RowsProps) => {
  const { t } = useTranslation(['reports']);
  return (
    <>
      {flattenAccounts.map((account) => {
        const {
          code,
          curPeriodAmount,
          curPeriodPercentage,
          prePeriodAmount,
          prePeriodPercentage,
          name,
          accountId,
        } = account;

        const isCodeExist = code.length > 0;
        const displayCode = isCodeExist ? code : '';
        const displayCurPeriodAmount: string = isCodeExist
          ? numberBeDashIfFalsy(curPeriodAmount)
          : '';
        const displayCurPeriodPercentage: string = isCodeExist
          ? numberBeDashIfFalsy(curPeriodPercentage)
          : '';
        const displayPrePeriodAmount: string = isCodeExist
          ? numberBeDashIfFalsy(prePeriodAmount)
          : '';
        const displayPrePeriodPercentage: string = isCodeExist
          ? numberBeDashIfFalsy(prePeriodPercentage)
          : '';

        return (
          <tr className="h-40px bg-white" key={`${accountId}_${code}_${name}`}>
            <td
              className={`border border-stroke-brand-secondary-soft p-10px ${isPrint ? 'text-xs' : 'text-sm'}`}
            >
              {displayCode}
            </td>
            <td
              className={`border border-stroke-brand-secondary-soft p-10px ${isPrint ? 'text-xs' : 'text-sm'}`}
            >
              {t(`reports:ACCOUNTING_ACCOUNT.${name}`)}
            </td>
            <td
              className={`border border-stroke-brand-secondary-soft p-10px text-end ${isPrint ? 'text-xs' : 'text-sm'}`}
            >
              {displayCurPeriodAmount}
            </td>
            <td
              className={`border border-stroke-brand-secondary-soft p-10px text-center ${isPrint ? 'text-xs' : 'text-sm'}`}
            >
              {displayCurPeriodPercentage}
            </td>
            <td
              className={`border border-stroke-brand-secondary-soft p-10px text-end ${isPrint ? 'text-xs' : 'text-sm'}`}
            >
              {displayPrePeriodAmount}
            </td>
            <td
              className={`border border-stroke-brand-secondary-soft p-10px text-center ${isPrint ? 'text-xs' : 'text-sm'}`}
            >
              {displayPrePeriodPercentage}
            </td>
          </tr>
        );
      })}
    </>
  );
};

export default Rows;
