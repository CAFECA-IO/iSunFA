import Image from 'next/image';
import { numberBeDashIfFalsy } from '@/lib/utils/common';
import { FinancialReport, IncomeStatementOtherInfo } from '@/interfaces/report';
import { useTranslation } from 'next-i18next';

interface CostRevRatioProps {
  financialReport: FinancialReport;
  formattedCurFromDate: string;
  formattedCurToDate: string;
  formattedPreFromDate: string;
  formattedPreToDate: string;
}
const CostRevRatio = ({
  financialReport,
  formattedCurFromDate,
  formattedCurToDate,
  formattedPreFromDate,
  formattedPreToDate,
}: CostRevRatioProps) => {
  const { t } = useTranslation(['reports']);
  const otherInfo = financialReport?.otherInfo as IncomeStatementOtherInfo;

  /* Info: (20240730 - Anna) 計算 totalCost 和 salesExpense 的 curPeriodAmount 和 prePeriodAmount 的總和 */
  const curPeriodTotal = numberBeDashIfFalsy(
    (otherInfo?.revenueAndExpenseRatio.totalCost?.curPeriodAmount || 0) +
      (otherInfo?.revenueAndExpenseRatio.salesExpense?.curPeriodAmount || 0) +
      (otherInfo?.revenueAndExpenseRatio.administrativeExpense?.curPeriodAmount || 0)
  ); // Info: (20241021 - Murky) @Anna, add administrativeExpense

  const prePeriodTotal = numberBeDashIfFalsy(
    (otherInfo?.revenueAndExpenseRatio.totalCost?.prePeriodAmount || 0) +
      (otherInfo?.revenueAndExpenseRatio.salesExpense?.prePeriodAmount || 0) +
      (otherInfo?.revenueAndExpenseRatio.administrativeExpense?.prePeriodAmount || 0)
  ); // Info: (20241021 - Murky) @Anna, add administrativeExpense
  /* Info: (20240730 - Anna) 提取 curRatio 、 preRatio 、revenueToRD */
  const curRatio = otherInfo?.revenueAndExpenseRatio.ratio.curRatio || 0;
  const preRatio = otherInfo?.revenueAndExpenseRatio.ratio.preRatio || 0;
  const revenueToRD = otherInfo?.revenueToRD;

  return (
    <div id="3" className="relative overflow-hidden">
      <section className="relative text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p className="font-bold leading-5">投入費用和成本，與收入的倍數關係</p>
          <p className="font-bold leading-5">單位：新台幣元</p>
        </div>
        <table className="relative z-10 w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
                {t('reports:TAX_REPORT.CODE_NUMBER')}
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
                {t('reports:REPORTS.ACCOUNTING_ITEMS')}
              </th>
              <th
                className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {financialReport && financialReport.company && (
                  <p className="whitespace-nowrap text-center font-barlow font-semibold leading-5">
                    {formattedCurFromDate}至{formattedCurToDate}
                  </p>
                )}
              </th>
              <th
                className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {financialReport && financialReport.company && (
                  <p className="whitespace-nowrap text-center font-barlow font-semibold leading-5">
                    {formattedPreFromDate} 至{formattedPreToDate}
                  </p>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {otherInfo &&
              otherInfo.revenueAndExpenseRatio &&
              otherInfo.revenueAndExpenseRatio.revenue && (
                <tr key={otherInfo.revenueAndExpenseRatio.revenue.code}>
                  <td className="border border-stroke-brand-secondary-soft p-10px">
                    {otherInfo.revenueAndExpenseRatio.revenue.code}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px">
                    {otherInfo.revenueAndExpenseRatio.revenue.name}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end">
                    {otherInfo.revenueAndExpenseRatio.revenue.curPeriodAmountString}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end">
                    {otherInfo.revenueAndExpenseRatio.revenue.prePeriodAmountString}
                  </td>
                </tr>
              )}
          </tbody>
          <tbody>
            <tr>
              <td className="border border-stroke-brand-secondary-soft p-10px">&nbsp;</td>
              <td className="border border-stroke-brand-secondary-soft p-10px">&nbsp;</td>
              <td className="border border-stroke-brand-secondary-soft p-10px text-end">&nbsp;</td>
              <td className="border border-stroke-brand-secondary-soft p-10px text-end">&nbsp;</td>
            </tr>
          </tbody>
          <tbody>
            {otherInfo &&
              otherInfo.revenueAndExpenseRatio &&
              otherInfo.revenueAndExpenseRatio.totalCost && (
                <tr key={otherInfo.revenueAndExpenseRatio.totalCost.code}>
                  <td className="border border-stroke-brand-secondary-soft p-10px">
                    {otherInfo.revenueAndExpenseRatio.totalCost.code}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px">
                    {otherInfo.revenueAndExpenseRatio.totalCost.name}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end">
                    {otherInfo.revenueAndExpenseRatio.totalCost.curPeriodAmountString}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end">
                    {otherInfo.revenueAndExpenseRatio.totalCost.prePeriodAmountString}
                  </td>
                </tr>
              )}
          </tbody>
          <tbody>
            {otherInfo &&
              otherInfo.revenueAndExpenseRatio &&
              otherInfo.revenueAndExpenseRatio.salesExpense && (
                <tr key={otherInfo.revenueAndExpenseRatio.salesExpense.code}>
                  <td className="border border-stroke-brand-secondary-soft p-10px">
                    {otherInfo.revenueAndExpenseRatio.salesExpense.code}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px">
                    {otherInfo.revenueAndExpenseRatio.salesExpense.name}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end">
                    {otherInfo.revenueAndExpenseRatio.salesExpense.curPeriodAmountString}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end">
                    {otherInfo.revenueAndExpenseRatio.salesExpense.prePeriodAmountString}
                  </td>
                </tr>
              )}
          </tbody>
          <tbody>
            {otherInfo &&
              otherInfo.revenueAndExpenseRatio &&
              otherInfo.revenueAndExpenseRatio.administrativeExpense && (
                <tr key={otherInfo.revenueAndExpenseRatio.administrativeExpense.code}>
                  <td className="border border-stroke-brand-secondary-soft p-10px">
                    {otherInfo.revenueAndExpenseRatio.administrativeExpense.code}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px">
                    {otherInfo.revenueAndExpenseRatio.administrativeExpense.name}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end">
                    {otherInfo.revenueAndExpenseRatio.administrativeExpense.curPeriodAmountString}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end">
                    {otherInfo.revenueAndExpenseRatio.administrativeExpense.prePeriodAmountString}
                  </td>
                </tr>
              )}
          </tbody>
          <tbody>
            <tr className="font-semibold">
              <td className="border border-stroke-brand-secondary-soft p-10px text-end">&nbsp;</td>
              <td className="border border-stroke-brand-secondary-soft p-10px text-start">
                投入費用和成本合計
              </td>
              <td className="border border-stroke-brand-secondary-soft p-10px text-end">
                {curPeriodTotal}
              </td>
              <td className="border border-stroke-brand-secondary-soft p-10px text-end">
                {prePeriodTotal}
              </td>
            </tr>
          </tbody>
        </table>
        {financialReport && financialReport.company && (
          <p className="mt-4">
            {formattedCurFromDate}至{formattedCurToDate}
            營業收入，為投入費用和成本的{curRatio.toFixed(2)}倍
          </p>
        )}
        {financialReport && financialReport.company && (
          <p className="mt-4">
            {formattedPreFromDate}至{formattedPreToDate}
            營業收入，為投入費用和成本的{preRatio.toFixed(2)}倍
          </p>
        )}
        <div className="mb-4 mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p className="font-bold leading-5">收入提撥至研發費用比例</p>
          <p className="font-bold leading-5">單位：新台幣元</p>
        </div>
        <table className="relative z-10 mb-75px w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
                {t('reports:TAX_REPORT.CODE_NUMBER')}
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
                {t('reports:REPORTS.ACCOUNTING_ITEMS')}
              </th>
              <th
                className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {financialReport && financialReport.company && (
                  <p className="whitespace-nowrap text-center font-barlow font-semibold leading-5">
                    {formattedCurFromDate}至{formattedCurToDate}
                  </p>
                )}
              </th>
              <th
                className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {financialReport && financialReport.company && (
                  <p className="whitespace-nowrap text-center font-barlow font-semibold leading-5">
                    {formattedPreFromDate}至{formattedPreToDate}
                  </p>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {revenueToRD && (
              <>
                <tr key={revenueToRD.revenue.code}>
                  <td className="border border-stroke-brand-secondary-soft p-10px">
                    {revenueToRD.revenue.code}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px">
                    {revenueToRD.revenue.name}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end">
                    {revenueToRD.revenue.curPeriodAmountString}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end">
                    {revenueToRD.revenue.prePeriodAmountString}
                  </td>
                </tr>
                <tr key={revenueToRD.researchAndDevelopmentExpense.code}>
                  <td className="border border-stroke-brand-secondary-soft p-10px">
                    {revenueToRD.researchAndDevelopmentExpense.code}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px">
                    {revenueToRD.researchAndDevelopmentExpense.name}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end">
                    {revenueToRD.researchAndDevelopmentExpense.curPeriodAmountString}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end">
                    {revenueToRD.researchAndDevelopmentExpense.prePeriodAmountString}
                  </td>
                </tr>
                <tr className="font-semibold">
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end">
                    &nbsp;
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-start">
                    收入提撥至研發費用比例
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end">
                    {/* Info: (20240724 - Anna) 保留兩位小數 */}
                    {revenueToRD.ratio.curRatio.toFixed(
                      2
                    )}%
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end">
                    {revenueToRD.ratio.preRatio.toFixed(2)}%
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
        {/* Info: (20240724 - Anna) watermark logo */}
        <div className="relative right-0 -z-10" style={{ top: '-350px' }}>
          <Image
            className="absolute right-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>
      </section>
    </div>
  );
};

export default CostRevRatio;
