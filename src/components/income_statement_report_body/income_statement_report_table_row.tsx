// Info: (20241204 - Liz) 沒用到
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
  // const idCode = isCodeExist ? code : Math.random().toString(36).slice(0, 4); // Deprecated: (20241130 - Liz) 這個方法會導致每次 render 都會重新產生一個新的 id，導致 react 會重新 render 整個 component，所以不建議使用
  const key = `${code}_${name}_${curPeriodAmount}_${curPeriodPercentage}_${prePeriodAmount}_${prePeriodPercentage}`;

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
    <tr key={key} className="h-40px" data-key={key} data-is-tr="true">
      <td className="w-77px border border-stroke-brand-secondary-soft p-10px text-sm">
        {displayCode}
      </td>
      <td className="w-77px border border-stroke-brand-secondary-soft p-10px text-sm">{name}</td>
      <td className="border border-stroke-brand-secondary-soft p-10px text-end text-sm">
        {displayCurPeriodAmount}
      </td>
      <td className="w-50px border border-stroke-brand-secondary-soft p-10px text-center text-sm">
        {displayCurPeriodPercentage}
      </td>
      <td className="border border-stroke-brand-secondary-soft p-10px text-end text-sm">
        {displayPrePeriodAmount}
      </td>
      <td className="w-50px border border-stroke-brand-secondary-soft p-10px text-center text-sm">
        {displayPrePeriodPercentage}
      </td>
    </tr>
  );
}

export default IncomeStatementReportTableRow;
