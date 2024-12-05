// Deprecated: (20241206 - Liz) This file is deprecated, we use income_statement_list.tsx instead.
import { SkeletonList } from '@/components/skeleton/skeleton';
import { APIName } from '@/constants/api_connection';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { useUserCtx } from '@/contexts/user_context';
import {
  FinancialReport,
  IncomeStatementOtherInfo,
  FinancialReportItem,
} from '@/interfaces/report';
import APIHandler from '@/lib/utils/api_handler';
import Image from 'next/image';
import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import CollapseButton from '@/components/button/collapse_button';
import { FinancialReportTypesKey } from '@/interfaces/report_type';
// import IncomeStatementReportTableRow from '@/components/income_statement_report_body/income_statement_report_table_row'; // Deprecated: (20241204 - Liz)
import { numberBeDashIfFalsy } from '@/lib/utils/common';
import { IDatePeriod } from '@/interfaces/date_period';
import { useTranslation } from 'next-i18next';
import PrintButton from '@/components/button/print_button';
import DownloadButton from '@/components/button/download_button';
import { useGlobalCtx } from '@/contexts/global_context';
import IncomeStatementA4Template from '@/components/income_statement_report_body/income_statement_a4_template';

// Info: (20241024 - Anna) 擴展 FinancialReportItem，新增 children 屬性
export interface FinancialReportItemWithChildren extends FinancialReportItem {
  children?: FinancialReportItemWithChildren[]; // 定義 children 屬性
}

interface FilterBarProps {
  printFn: () => void;
}
const FilterBar = ({ printFn }: FilterBarProps) => {
  const { exportVoucherModalVisibilityHandler } = useGlobalCtx();
  return (
    <div className="mb-16px flex items-center justify-between px-px max-md:flex-wrap print:hidden">
      <div className="ml-auto flex items-center gap-24px">
        <DownloadButton onClick={exportVoucherModalVisibilityHandler} disabled />
        <PrintButton onClick={printFn} disabled={false} />
      </div>
    </div>
  );
};

const NoData = () => {
  const { t } = useTranslation('reports');

  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <Image src="/elements/empty.png" alt="No data image" width={120} height={135} />
      <div>
        <p className="text-neutral-300">{t('reports:REPORT.NO_DATA_AVAILABLE')}</p>
        <p className="text-neutral-300">{t('reports:REPORT.PLEASE_SELECT_PERIOD')}</p>
      </div>
    </div>
  );
};

const Loading = () => {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
      <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
    </div>
  );
};
interface IncomeStatementListProps {
  selectedDateRange: IDatePeriod | null;
  isPrinting: boolean;
  printRef: React.RefObject<HTMLDivElement>;
  printFn: () => void;
}

