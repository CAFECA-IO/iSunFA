// Info: (20241204 - Liz) 沒用到
import { FinancialReportItem } from '@/interfaces/report';
import { numberBeDashIfFalsyWithoutCommas } from '@/lib/utils/common';

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
  const displayCurPeriodAmount: string = isCodeExist ? numberBeDashIfFalsyWithoutCommas(curPeriodAmount) : '';
  const displayCurPeriodPercentage: string = isCodeExist
    ? numberBeDashIfFalsyWithoutCommas(curPeriodPercentage)
    : '';
  const displayPrePeriodAmount: string = isCodeExist ? numberBeDashIfFalsyWithoutCommas(prePeriodAmount) : '';
  const displayPrePeriodPercentage: string = isCodeExist
    ? numberBeDashIfFalsyWithoutCommas(prePeriodPercentage)
    : '';

  return (
    <tr key={key} className="h-40px" data-key={key} data-is-tr="true">
      <td className="w-77px border border-stroke-neutral-quaternary p-10px text-xs">
        {displayCode}
      </td>
      <td className="w-77px border border-stroke-neutral-quaternary p-10px text-xs">{name}</td>
      <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
        {displayCurPeriodAmount}
      </td>
      <td className="w-50px border border-stroke-neutral-quaternary p-10px text-center text-xs">
        {displayCurPeriodPercentage}
      </td>
      <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
        {displayPrePeriodAmount}
      </td>
      <td className="w-50px border border-stroke-neutral-quaternary p-10px text-center text-xs">
        {displayPrePeriodPercentage}
      </td>
    </tr>
  );
}

export default IncomeStatementReportTableRow;
