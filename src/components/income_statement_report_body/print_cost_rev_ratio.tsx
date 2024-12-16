import Image from 'next/image';
import { numberBeDashIfFalsy } from '@/lib/utils/common';
import { FinancialReport, IncomeStatementOtherInfo } from '@/interfaces/report';
import { useTranslation } from 'next-i18next';

const NormalHeader = () => {
  return (
    <header className="relative h-105px">
      <div className="absolute left-0 top-0 mt-30px flex">
        <div className="h-10px w-170px bg-surface-brand-secondary"></div>
        <div className="h-10px w-35px bg-surface-brand-primary"></div>
      </div>
      <h1 className="absolute right-0 top-0 z-1 mr-20px mt-24px text-xl font-bold text-surface-brand-secondary-soft">
        Income Statement
      </h1>
      <div className="absolute right-0 top-0 z-1 mt-60px h-10px w-212px bg-surface-brand-primary"></div>
      <div className="absolute right-0 top-0 z-1 mt-74px h-5px w-160px bg-surface-brand-secondary"></div>
    </header>
  );
};

interface CostRevRatioProps {
  financialReport: FinancialReport;
  formattedCurFromDate: string;
  formattedCurToDate: string;
  formattedPreFromDate: string;
  formattedPreToDate: string;
  defaultPageNumber: number;
}
const PrintCostRevRatio = ({
  financialReport,
  formattedCurFromDate,
  formattedCurToDate,
  formattedPreFromDate,
  formattedPreToDate,
  defaultPageNumber,
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
    <div className="relative h-screen overflow-hidden">
      <NormalHeader />
      <section className="relative px-20px text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p className="text-xs font-bold leading-5">投入費用和成本，與收入的倍數關係</p>
          <p className="text-xs font-bold leading-5">單位：新台幣元</p>
        </div>
        <table className="relative z-10 w-full border-collapse bg-white text-xxs">
          <thead>
            <tr>
              <th className="w-40px border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
                {t('reports:TAX_REPORT.CODE_NUMBER')}
              </th>
              <th className="w-177px border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
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
                  <td className="border border-stroke-brand-secondary-soft p-10px text-xs">
                    {otherInfo.revenueAndExpenseRatio.revenue.code}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-xs">
                    {otherInfo.revenueAndExpenseRatio.revenue.name}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
                    {otherInfo.revenueAndExpenseRatio.revenue.curPeriodAmountString}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
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
                  <td className="border border-stroke-brand-secondary-soft p-10px text-xs">
                    {otherInfo.revenueAndExpenseRatio.totalCost.code}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-xs">
                    {otherInfo.revenueAndExpenseRatio.totalCost.name}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
                    {otherInfo.revenueAndExpenseRatio.totalCost.curPeriodAmountString}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
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
                  <td className="border border-stroke-brand-secondary-soft p-10px text-xs">
                    {otherInfo.revenueAndExpenseRatio.salesExpense.code}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-xs">
                    {otherInfo.revenueAndExpenseRatio.salesExpense.name}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
                    {otherInfo.revenueAndExpenseRatio.salesExpense.curPeriodAmountString}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
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
                  <td className="border border-stroke-brand-secondary-soft p-10px text-xs">
                    {otherInfo.revenueAndExpenseRatio.administrativeExpense.code}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-xs">
                    {otherInfo.revenueAndExpenseRatio.administrativeExpense.name}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
                    {otherInfo.revenueAndExpenseRatio.administrativeExpense.curPeriodAmountString}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
                    {otherInfo.revenueAndExpenseRatio.administrativeExpense.prePeriodAmountString}
                  </td>
                </tr>
              )}
          </tbody>
          <tbody>
            <tr className="font-semibold">
              <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
                &nbsp;
              </td>
              <td className="border border-stroke-brand-secondary-soft p-10px text-start text-xs">
                投入費用和成本合計
              </td>
              <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
                {curPeriodTotal}
              </td>
              <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
                {prePeriodTotal}
              </td>
            </tr>
          </tbody>
        </table>
        {financialReport && financialReport.company && (
          <p className="mt-4 text-xs">
            {formattedCurFromDate}至{formattedCurToDate}
            營業收入，為投入費用和成本的{curRatio.toFixed(2)}倍
          </p>
        )}
        {financialReport && financialReport.company && (
          <p className="mt-4 text-xs">
            {formattedPreFromDate}至{formattedPreToDate}
            營業收入，為投入費用和成本的{preRatio.toFixed(2)}倍
          </p>
        )}
        <div className="mb-4 mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p className="text-xs font-bold leading-5">收入提撥至研發費用比例</p>
          <p className="text-xs font-bold leading-5">單位：新台幣元</p>
        </div>
        <table className="relative z-10 mb-75px w-full border-collapse bg-white text-xxs">
          <thead>
            <tr>
              <th className="w-40px border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
                {t('reports:TAX_REPORT.CODE_NUMBER')}
              </th>
              <th className="w-177px border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
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
                  <td className="border border-stroke-brand-secondary-soft p-10px text-xs">
                    {revenueToRD.revenue.code}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-xs">
                    {revenueToRD.revenue.name}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
                    {revenueToRD.revenue.curPeriodAmountString}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
                    {revenueToRD.revenue.prePeriodAmountString}
                  </td>
                </tr>
                <tr key={revenueToRD.researchAndDevelopmentExpense.code}>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-xs">
                    {revenueToRD.researchAndDevelopmentExpense.code}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-xs">
                    {revenueToRD.researchAndDevelopmentExpense.name}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
                    {revenueToRD.researchAndDevelopmentExpense.curPeriodAmountString}
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
                    {revenueToRD.researchAndDevelopmentExpense.prePeriodAmountString}
                  </td>
                </tr>
                <tr className="font-semibold">
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
                    &nbsp;
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-start text-xs">
                    收入提撥至研發費用比例
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
                    {/* Info: (20240724 - Anna) 保留兩位小數 */}
                    {revenueToRD.ratio.curRatio.toFixed(2)}%
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
                    {revenueToRD.ratio.preRatio.toFixed(2)}%
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </section>

      <footer className="absolute bottom-0 left-0 right-0 z-1 flex items-center justify-between bg-surface-brand-secondary p-10px">
        <p className="text-xs text-white">{defaultPageNumber + 1}</p>
        <div className="text-base font-bold text-surface-brand-secondary">
          <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    </div>
  );
};

export default PrintCostRevRatio;