const IncomeStatementList: React.FC<IncomeStatementListProps> = ({
  selectedDateRange,
  isPrinting,
  printRef,
  printFn,
}) => {
  // Deprecated: (20241205 - Liz)
  // eslint-disable-next-line no-console
  console.log('isPrinting:', isPrinting);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const prevSelectedDateRange = useRef<IDatePeriod | null>(null);
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

  const [isGetReportAPILoading, setIsGetReportAPILoading] = useState<boolean>(false);
  const [isGetReportAPISuccess, setIsGetReportAPISuccess] = useState<boolean>(false);
  const [reportAPICode, setReportAPICode] = useState<string>('');
  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);

  const { trigger: getReportAPI } = APIHandler<FinancialReport>(APIName.REPORT_GET_V2);

  useEffect(() => {
    if (!selectedDateRange) return;

    const getIncomeStatementReport = async () => {
      if (!hasCompanyId || !selectedDateRange || selectedDateRange.endTimeStamp === 0) return;
      if (
        prevSelectedDateRange.current &&
        prevSelectedDateRange.current.startTimeStamp === selectedDateRange.startTimeStamp &&
        prevSelectedDateRange.current.endTimeStamp === selectedDateRange.endTimeStamp &&
        hasFetchedOnce
      ) {
        return;
      }
      setIsGetReportAPILoading(true);

      try {
        const { success, data, code } = await getReportAPI({
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
        setIsGetReportAPISuccess(success);
        setReportAPICode(code);

        if (success && data) {
          setHasFetchedOnce(true); // Info: (20241024 - Anna) 設定已成功請求過 API
          prevSelectedDateRange.current = selectedDateRange; // Info: (20241024 - Anna) 更新日期範圍
          setFinancialReport(data);
          // Deprecated: (20241204 - Liz)
          // eslint-disable-next-line no-console
          console.log('IncomeStatementList received data:', data);
        }
      } catch (error) {
        // (() => {})(); // Info: (20241024 - Anna) Empty function, does nothing
        // Deprecated: (20241204 - Liz)
        // eslint-disable-next-line no-console
        console.log('Error:', error);
      } finally {
        setIsGetReportAPILoading(false);
      }
    };

    getIncomeStatementReport();
  }, [hasCompanyId, hasFetchedOnce, selectedCompany?.id, selectedDateRange]);

  if (!hasFetchedOnce && !isGetReportAPILoading) {
    return <NoData />;
  } else if (isGetReportAPILoading) {
    return <Loading />;
  } else if (
    !isGetReportAPISuccess ||
    !financialReport ||
    !Object.prototype.hasOwnProperty.call(financialReport, 'otherInfo') ||
    !financialReport.otherInfo ||
    !Object.prototype.hasOwnProperty.call(financialReport.otherInfo, 'revenueAndExpenseRatio') ||
    !Object.prototype.hasOwnProperty.call(financialReport.otherInfo, 'revenueToRD')
  ) {
    return <div>錯誤 {reportAPICode}</div>;
  }

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

  /* Info: (20240730 - Anna) 轉換和格式化日期 */
  const curDateFrom = new Date(financialReport.curDate.from * 1000);
  const curDateTo = new Date(financialReport.curDate.to * 1000);
  const preDateFrom = new Date(financialReport.preDate.from * 1000);
  const preDateTo = new Date(financialReport.preDate.to * 1000);
  const formattedCurFromDate = format(curDateFrom, 'yyyy-MM-dd');
  const formattedCurToDate = format(curDateTo, 'yyyy-MM-dd');
  const formattedPreFromDate = format(preDateFrom, 'yyyy-MM-dd');
  const formattedPreToDate = format(preDateTo, 'yyyy-MM-dd');

  //  Info: (20241202 - Anna) 如果 children 存在且不為空，則遞迴調用 renderRows
  const renderRows = (items: FinancialReportItemWithChildren[]): JSX.Element[] => {
    return items.flatMap((item) => {
      if (!item.code || !item.name) {
        // eslint-disable-next-line no-console
        console.warn('Skipped invalid item:', item);
        return [];
      }

      const {
        code,
        curPeriodAmount,
        curPeriodPercentage,
        prePeriodAmount,
        prePeriodPercentage,
        name,
      } = item;

      const key = `${code}_${name}_${curPeriodAmount}_${curPeriodPercentage}_${prePeriodAmount}_${prePeriodPercentage}`;
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

      return [
        <tr key={key} className="h-40px" data-key={key} data-is-tr="true">
          <td className="border border-stroke-brand-secondary-soft p-10px text-sm">
            {displayCode}
          </td>
          <td className="w-177px border border-stroke-brand-secondary-soft p-10px text-sm">
            {name}
          </td>
          <td className="border border-stroke-brand-secondary-soft p-10px text-end text-sm">
            {displayCurPeriodAmount}
          </td>
          <td className="border border-stroke-brand-secondary-soft p-10px text-center text-sm">
            {displayCurPeriodPercentage}
          </td>
          <td className="border border-stroke-brand-secondary-soft p-10px text-end text-sm">
            {displayPrePeriodAmount}
          </td>
          <td className="border border-stroke-brand-secondary-soft p-10px text-center text-sm">
            {displayPrePeriodPercentage}
          </td>
        </tr>,
        ...(item.children && item.children.length > 0 ? renderRows(item.children) : []),
      ];
    });
  };

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
            <p className="font-bold leading-5">項目彙總格式</p>
            <CollapseButton onClick={toggleSummaryTable} isCollapsed={isSummaryCollapsed} />
          </div>
          <p className="font-bold leading-5">單位：新台幣元 每股盈餘單位：新台幣元</p>
        </div>
        {!isSummaryCollapsed && (
          <table className="relative z-1 w-full border-collapse bg-white">
            <thead>
              <tr>
                <th className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
                  代號
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
                  會計項目
                </th>
                <th className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end font-semibold">
                  {!isSummaryCollapsed && financialReport && financialReport.company && (
                    <p className="text-center font-barlow font-semibold leading-5">
                      {formattedCurFromDate}至{formattedCurToDate}
                    </p>
                  )}
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center font-semibold">
                  %
                </th>
                <th
                  className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end font-semibold"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {financialReport && financialReport.company && (
                    <p className="text-center font-barlow font-semibold leading-5">
                      {formattedPreFromDate}至{formattedPreToDate}
                    </p>
                  )}
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center font-semibold">
                  %
                </th>
              </tr>
            </thead>

            <tbody>
              {financialReport?.general && renderRows(financialReport.general.slice(0, 10))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );

  // Deprecated: (20241204 - Liz)
  // eslint-disable-next-line no-console
  console.log('financialReport.general.slice(0, 10):', financialReport?.general.slice(0, 10));

  const ItemDetail = (
    <div id="2" className="relative overflow-hidden">
      <section className="text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <div className="flex items-center">
            <p className="font-bold leading-5">細項分類格式</p>
            <CollapseButton onClick={toggleDetailTable} isCollapsed={isDetailCollapsed} />
          </div>
          <p className="font-bold leading-5">單位：新台幣元 每股盈餘單位：新台幣元</p>
        </div>
        {!isDetailCollapsed && (
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
                  代號
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
                  會計項目
                </th>
                <th
                  className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end font-semibold"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {!isDetailCollapsed && financialReport && financialReport.company && (
                    <p className="text-center font-barlow font-semibold leading-5">
                      {formattedCurFromDate}至{formattedCurToDate}
                    </p>
                  )}
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center font-semibold">
                  %
                </th>
                <th
                  className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end font-semibold"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {financialReport && financialReport.company && (
                    <p className="text-center font-barlow font-semibold leading-5">
                      {formattedPreFromDate}至{formattedPreToDate}
                    </p>
                  )}
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center font-semibold">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {financialReport?.details && renderRows(financialReport.details.slice(0, 15))}
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
          <p className="font-bold leading-5">投入費用和成本，與收入的倍數關係</p>
          <p className="font-bold leading-5">單位：新台幣元</p>
        </div>
        <table className="relative z-10 w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
                代號
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
                會計項目
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
                代號
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
                會計項目
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

  return (
    <div className={`relative mx-auto w-full origin-top overflow-x-auto`}>
      <FilterBar printFn={printFn} />
      {/* Info: (20241202 - Anna)  渲染打印模板，通過 CSS 隱藏 */}
      <div ref={printRef} className="hidden border-2 border-rose-500 print:block">
        <IncomeStatementA4Template
          financialReport={financialReport}
          curDateFrom={formattedCurFromDate}
          curDateTo={formattedCurToDate}
          // preDateFrom={formattedPreFromDate}
          // preDateTo={formattedPreToDate}
        >
          {ItemSummary}
          {ItemDetail}
          {CostRevRatio}
        </IncomeStatementA4Template>
      </div>
      {/* Info: (20241202 - Anna) 預覽區域 */}
      <div className="block border-2 border-lime-500 print:hidden">
        {ItemSummary}
        {ItemDetail}
        {CostRevRatio}
      </div>
    </div>
  );
};

export default IncomeStatementList;
