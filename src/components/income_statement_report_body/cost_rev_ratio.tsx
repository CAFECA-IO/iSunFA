import Image from 'next/image';
import { numberBeDashIfFalsyWithoutCommas } from '@/lib/utils/common';
import { FinancialReport, IncomeStatementOtherInfo } from '@/interfaces/report';
import { useTranslation } from 'next-i18next';
import { useCurrencyCtx } from '@/contexts/currency_context';
import { DecimalOperations } from '@/lib/utils/decimal_operations';

interface CostRevRatioProps {
  financialReport: FinancialReport;
  formattedCurFromDate: string;
  formattedCurToDate: string;
  formattedPreFromDate: string;
  formattedPreToDate: string;
  isPrint?: boolean;
}
const CostRevRatio = ({
  financialReport,
  formattedCurFromDate,
  formattedCurToDate,
  formattedPreFromDate,
  formattedPreToDate,
  isPrint,
}: CostRevRatioProps) => {
  const { t } = useTranslation(['reports']);
  const { currency } = useCurrencyCtx();
  const otherInfo = financialReport?.otherInfo as IncomeStatementOtherInfo;

  /* Info: (20240730 - Anna) 計算 totalCost 和 salesExpense 的 curPeriodAmount 和 prePeriodAmount 的總和 */
  const curPeriodTotal = numberBeDashIfFalsyWithoutCommas(
    parseFloat(DecimalOperations.add(
      DecimalOperations.add(
        otherInfo?.revenueAndExpenseRatio.totalCost?.curPeriodAmount || '0',
        otherInfo?.revenueAndExpenseRatio.salesExpense?.curPeriodAmount || '0'
      ),
      otherInfo?.revenueAndExpenseRatio.administrativeExpense?.curPeriodAmount || '0'
    ))
  ); // Info: (20241021 - Murky) @Anna, add administrativeExpense

  const prePeriodTotal = numberBeDashIfFalsyWithoutCommas(
    parseFloat(DecimalOperations.add(
      DecimalOperations.add(
        otherInfo?.revenueAndExpenseRatio.totalCost?.prePeriodAmount || '0',
        otherInfo?.revenueAndExpenseRatio.salesExpense?.prePeriodAmount || '0'
      ),
      otherInfo?.revenueAndExpenseRatio.administrativeExpense?.prePeriodAmount || '0'
    ))
  ); // Info: (20241021 - Murky) @Anna, add administrativeExpense
  /* Info: (20240730 - Anna) 提取 curRatio 、 preRatio 、revenueToRD */
  const curRatio = otherInfo?.revenueAndExpenseRatio.ratio.curRatio || 0;
  const preRatio = otherInfo?.revenueAndExpenseRatio.ratio.preRatio || 0;
  const revenueToRD = otherInfo?.revenueToRD;

  return (
    <div id="3" className="relative overflow-hidden">
      <section className="relative text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p className="w-130px font-bold leading-5 xs:w-auto">
            {t('reports:REPORTS.RELATIONSHIP_BETWEEN_EXPENSES_COSTS_REVENUE')}
          </p>
          <p className="flex items-center text-xs font-semibold leading-5">
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {currency}
          </p>
        </div>
        <div className="hide-scrollbar overflow-x-auto">
          <div className="min-w-900px">
            <table className="relative z-10 w-full border-collapse bg-white">
              <thead>
                <tr>
                  <th
                    className={`w-1/12 whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold`}
                  >
                    {t('reports:REPORTS.CODE_NUMBER')}
                  </th>
                  <th className="w-5/12 border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold">
                    {t('reports:REPORTS.ACCOUNTING_ITEMS')}
                  </th>
                  <th
                    className="w-3/12 border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end font-semibold"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {financialReport && financialReport.company && (
                      <p className="whitespace-nowrap text-center font-barlow text-sm font-semibold leading-5">
                        {formattedCurFromDate} {t('reports:COMMON.TO')} {formattedCurToDate}
                      </p>
                    )}
                  </th>
                  <th
                    className="w-3/12 border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end font-semibold"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {financialReport && financialReport.company && (
                      <p className="whitespace-nowrap text-center font-barlow text-sm font-semibold leading-5">
                        {formattedPreFromDate} {t('reports:COMMON.TO')} {formattedPreToDate}
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
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px`}
                      >
                        {otherInfo.revenueAndExpenseRatio.revenue.code}
                      </td>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px`}
                      >
                        {t(
                          `reports:ACCOUNTING_ACCOUNT.${otherInfo.revenueAndExpenseRatio.revenue.name}`
                        )}
                      </td>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px text-end`}
                      >
                        {otherInfo.revenueAndExpenseRatio.revenue.curPeriodAmountString}
                      </td>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px text-end`}
                      >
                        {otherInfo.revenueAndExpenseRatio.revenue.prePeriodAmountString}
                      </td>
                    </tr>
                  )}
              </tbody>
              <tbody>
                <tr>
                  <td
                    className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px`}
                  >
                    &nbsp;
                  </td>
                  <td
                    className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px`}
                  >
                    &nbsp;
                  </td>
                  <td
                    className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px text-end`}
                  >
                    &nbsp;
                  </td>
                  <td
                    className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px text-end`}
                  >
                    &nbsp;
                  </td>
                </tr>
              </tbody>
              <tbody>
                {otherInfo &&
                  otherInfo.revenueAndExpenseRatio &&
                  otherInfo.revenueAndExpenseRatio.totalCost && (
                    <tr key={otherInfo.revenueAndExpenseRatio.totalCost.code}>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px`}
                      >
                        {otherInfo.revenueAndExpenseRatio.totalCost.code}
                      </td>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px`}
                      >
                        {t(
                          `reports:ACCOUNTING_ACCOUNT.${otherInfo.revenueAndExpenseRatio.totalCost.name}`
                        )}
                      </td>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px text-end`}
                      >
                        {otherInfo.revenueAndExpenseRatio.totalCost.curPeriodAmountString}
                      </td>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px text-end`}
                      >
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
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px`}
                      >
                        {otherInfo.revenueAndExpenseRatio.salesExpense.code}
                      </td>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px`}
                      >
                        {t(
                          `reports:ACCOUNTING_ACCOUNT.${otherInfo.revenueAndExpenseRatio.salesExpense.name}`
                        )}
                      </td>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px text-end`}
                      >
                        {otherInfo.revenueAndExpenseRatio.salesExpense.curPeriodAmountString}
                      </td>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px text-end`}
                      >
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
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px`}
                      >
                        {otherInfo.revenueAndExpenseRatio.administrativeExpense.code}
                      </td>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px`}
                      >
                        {t(
                          `reports:ACCOUNTING_ACCOUNT.${otherInfo.revenueAndExpenseRatio.administrativeExpense.name}`
                        )}
                      </td>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px text-end`}
                      >
                        {
                          otherInfo.revenueAndExpenseRatio.administrativeExpense
                            .curPeriodAmountString
                        }
                      </td>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px text-end`}
                      >
                        {
                          otherInfo.revenueAndExpenseRatio.administrativeExpense
                            .prePeriodAmountString
                        }
                      </td>
                    </tr>
                  )}
              </tbody>
              <tbody>
                <tr className="font-semibold">
                  <td
                    className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px text-end`}
                  >
                    &nbsp;
                  </td>
                  <td
                    className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px text-start`}
                  >
                    {t(`reports:REPORTS.TOTAL_EXPENSES_AND_COSTS`)}
                  </td>
                  <td
                    className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px text-end`}
                  >
                    {curPeriodTotal}
                  </td>
                  <td
                    className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px text-end`}
                  >
                    {prePeriodTotal}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {financialReport && financialReport.company && (
          <p className={`${isPrint ? 'text-xs' : 'text-sm'} mt-4 w-240px sm:w-auto`}>
            <span>
              {formattedCurFromDate} {t('reports:COMMON.TO')} {formattedCurToDate}
            </span>
            <span className="ml-2">
              {t('reports:REPORTS.REVENUE_RATIO', { ratio: parseFloat(curRatio.toString()).toFixed(2) })}
            </span>
          </p>
        )}
        {financialReport && financialReport.company && (
          <p className={`${isPrint ? 'text-xs' : 'text-sm'} mt-4 w-240px sm:w-auto`}>
            <span>
              {formattedPreFromDate} {t('reports:COMMON.TO')} {formattedPreToDate}
            </span>
            <span className="ml-2">
              {t('reports:REPORTS.REVENUE_RATIO', { ratio: parseFloat(preRatio.toString()).toFixed(2) })}
            </span>
          </p>
        )}
        <div className="mb-4 mt-32px flex items-center justify-between font-semibold text-surface-brand-secondary">
          <p className="w-120px font-bold leading-5 iphonese:w-auto">
            {t('reports:REPORTS.REVENUE_TO_RD')}
          </p>
          <p className="text-xs font-semibold leading-5">
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {currency}
          </p>
        </div>
        <div className="hide-scrollbar overflow-x-auto">
          <div className="min-w-900px">
            <table className="relative z-10 mb-75px w-full border-collapse bg-white">
              <thead>
                <tr>
                  <th className="w-1/12 whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold">
                    {t('reports:REPORTS.CODE_NUMBER')}
                  </th>
                  <th className="w-5/12 border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold">
                    {t('reports:REPORTS.ACCOUNTING_ITEMS')}
                  </th>
                  <th
                    className="w-3/12 border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end font-semibold"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {financialReport && financialReport.company && (
                      <p className="whitespace-nowrap text-center font-barlow text-sm font-semibold leading-5">
                        {formattedCurFromDate} {t('reports:COMMON.TO')} {formattedCurToDate}
                      </p>
                    )}
                  </th>
                  <th
                    className="w-3/12 border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end font-semibold"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {financialReport && financialReport.company && (
                      <p className="whitespace-nowrap text-center font-barlow text-sm font-semibold leading-5">
                        {formattedPreFromDate} {t('reports:COMMON.TO')} {formattedPreToDate}
                      </p>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {revenueToRD && (
                  <>
                    <tr key={revenueToRD.revenue.code}>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px`}
                      >
                        {revenueToRD.revenue.code}
                      </td>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px`}
                      >
                        {t(`reports:ACCOUNTING_ACCOUNT.${revenueToRD.revenue.name}`)}
                      </td>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px text-end`}
                      >
                        {revenueToRD.revenue.curPeriodAmountString}
                      </td>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px text-end`}
                      >
                        {revenueToRD.revenue.prePeriodAmountString}
                      </td>
                    </tr>
                    <tr key={revenueToRD.researchAndDevelopmentExpense.code}>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px`}
                      >
                        {revenueToRD.researchAndDevelopmentExpense.code}
                      </td>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px`}
                      >
                        {t(
                          `reports:ACCOUNTING_ACCOUNT.${revenueToRD.researchAndDevelopmentExpense.name}`
                        )}
                      </td>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px text-end`}
                      >
                        {revenueToRD.researchAndDevelopmentExpense.curPeriodAmountString}
                      </td>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px text-end`}
                      >
                        {revenueToRD.researchAndDevelopmentExpense.prePeriodAmountString}
                      </td>
                    </tr>
                    <tr className="font-semibold">
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px text-end`}
                      >
                        &nbsp;
                      </td>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px text-start`}
                      >
                        {t('reports:REPORTS.REVENUE_TO_RD')}
                      </td>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px text-end`}
                      >
                        {/* Info: (20240724 - Anna) 保留兩位小數 */}
                        {parseFloat(revenueToRD.ratio.curRatio.toString()).toFixed(2)}%
                      </td>
                      <td
                        className={`${isPrint ? 'text-xs' : 'text-sm'} border border-stroke-neutral-quaternary p-10px text-end`}
                      >
                        {parseFloat(revenueToRD.ratio.preRatio.toString()).toFixed(2)}%
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

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
