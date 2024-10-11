import { FinancialReportItem } from '@/interfaces/report';
import { numberBeDashIfFalsy } from '@/lib/utils/common';

function IncomeStatementReportTableRow({
  code,
  curPeriodAmount,
  curPeriodPercentage,
  prePeriodAmount,
  prePeriodPercentage,
  name,
}: FinancialReportItem) {
  /**
   * Info: (20241011 - Murky)
   * 將Income statement 當中沒有code 的欄位，呈現的數字變成空字串
   */
  const isCodeExist = code.length > 0;
  const idCode = isCodeExist ? code : Math.random().toString(36).slice(0, 4);
  const displayCode = isCodeExist ? code : '';
  const displayCurPeriodAmount: string = isCodeExist ? numberBeDashIfFalsy(curPeriodAmount) : '';
  const displayCurPeriodPercentage: string = isCodeExist
    ? numberBeDashIfFalsy(curPeriodPercentage)
    : '';
  const displayPrePeriodAmount: string = isCodeExist ? numberBeDashIfFalsy(prePeriodAmount) : '';
  const displayPrePeriodPercentage: string = isCodeExist
    ? numberBeDashIfFalsy(prePeriodPercentage)
    : '';

  return (
    <tr key={idCode} className="h-40px">
      <td className="border border-stroke-brand-secondary-soft p-10px text-xs">{displayCode}</td>
      <td className="w-177px border border-stroke-brand-secondary-soft p-10px text-xs">{name}</td>
      <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
        {displayCurPeriodAmount}
      </td>
      <td className="border border-stroke-brand-secondary-soft p-10px text-center text-xs">
        {displayCurPeriodPercentage}
      </td>
      <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
        {displayPrePeriodAmount}
      </td>
      <td className="border border-stroke-brand-secondary-soft p-10px text-center text-xs">
        {displayPrePeriodPercentage}
      </td>
    </tr>
  );
}

export default IncomeStatementReportTableRow;
