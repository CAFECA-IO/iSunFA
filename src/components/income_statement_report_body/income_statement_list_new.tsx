import { SkeletonList } from '@/components/skeleton/skeleton';
import { APIName } from '@/constants/api_connection';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { useUserCtx } from '@/contexts/user_context';
import { FinancialReport, IncomeStatementOtherInfo } from '@/interfaces/report';
import APIHandler from '@/lib/utils/api_handler';
import Image from 'next/image';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import CollapseButton from '@/components/button/collapse_button';
import { FinancialReportTypesKey } from '@/interfaces/report_type';
import IncomeStatementReportTableRow from '@/components/income_statement_report_body/income_statement_report_table_row';
import { numberBeDashIfFalsy } from '@/lib/utils/common';
import { IDatePeriod } from '@/interfaces/date_period';

interface IncomeStatementListProps {
  selectedDateRange: IDatePeriod | null; // Info: (20241024 - Anna) 接收來自上層的日期範圍
}

const IncomeStatementList: React.FC<IncomeStatementListProps> = ({ selectedDateRange }) => {
  // Info: (20241024 - Anna) 接收 selectedDateRange prop
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false); // Info: (20241024 - Anna) 新增追蹤 API 是否成功請求
  const prevSelectedDateRange = useRef<IDatePeriod | null>(null); // Info: (20241024 - Anna) 新增 useRef 追蹤之前的日期範圍
  const { isAuthLoading, selectedCompany } = useUserCtx();
  // Info: (20241001 - Anna) 管理表格摺疊狀態
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  const [isDetailCollapsed, setIsDetailCollapsed] = useState(false);
  // Info: (20241001 - Anna) 切換摺疊狀態
  const toggleSummaryTable = () => {
    setIsSummaryCollapsed(!isSummaryCollapsed);
  };

  const toggleDetailTable = () => {
    setIsDetailCollapsed(!isDetailCollapsed);
  };
  const hasCompanyId = isAuthLoading === false && !!selectedCompany?.id;
  const {
    data: reportFinancial,
    code: getReportFinancialCode,
    success: getReportFinancialSuccess,
    isLoading: getReportFinancialIsLoading,
    trigger,
  } = APIHandler<FinancialReport>(APIName.REPORT_GET_V2);
  // Info: (20241024 - Anna) 新增 API 請求處理邏輯，使用 useCallback 包裝
  const getIncomeStatementReport = useCallback(async () => {
    if (!hasCompanyId || !selectedDateRange || selectedDateRange.endTimeStamp === 0) {
      return;
    }

    if (
      prevSelectedDateRange.current &&
      prevSelectedDateRange.current.startTimeStamp === selectedDateRange.startTimeStamp &&
      prevSelectedDateRange.current.endTimeStamp === selectedDateRange.endTimeStamp &&
      hasFetchedOnce
    ) {
      return;
    }
    try {
      const response = await trigger({
        params: {
          companyId: selectedCompany?.id,
        },
        query: {
          startDate: selectedDateRange.startTimeStamp,
          endDate: selectedDateRange.endTimeStamp,
          language: 'en',
          reportType: FinancialReportTypesKey.comprehensive_income_statement,
        },
      });

      if (response.success) {
        setHasFetchedOnce(true); // Info: (20241024 - Anna) 設定已成功請求過 API
        prevSelectedDateRange.current = selectedDateRange; // Info: (20241024 - Anna) 更新日期範圍
      }
    } catch (error) {
      (() => {})(); // Info: (20241024 - Anna) Empty function, does nothing
    }
  }, [hasCompanyId, selectedCompany?.id, selectedDateRange, trigger]);

  // Info: (20241024 - Anna) 新增 useEffect，依賴 selectedDateRange 變化時觸發 API 請求
  useEffect(() => {
    if (!selectedDateRange) return;
    getIncomeStatementReport();
  }, [getIncomeStatementReport, selectedDateRange]);

  // Info: (20241024 - Anna) 如果未選擇日期範圍，顯示初始提示圖
  if (!hasFetchedOnce && !getReportFinancialIsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Image src="/elements/empty.png" alt="No data image" width={120} height={135} />
      </div>
    );
  } else if (getReportFinancialIsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
        <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
      </div>
    );
  } else if (
    !getReportFinancialSuccess ||
    !reportFinancial ||
    !Object.prototype.hasOwnProperty.call(reportFinancial, 'otherInfo') ||
    !reportFinancial.otherInfo ||
    !Object.prototype.hasOwnProperty.call(reportFinancial.otherInfo, 'revenueAndExpenseRatio') ||
    !Object.prototype.hasOwnProperty.call(reportFinancial.otherInfo, 'revenueToRD')
  ) {
    return <div>錯誤 {getReportFinancialCode}</div>;
  }

  const otherInfo = reportFinancial?.otherInfo as IncomeStatementOtherInfo;

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

  /* Info: (20240730 - Anna) 轉換和格式化日期 */
  const curDateFrom = new Date(reportFinancial.curDate.from * 1000);
  const curDateTo = new Date(reportFinancial.curDate.to * 1000);
  const preDateFrom = new Date(reportFinancial.preDate.from * 1000);
  const preDateTo = new Date(reportFinancial.preDate.to * 1000);
  const formattedCurFromDate = format(curDateFrom, 'yyyy-MM-dd');
  const formattedCurToDate = format(curDateTo, 'yyyy-MM-dd');
  const formattedPreFromDate = format(preDateFrom, 'yyyy-MM-dd');
  const formattedPreToDate = format(preDateTo, 'yyyy-MM-dd');

  const ItemSummary = (
    <div id="1" className="relative overflow-hidden">
      {/* Info: (20240723 - Anna) watermark logo */}
      <div className="relative right-0 top-16 z-0">
        <Image
          className="absolute right-0 top-0"
          src="/logo/watermark_logo.svg"
          alt="isunfa logo"
          width={400}
          height={300}
        />
      </div>

      <section className="text-text-neutral-secondary">
        <div className="relative z-1 mb-16px flex justify-between font-semibold text-surface-brand-secondary">
          <div className="flex items-center">
            <p className="text-xs font-bold leading-5">項目彙總格式</p>
            <CollapseButton onClick={toggleSummaryTable} isCollapsed={isSummaryCollapsed} />
          </div>
          <p className="text-xs font-bold leading-5">單位：新台幣元 每股盈餘單位：新台幣元</p>
        </div>
        {!isSummaryCollapsed && (
          <table className="relative z-1 w-full border-collapse bg-white">
            <thead>
              <tr>
                <th className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-xs font-semibold">
                  代號
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-xs font-semibold">
                  會計項目
                </th>
                <th className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-xs font-semibold">
                  {!isSummaryCollapsed && reportFinancial && reportFinancial.company && (
                    <p className="text-center font-barlow text-xs font-semibold leading-5">
                      {formattedCurFromDate}至{formattedCurToDate}
                    </p>
                  )}
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-xs font-semibold">
                  %
                </th>
                <th
                  className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-xs font-semibold"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {reportFinancial && reportFinancial.company && (
                    <p className="text-center font-barlow text-xs font-semibold leading-5">
                      {formattedPreFromDate}至{formattedPreToDate}
                    </p>
                  )}
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-xs font-semibold">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {reportFinancial &&
                reportFinancial.general &&
                reportFinancial.general
                  .slice(0, 10)
                  .map((value) => <IncomeStatementReportTableRow {...value} />)}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
  const ItemDetail = (
    <div id="2" className="relative overflow-hidden">
      <section className="text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <div className="flex items-center">
            <p className="text-xs font-bold leading-5">細項分類格式</p>
            <CollapseButton onClick={toggleDetailTable} isCollapsed={isDetailCollapsed} />
          </div>
          <p className="text-xs font-bold leading-5">單位：新台幣元 每股盈餘單位：新台幣元</p>
        </div>
        {!isDetailCollapsed && (
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-xs font-semibold">
                  代號
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-xs font-semibold">
                  會計項目
                </th>
                <th
                  className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-xs font-semibold"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {!isDetailCollapsed && reportFinancial && reportFinancial.company && (
                    <p className="text-center font-barlow text-xs font-semibold leading-5">
                      {formattedCurFromDate}至{formattedCurToDate}
                    </p>
                  )}
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-xs font-semibold">
                  %
                </th>
                <th
                  className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-xs font-semibold"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {reportFinancial && reportFinancial.company && (
                    <p className="text-center font-barlow text-xs font-semibold leading-5">
                      {formattedPreFromDate}至{formattedPreToDate}
                    </p>
                  )}
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-xs font-semibold">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {reportFinancial &&
                reportFinancial.details &&
                reportFinancial.details
                  .slice(0, 15)
                  .map((value) => <IncomeStatementReportTableRow {...value} />)}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
  const CostRevRatio = (
    <div id="3" className="relative overflow-hidden">
      <section className="relative text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p className="text-xs font-bold leading-5">投入費用和成本，與收入的倍數關係</p>
          <p className="text-xs font-bold leading-5">單位：新台幣元</p>
        </div>
        <table className="relative z-10 w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-xs font-semibold">
                代號
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-xs font-semibold">
                會計項目
              </th>
              <th
                className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-xs font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="whitespace-nowrap text-center font-barlow text-xs font-semibold leading-5">
                    {formattedCurFromDate}至{formattedCurToDate}
                  </p>
                )}
              </th>
              <th
                className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-xs font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="whitespace-nowrap text-center font-barlow text-xs font-semibold leading-5">
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
              <td className="border border-stroke-brand-secondary-soft p-10px text-xs">&nbsp;</td>
              <td className="border border-stroke-brand-secondary-soft p-10px text-xs">&nbsp;</td>
              <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
                &nbsp;
              </td>
              <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
                &nbsp;
              </td>
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
        {reportFinancial && reportFinancial.company && (
          <p className="mt-4 text-xs">
            {formattedCurFromDate}至{formattedCurToDate}
            營業收入，為投入費用和成本的{curRatio.toFixed(2)}倍
          </p>
        )}
        {reportFinancial && reportFinancial.company && (
          <p className="mt-4 text-xs">
            {formattedPreFromDate}至{formattedPreToDate}
            營業收入，為投入費用和成本的{preRatio.toFixed(2)}倍
          </p>
        )}
        <div className="mb-4 mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p className="text-xs font-bold leading-5">收入提撥至研發費用比例</p>
          <p className="text-xs font-bold leading-5">單位：新台幣元</p>
        </div>
        <table className="relative z-10 mb-75px w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-xs font-semibold">
                代號
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-xs font-semibold">
                會計項目
              </th>
              <th
                className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-xs font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="whitespace-nowrap text-center font-barlow text-xs font-semibold leading-5">
                    {formattedCurFromDate}至{formattedCurToDate}
                  </p>
                )}
              </th>
              <th
                className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-xs font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="whitespace-nowrap text-center font-barlow text-xs font-semibold leading-5">
                    {formattedPreFromDate}至{formattedPreToDate}
                  </p>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {revenueToRD && (
              <>
                {' '}
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
                    {' '}
                    {/* Info: (20240724 - Anna) 保留兩位小數 */}
                    {revenueToRD.ratio.curRatio.toFixed(2)}%
                  </td>
                  <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
                    {' '}
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

  return (
    <div className="mx-auto w-full origin-top overflow-x-auto">
      {ItemSummary}
      <hr className="break-before-page" />
      {ItemDetail}
      <hr className="break-before-page" />
      {CostRevRatio}
    </div>
  );
};

export default IncomeStatementList;
