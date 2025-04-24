import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';
import { numberBeDashIfFalsy } from '@/lib/utils/common';
import { useTranslation } from 'next-i18next';

interface RowsProps {
  flattenAccounts: IAccountReadyForFrontend[];
  isPrint?: boolean;
}

const Rows = ({ flattenAccounts, isPrint }: RowsProps) => {
  const { t } = useTranslation(['reports']);

  // Info: (20250113 - Anna) 過濾掉重複的資料
  const uniqueAccounts = Array.from(
    new Map(
      flattenAccounts.map((account) => [
        `${account.accountId}_${account.code}_${account.name}`,
        account,
      ])
    ).values()
  );

  // 🔍 Debug: 印出所有渲染前的 account code
  // eslint-disable-next-line no-console
  console.log(
    '[Rows] 渲染用的 accounts:',
    uniqueAccounts.map((a) => a.code)
  );

  return (
    <>
      {/* Info: (20250113 - Anna) 渲染唯一的會計科目行，過濾掉重複的 */}
      {uniqueAccounts.map((account) => {
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

        // Info: (20250213 - Anna) 判斷是否四個欄位都是 "0" 或 "-"
        const isAllZeroOrDash =
          (displayCurPeriodAmount === '0' || displayCurPeriodAmount === '-') &&
          (displayCurPeriodPercentage === '0' || displayCurPeriodPercentage === '-') &&
          (displayPrePeriodAmount === '0' || displayPrePeriodAmount === '-') &&
          (displayPrePeriodPercentage === '0' || displayPrePeriodPercentage === '-');

        if (isAllZeroOrDash) {
          return null; // Info: (20250213 - Anna) 這一列不顯示
        }

        return (
          <tr className="h-40px bg-white" key={`${accountId}_${code}_${name}`}>
            <td
              className={`border border-stroke-neutral-quaternary p-10px ${isPrint ? 'text-xs' : 'text-sm'}`}
            >
              {displayCode}
            </td>
            <td
              className={`border border-stroke-neutral-quaternary p-10px ${isPrint ? 'text-xs' : 'text-sm'}`}
            >
              {t(`reports:ACCOUNTING_ACCOUNT.${name}`)}
            </td>
            <td
              className={`border border-stroke-neutral-quaternary p-10px text-end ${isPrint ? 'text-xs' : 'text-sm'}`}
            >
              {displayCurPeriodAmount}
            </td>
            <td
              className={`border border-stroke-neutral-quaternary p-10px text-center ${isPrint ? 'text-xs' : 'text-sm'}`}
            >
              {displayCurPeriodPercentage}
            </td>
            <td
              className={`border border-stroke-neutral-quaternary p-10px text-end ${isPrint ? 'text-xs' : 'text-sm'}`}
            >
              {displayPrePeriodAmount}
            </td>
            <td
              className={`border border-stroke-neutral-quaternary p-10px text-center ${isPrint ? 'text-xs' : 'text-sm'}`}
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
