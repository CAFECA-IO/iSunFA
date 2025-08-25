import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { CashFlowStatementReport, FinancialReportItem } from '@/interfaces/report';
import APIHandler from '@/lib/utils/api_handler';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import LineChart from '@/components/cash_flow_statement_report_body/line_chart';
import BarChart from '@/components/cash_flow_statement_report_body/bar_chart';
import Image from 'next/image';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import useStateRef from 'react-usestateref';
import { timestampToString } from '@/lib/utils/common';
import CollapseButton from '@/components/button/collapse_button';
import { FinancialReportTypesKey } from '@/interfaces/report_type';
import { IDatePeriod } from '@/interfaces/date_period';
import { useTranslation } from 'next-i18next';
import PrintButton from '@/components/button/print_button';
import DownloadButton from '@/components/button/download_button';
import CashFlowA4Template from '@/components/cash_flow_statement_report_body/cash_flow_statement_a4_template';
import DownloadCashFlowStatement from '@/components/cash_flow_statement_report_body/download_cash_flow_statement';
import { DecimalOperations } from '@/lib/utils/decimal_operations';
import { useCurrencyCtx } from '@/contexts/currency_context';

interface CashFlowStatementListProps {
  selectedDateRange: IDatePeriod | null; // Info: (20241024 - Anna) 接收來自上層的日期範圍
  printRef: React.RefObject<HTMLDivElement>; // Info: (20241122 - Anna) 從父層傳入的 Ref
  downloadRef: React.RefObject<HTMLDivElement>; // Info: (20250327 - Anna) 從父層傳入的 Ref
  printFn: () => void; // Info: (20241122 - Anna) 從父層傳入的列印函數
  downloadFn: () => void; // Info: (20250327 - Anna) 從父層傳入的下載函數
  isDownloading: boolean;
}

const CashFlowStatementList: React.FC<CashFlowStatementListProps> = ({
  selectedDateRange,
  printRef, // Info: (20241122 - Anna) 使用打印範圍 Ref
  downloadRef, // Info: (20250327 - Anna) 使用下載範圍 Ref
  printFn, // Info: (20241122 - Anna) 使用打印函數
  downloadFn, // Info: (20250327 - Anna) 使用下載函數
  isDownloading,
}) => {
  const { t, i18n } = useTranslation('reports'); // Info: (20250108 - Anna) 使用 i18n 來獲取當前語言
  const isChinese = i18n.language === 'tw' || i18n.language === 'cn'; // Info: (20250108 - Anna) 判斷當前語言是否為中文
  const { currency } = useCurrencyCtx();
  const { isAuthLoading, connectedAccountBook } = useUserCtx();
  const hasCompanyId = isAuthLoading === false && !!connectedAccountBook?.id;
  // Info: (20241024 - Anna) 用 useRef 追蹤之前的日期範圍
  const prevSelectedDateRange = useRef<IDatePeriod | null>(null);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false); // Info: (20241024 - Anna) 追蹤是否已經成功請求過一次 API

  // Info: (20241024 - Anna) 使用 APIHandler 串 API
  const {
    data: reportFinancial,
    code: getReportFinancialCode,
    success: getReportFinancialSuccess,
    isLoading: getReportFinancialIsLoading,
    trigger,
  } = APIHandler<CashFlowStatementReport>(APIName.REPORT_GET_V2);

  const [curDate, setCurDate] = useStateRef<{ from: string; to: string }>({ from: '', to: '' });
  const [curYear, setCurYear] = useStateRef<string>('');
  const [preDate, setPreDate] = useStateRef<{ from: string; to: string }>({ from: '', to: '' });
  const [preYear, setPreYear] = useStateRef<string>('');

  const [lineChartData, setLineChartData] = useStateRef<string[]>([]);
  const [lineChartLabels, setLineChartLabels] = useStateRef<string[]>([]);

  const [curBarChartData, setCurBarChartData] = useStateRef<string[]>([]);
  const [curBarChartLabels, setCurBarChartLabels] = useStateRef<string[]>([]);
  const [preBarChartData, setPreBarChartData] = useStateRef<string[]>([]);
  const [preBarChartLabels, setPreBarChartLabels] = useStateRef<string[]>([]);

  const [firstThought, setFirstThought] = useStateRef<string>('');
  const [secondThought, setSecondThought] = useStateRef<string>('');
  const [thirdThought, setThirdThought] = useStateRef<string>('');
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
  // Info: (20241001 - Anna) 包裝 API 請求邏輯，依賴 selectedDateRange 變化時觸發
  const getCashFlowReport = useCallback(async () => {
    if (!hasCompanyId || !selectedDateRange || selectedDateRange.endTimeStamp === 0) {
      return;
    }

    // Info: (20241001 - Anna)如果日期範圍與上次相同，且已經成功請求過，則跳過 API 請求
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
          accountBookId: connectedAccountBook?.id,
        },
        query: {
          startDate: selectedDateRange.startTimeStamp, // Info: (20241001 - Anna) 根據選擇的日期範圍傳遞參數
          endDate: selectedDateRange.endTimeStamp,
          language: 'en',
          reportType: FinancialReportTypesKey.cash_flow_statement,
        },
      });

      if (response.success) {
        setHasFetchedOnce(true); // Info: (20241001 - Anna) 設定成功請求標記
        prevSelectedDateRange.current = selectedDateRange; // Info: (20241001 - Anna) 更新日期範圍
      }
    } catch (error) {
      (() => {})(); // Info: (20241024 - Anna) Empty function, does nothing
    }
  }, [hasCompanyId, connectedAccountBook?.id, selectedDateRange, trigger]);

  // Info: (20241024 - Anna) 在 useEffect 中依賴 getCashFlowReport，當日期範圍變更時觸發 API 請求
  useEffect(() => {
    if (!selectedDateRange) return;
    getCashFlowReport();
  }, [getCashFlowReport, selectedDateRange]);

  useEffect(() => {
    if (getReportFinancialSuccess === true && reportFinancial) {
      const currentFrom = timestampToString(reportFinancial.curDate.from ?? 0);
      const currentTo = timestampToString(reportFinancial.curDate.to ?? 0);
      const previousFrom = timestampToString(reportFinancial.preDate.from ?? 0);
      const previousTo = timestampToString(reportFinancial.preDate.to ?? 0);
      const currentYear = currentTo.year;
      const previousYear = previousTo.year;

      if (reportFinancial.otherInfo?.lineChartDataForRatio) {
        setLineChartData(reportFinancial.otherInfo.lineChartDataForRatio.data);
        setLineChartLabels(reportFinancial.otherInfo.lineChartDataForRatio.labels);
      }

      if (reportFinancial.otherInfo?.strategyInvest) {
        const curInvestment = reportFinancial.otherInfo.strategyInvest[currentYear];
        const preInvestment = reportFinancial.otherInfo.strategyInvest[previousYear];

        setCurBarChartData(curInvestment.data);
        setCurBarChartLabels(curInvestment.labels);
        setPreBarChartData(preInvestment.data);
        setPreBarChartLabels(preInvestment.labels);
      }

      setFirstThought(reportFinancial?.otherInfo?.ourThoughts?.[0]);
      setSecondThought(reportFinancial?.otherInfo?.ourThoughts?.[1]);
      setThirdThought(reportFinancial?.otherInfo?.ourThoughts?.[2]);

      setCurDate({ from: currentFrom.date, to: currentTo.date });
      setCurYear(currentYear);
      setPreDate({ from: previousFrom.date, to: previousTo.date });
      setPreYear(previousYear);
    }
  }, [reportFinancial]);

  // Info: (20241024 - Anna) 檢查報表數據和載入狀態
  if (!hasFetchedOnce && !getReportFinancialIsLoading) {
    return (
      <div className="-mt-40 flex h-screen flex-col items-center justify-center">
        <Image src="/images/empty.svg" alt="No data image" width={120} height={135} />
        <div>
          <p className="mb-0 text-neutral-300">{t('reports:REPORT.NO_DATA_AVAILABLE')}</p>
          <p className="mb-0 text-neutral-300">{t('reports:REPORT.PLEASE_SELECT_PERIOD')}</p>
        </div>
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
    !Object.prototype.hasOwnProperty.call(reportFinancial.otherInfo, 'operatingStabilized') ||
    !Object.prototype.hasOwnProperty.call(reportFinancial.otherInfo, 'lineChartDataForRatio') ||
    !Object.prototype.hasOwnProperty.call(reportFinancial.otherInfo, 'strategyInvest') ||
    !Object.prototype.hasOwnProperty.call(reportFinancial.otherInfo, 'freeCash')
  ) {
    return <div>Error {getReportFinancialCode}</div>;
  }

  const renderTable = (data: FinancialReportItem[]) => {
    // Info: (20250213 - Anna) 先去除重複，確保相同 `code` 只顯示一次
    const uniqueData = Array.from(new Map(data.map((item) => [item.code, item])).values());
    return (
      <div className="hide-scrollbar overflow-x-auto">
        <div className="min-w-900px">
          <table className="relative z-1 w-full border-collapse bg-white">
            <thead>
              <tr className="print:hidden">
                <th className="w-125px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold">
                  {t('reports:REPORTS.CODE_NUMBER')}
                </th>
                <th className="w-540px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold">
                  {t('reports:REPORTS.ACCOUNTING_ITEMS')}
                </th>
                <th className="w-285px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold">
                  {curDate.from} {t('reports:COMMON.TO')} {curDate.to}
                </th>
                <th className="w-285px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold">
                  {preDate.from} {t('reports:COMMON.TO')} {preDate.to}
                </th>
              </tr>
            </thead>
            <tbody>
              {uniqueData
                // Info: (20250213 - Anna) 先過濾掉 `curPeriodAmount` 和 `prePeriodAmount` 都為 0 的行
                .filter(
                  (value) =>
                    !(DecimalOperations.isZero(value.curPeriodAmount) && DecimalOperations.isZero(value.prePeriodAmount))
                )
                .map((value) => {
                  if (!value.code) {
                    return (
                      <tr key={value.code}>
                        <td
                          colSpan={6}
                          className="border border-stroke-neutral-quaternary p-10px font-bold"
                        >
                          {value.name}
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={value.code}>
                      <td className="border border-stroke-neutral-quaternary p-10px text-sm">
                        {value.code}
                      </td>
                      <td className="border border-stroke-neutral-quaternary p-10px text-sm">
                        {t(`reports:ACCOUNTING_ACCOUNT.${value.name}`)}
                      </td>
                      <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm">
                        {
                          DecimalOperations.isZero(value.curPeriodAmount)
                            ? '-' // Info: (20241021 - Anna) 如果是 0，顯示 "-"
                            : DecimalOperations.isNegative(value.curPeriodAmount)
                              ? `(${DecimalOperations.abs(value.curPeriodAmount)})` // Info:(20241021 - Anna) 負數，顯示括號和千分位
                              : value.curPeriodAmount // Info:(20241021 - Anna) 正數，顯示千分位
                        }
                      </td>
                      <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm">
                        {DecimalOperations.isZero(value.prePeriodAmount)
                          ? '-'
                          : DecimalOperations.isNegative(value.prePeriodAmount)
                            ? `(${DecimalOperations.abs(value.prePeriodAmount)})`
                            : value.prePeriodAmount}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderedInvestmentRatio = () => {
    return (
      <div className="mt-4 text-text-neutral-primary">
        <h3 className="text-sm font-semibold leading-6">{t('reports:REPORTS.PPE')}</h3>
        <ol className="list-decimal pl-6 pt-2 text-sm font-normal leading-5 text-text-neutral-primary">
          {firstThought?.split('\n').map((line: string) => (
            <li key={line} className="mb-2 ml-1">
              {t(`reports:REPORTS.${line}`)}
            </li>
          ))}
        </ol>

        <h3 className="mt-4 text-sm font-semibold leading-6">
          {t('reports:REPORTS.STRATEGIC_INVESTMENTS')}
        </h3>
        <ol className="list-decimal pl-6 pt-2 text-sm font-normal leading-5 text-text-neutral-primary">
          {secondThought?.split('\n').map((line: string) => (
            <li key={line} className="mb-2 ml-1">
              {t(`reports:REPORTS.${line}`)}
            </li>
          ))}
        </ol>
        <h3 className="mt-4 text-sm font-semibold leading-6">{t('reports:REPORTS.OTHERS')}</h3>
        <ol className="list-decimal pl-6 pt-2 text-sm font-normal leading-5 text-text-neutral-primary">
          {thirdThought?.split('\n').map((line: string) => (
            <li key={line} className="mb-2 ml-1">
              {t(`reports:REPORTS.${line}`)}
            </li>
          ))}
        </ol>
      </div>
    );
  };

  const renderedFreeCashFlow = (currentYear: string, previousYear: string) => {
    if (!reportFinancial?.otherInfo?.freeCash) {
      return null;
    }

    const displayedTableBody =
      reportFinancial?.otherInfo?.freeCash[currentYear] &&
      reportFinancial?.otherInfo?.freeCash[previousYear] ? (
        <tbody>
          <tr>
            <td className="border border-stroke-neutral-quaternary p-10px text-start text-sm font-normal leading-5 text-text-neutral-secondary">
              {t('reports:REPORTS.CASH_INFLOWS_FROM_OPERATING')}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm font-normal leading-5 text-text-neutral-secondary">
              {DecimalOperations.isZero(reportFinancial?.otherInfo?.freeCash[currentYear]?.operatingCashFlow)
                ? '-'
                : DecimalOperations.isNegative(reportFinancial?.otherInfo?.freeCash[currentYear]?.operatingCashFlow)
                  ? `(${DecimalOperations.abs(reportFinancial?.otherInfo?.freeCash[currentYear]?.operatingCashFlow)})` // Info: (20241021 - Anna) 如果是負數，使用括號表示，並加千分位
                  : reportFinancial?.otherInfo?.freeCash[
                      currentYear
                    ]?.operatingCashFlow}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm font-normal leading-5 text-text-neutral-secondary">
              {DecimalOperations.isZero(reportFinancial?.otherInfo?.freeCash[previousYear]?.operatingCashFlow)
                ? '-'
                : DecimalOperations.isNegative(reportFinancial?.otherInfo?.freeCash[previousYear]?.operatingCashFlow)
                  ? `(${DecimalOperations.abs(reportFinancial?.otherInfo?.freeCash[previousYear]?.operatingCashFlow)})`
                  : reportFinancial?.otherInfo?.freeCash[
                      previousYear
                    ]?.operatingCashFlow}
            </td>
          </tr>
          <tr>
            <td className="border border-stroke-neutral-quaternary p-10px text-start text-sm font-normal leading-5 text-text-neutral-secondary">
              {t('reports:REPORTS.PROPERTY_PLANT_EQUIPMENT')}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm font-normal leading-5 text-text-neutral-secondary">
              {DecimalOperations.isZero(reportFinancial?.otherInfo?.freeCash[currentYear]?.ppe)
                ? '-'
                : DecimalOperations.isNegative(reportFinancial?.otherInfo?.freeCash[currentYear]?.ppe)
                  ? `(${DecimalOperations.abs(reportFinancial?.otherInfo?.freeCash[currentYear]?.ppe)})`
                  : reportFinancial?.otherInfo?.freeCash[currentYear]?.ppe}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm font-normal leading-5 text-text-neutral-secondary">
              {DecimalOperations.isZero(reportFinancial?.otherInfo?.freeCash[previousYear]?.ppe)
                ? '-'
                : DecimalOperations.isNegative(reportFinancial?.otherInfo?.freeCash[previousYear]?.ppe)
                  ? `(${DecimalOperations.abs(reportFinancial?.otherInfo?.freeCash[previousYear]?.ppe)})`
                  : reportFinancial?.otherInfo?.freeCash[previousYear]?.ppe}
            </td>
          </tr>
          <tr>
            <td className="border border-stroke-neutral-quaternary p-10px text-start text-sm font-normal leading-5 text-text-neutral-secondary">
              {t('reports:REPORTS.EXPENDITURES_ON_INTANGIBLE_ASSETS')}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm font-normal leading-5 text-text-neutral-secondary">
              {DecimalOperations.isZero(reportFinancial?.otherInfo?.freeCash[currentYear]?.intangibleAsset)
                ? '-'
                : DecimalOperations.isNegative(reportFinancial?.otherInfo?.freeCash[currentYear]?.intangibleAsset)
                  ? `(${DecimalOperations.abs(reportFinancial?.otherInfo?.freeCash[currentYear]?.intangibleAsset)})`
                  : reportFinancial?.otherInfo?.freeCash[
                      currentYear
                    ]?.intangibleAsset}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm font-normal leading-5 text-text-neutral-secondary">
              {DecimalOperations.isZero(reportFinancial?.otherInfo?.freeCash[previousYear]?.intangibleAsset)
                ? '-'
                : DecimalOperations.isNegative(reportFinancial?.otherInfo?.freeCash[previousYear]?.intangibleAsset)
                  ? `(${DecimalOperations.abs(reportFinancial?.otherInfo?.freeCash[previousYear]?.intangibleAsset)})`
                  : reportFinancial?.otherInfo?.freeCash[
                      previousYear
                    ]?.intangibleAsset}
            </td>
          </tr>
          <tr>
            <td className="border border-stroke-neutral-quaternary p-10px text-start text-sm font-normal leading-5 text-text-neutral-secondary">
              {t('reports:REPORTS.AVAILABLE_CASH_FLOW')}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm font-normal leading-5 text-text-neutral-secondary">
              {DecimalOperations.isZero(reportFinancial?.otherInfo?.freeCash[currentYear]?.freeCash)
                ? '-'
                : DecimalOperations.isNegative(reportFinancial?.otherInfo?.freeCash[currentYear]?.freeCash)
                  ? `(${DecimalOperations.abs(reportFinancial?.otherInfo?.freeCash[currentYear]?.freeCash)})`
                  : reportFinancial?.otherInfo?.freeCash[currentYear]?.freeCash}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm font-normal leading-5 text-text-neutral-secondary">
              {DecimalOperations.isZero(reportFinancial?.otherInfo?.freeCash[previousYear]?.freeCash)
                ? '-'
                : DecimalOperations.isNegative(reportFinancial?.otherInfo?.freeCash[previousYear]?.freeCash)
                  ? `(${DecimalOperations.abs(reportFinancial?.otherInfo?.freeCash[previousYear]?.freeCash)})`
                  : reportFinancial?.otherInfo?.freeCash[previousYear]?.freeCash}
            </td>
          </tr>
        </tbody>
      ) : (
        <tbody></tbody>
      );

    return (
      <div className="hide-scrollbar mt-4 overflow-x-auto">
        <div className="min-w-900px print:min-w-0">
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr className="bg-surface-brand-primary-50">
                <th className="w-300px border border-stroke-neutral-quaternary p-10px text-left text-xxs font-semibold leading-5 text-text-neutral-secondary"></th>
                <th className="w-300px border border-stroke-neutral-quaternary p-10px text-center text-sm font-semibold leading-5 text-text-neutral-secondary">
                  {t('reports:REPORTS.YEAR_TEMPLATE', { year: currentYear })}
                </th>
                <th className="w-300px border border-stroke-neutral-quaternary p-10px text-center text-sm font-semibold leading-5 text-text-neutral-secondary">
                  {t('reports:REPORTS.YEAR_TEMPLATE', { year: previousYear })}
                </th>
              </tr>
            </thead>
            {displayedTableBody}
          </table>
        </div>
      </div>
    );
  };
  const displayedSelectArea = () => {
    return (
      <div className="mb-16px flex items-center justify-between px-px max-md:flex-wrap print:hidden">
        <div className="ml-auto flex items-center gap-2 tablet:gap-24px">
          <DownloadButton onClick={downloadFn} />
          {/* Info: (20241021 - Anna) 列印按鈕：只有中文可用 */}
          <PrintButton onClick={printFn} disabled={!isChinese} />
        </div>
      </div>
    );
  };

  const ItemSummary = (
    <div id="1" className="relative overflow-y-hidden">
      <section className="mx-1 text-text-neutral-secondary">
        <div className="relative z-1 mb-16px flex items-center justify-between font-semibold text-surface-brand-secondary">
          <div className="flex items-center">
            <p className="mb-0">{t('reports:REPORTS.ITEM_SUMMARY_FORMAT')}</p>
            <CollapseButton onClick={toggleSummaryTable} isCollapsed={isSummaryCollapsed} />
          </div>
          <p className="text-xs font-semibold leading-5">
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {currency}
          </p>
        </div>
        {!isSummaryCollapsed &&
          reportFinancial &&
          reportFinancial.general &&
          renderTable(reportFinancial.general)}
      </section>
    </div>
  );
  const ItemDetail = (
    <div id="2" className="relative overflow-hidden">
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="relative -z-10"></div>
        <div className="mb-4 mt-8 flex items-center justify-between font-semibold text-surface-brand-secondary">
          <div className="flex items-center">
            <p className="mb-0">{t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}</p>
            <CollapseButton onClick={toggleDetailTable} isCollapsed={isDetailCollapsed} />
          </div>
          <p className="text-xs font-semibold leading-5">
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {currency}
          </p>
        </div>
        {!isDetailCollapsed &&
          reportFinancial &&
          reportFinancial.details &&
          renderTable(reportFinancial.details)}
      </section>
    </div>
  );
  const operatingCF5Y = (
    <div id="3" className="relative overflow-hidden">
      <section className="relative mx-3 text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>
            {t(
              `reports:REPORTS.${reportFinancial && reportFinancial.otherInfo && reportFinancial.otherInfo.thirdTitle}`
            )}
          </p>
        </div>
        {reportFinancial &&
        reportFinancial.otherInfo &&
        Object.prototype.hasOwnProperty.call(reportFinancial.otherInfo, 'operatingStabilized') ? (
          <>
            <div className="relative mb-0 flex items-center pb-1">
              <Image
                src="/icons/line_chart_icon.svg"
                alt=""
                className="mr-2"
                width={24}
                height={24}
              />
              <p className="my-auto items-center text-center text-sm font-semibold">
                {t('reports:REPORTS.RATIO_A_B')}
              </p>
              <div className="absolute bottom-0 left-0 h-px w-full bg-stroke-neutral-secondary"></div>
            </div>
            <div className="mb-16 flex flex-col lg:flex-row">
              <div className="mt-18px w-full lg:w-3/5">
                <LineChart data={lineChartData.map((val) => parseFloat(val))} labels={lineChartLabels} />
              </div>
              <div className="mt-18px w-full lg:w-2/5 lg:pl-8">
                <p className="mb-1 text-xs iphonese:text-sm">
                  <span className="mr-1">A.</span>
                  <span>{t('reports:REPORTS.PBT_DA_TAXES_PAID')}</span>
                </p>
                <p className="text-xs iphonese:text-sm">
                  <span className="mr-1">B.</span>
                  <span>{t('reports:REPORTS.OPERATION_CASH_FLOW')}</span>
                </p>
              </div>
            </div>
            <div className="mb-1 mt-2 flex justify-between font-semibold text-surface-brand-secondary">
              <p>{t('reports:REPORTS.CHART_SOURCE')}</p>
            </div>
            <div className="hide-scrollbar overflow-x-auto">
              <div className="min-w-900px">
                <table className="relative w-full border-collapse bg-white">
                  <thead>
                    <tr className="text-xxs">
                      <th className="w-1/6 border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold"></th>
                      {lineChartLabels?.map((label) => (
                        <th
                          key={label}
                          className="w-170px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-stroke-neutral-quaternary p-10px text-sm font-semibold">
                        A
                      </td>
                      {Object.keys(
                        reportFinancial.otherInfo.operatingStabilized.beforeIncomeTax
                      ).map((year) => (
                        <td
                          key={year}
                          className="border border-stroke-neutral-quaternary p-10px font-semibold"
                        ></td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border border-stroke-neutral-quaternary p-10px text-sm">
                        {t('reports:REPORTS.PBT')}
                      </td>
                      {Object.entries(
                        reportFinancial.otherInfo.operatingStabilized.beforeIncomeTax
                      ).map(([year, value]) => (
                        <td
                          key={year}
                          className="border border-stroke-neutral-quaternary p-10px text-end text-sm"
                        >
                          {DecimalOperations.isZero(value)
                            ? '-'
                            : DecimalOperations.isNegative(value)
                              ? `(${DecimalOperations.abs(value)})`
                              : value}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border border-stroke-neutral-quaternary p-10px text-sm">
                        {t('reports:REPORTS.DA')}
                      </td>
                      {Object.keys(
                        reportFinancial.otherInfo.operatingStabilized.beforeIncomeTax
                      ).map((year) => (
                        <td
                          key={year}
                          className="border border-stroke-neutral-quaternary p-10px text-end text-sm"
                        >
                          {
                            DecimalOperations.isZero(reportFinancial.otherInfo.operatingStabilized.amortizationDepreciation[
                              year
                            ])
                              ? '-' // Info: (20241021 - Anna) 如果數字是 0，顯示 "-"
                              : DecimalOperations.isNegative(reportFinancial.otherInfo.operatingStabilized
                                    .amortizationDepreciation[year])
                                ? `(${DecimalOperations.abs(
                                    reportFinancial.otherInfo.operatingStabilized
                                      .amortizationDepreciation[year]
                                  )})` // Info: (20241021 - Anna) 負數用括號並加千分位
                                : reportFinancial.otherInfo.operatingStabilized.amortizationDepreciation[
                                    year
                                  ] // Info: (20241021 - Anna) 正數顯示千分位
                          }
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border border-stroke-neutral-quaternary p-10px text-sm">
                        {t('reports:REPORTS.INCOME_TAXES_PAID')}
                      </td>
                      {Object.entries(reportFinancial.otherInfo.operatingStabilized.tax).map(
                        ([year, value]) => (
                          <td
                            key={year}
                            className="border border-stroke-neutral-quaternary p-10px text-end text-sm"
                          >
                            {DecimalOperations.isZero(value)
                              ? '-'
                              : DecimalOperations.isNegative(value)
                                ? `(${DecimalOperations.abs(value)})`
                                : value}
                          </td>
                        )
                      )}
                    </tr>
                    <tr>
                      <td className="border border-stroke-neutral-quaternary p-10px text-sm font-semibold">
                        B
                      </td>
                      {Object.keys(
                        reportFinancial.otherInfo.operatingStabilized.beforeIncomeTax
                      ).map((year) => (
                        <td
                          key={year}
                          className="border border-stroke-neutral-quaternary p-10px font-semibold"
                        ></td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border border-stroke-neutral-quaternary p-10px text-sm">
                        {t('reports:REPORTS.CASH_FROM_OPERATING')}
                      </td>
                      {Object.entries(
                        reportFinancial.otherInfo.operatingStabilized.operatingIncomeCashFlow
                      ).map(([year, value]) => (
                        <td
                          key={year}
                          className="border border-stroke-neutral-quaternary p-10px text-end text-sm"
                        >
                          {DecimalOperations.isZero(value)
                            ? '-'
                            : DecimalOperations.isNegative(value)
                              ? `(${DecimalOperations.abs(value)})`
                              : value}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border border-stroke-neutral-quaternary p-10px"></td>
                      {Object.keys(
                        reportFinancial.otherInfo.operatingStabilized.beforeIncomeTax
                      ).map((year) => (
                        <td
                          key={year}
                          className="border border-stroke-neutral-quaternary p-20px"
                        ></td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border border-stroke-neutral-quaternary p-10px text-sm">
                        {t('reports:REPORTS.RATIO_A_B')}
                      </td>
                      {Object.entries(reportFinancial.otherInfo.operatingStabilized.ratio).map(
                        ([year, value]) => (
                          <td
                            key={year}
                            className="border border-stroke-neutral-quaternary p-10px text-end text-sm"
                          >
                            {parseFloat(value).toFixed(2)}
                          </td>
                        )
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
  const investmentRatio = (
    <div id="4" className="relative overflow-hidden">
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="mb-16px mt-32px font-semibold text-surface-brand-secondary">
          <p className="break-words font-semibold leading-tight">
            {t(
              `reports:REPORTS.${reportFinancial && reportFinancial.otherInfo && reportFinancial.otherInfo.fourthTitle}`
            )}
          </p>
        </div>
        <div className="mx-1 mt-8 flex flex-col items-end justify-between lg:flex-row">
          <div className="w-full lg:w-1/2">
            <div className="relative mb-0 flex items-center pb-1">
              <Image
                src="/icons/bar_chart_icon.svg"
                alt=""
                className="mr-2"
                width={24}
                height={24}
              />
              <p className="my-auto items-end font-semibold text-text-neutral-secondary">
                {t('reports:REPORTS.INVESTMENT_PROPORTION', { year: curYear })}
              </p>
              <div className="absolute bottom-0 left-0 h-px w-full bg-stroke-neutral-secondary"></div>
            </div>
            <BarChart
              data={curBarChartData.map((val) => parseFloat(val))}
              labels={curBarChartLabels.map((label) => t(`reports:REPORTS.${label}`))}
            />
          </div>
          <div className="w-full lg:w-1/2">
            <div className="relative mb-0 flex items-center pb-1">
              <Image
                src="/icons/bar_chart_icon.svg"
                alt=""
                className="mr-2"
                width={24}
                height={24}
              />
              <p className="my-auto items-end font-semibold text-text-neutral-secondary">
                {t('reports:REPORTS.INVESTMENT_PROPORTION', { year: preYear })}
              </p>
              <div className="absolute bottom-0 left-0 h-px w-full bg-stroke-neutral-secondary"></div>
            </div>
            <BarChart
              data={preBarChartData.map((val) => parseFloat(val))}
              labels={preBarChartLabels.map((label) => t(`reports:REPORTS.${label}`))}
            />
          </div>
        </div>
        <div className="mb-16px mt-4 font-semibold text-surface-brand-secondary">
          <p className="font-semibold">{t('reports:REPORTS.ISUNFA_INSIGHTS', { year: curYear })}</p>
        </div>
        <div id="5" className="relative overflow-hidden">
          <section className="relative mx-3 text-text-neutral-secondary">
            {renderedInvestmentRatio()}
          </section>
        </div>
      </section>
    </div>
  );
  const freeCashFlow = (
    <div id="6" className="relative overflow-hidden">
      <section className="relative mx-3 text-text-neutral-secondary">
        <div className="mb-4 mt-32px text-center font-semibold leading-5 text-surface-brand-secondary">
          <p className="text-start font-semibold">{t('reports:REPORTS.FREE_CASH_FLOW')}</p>
          {renderedFreeCashFlow(curYear, preYear)}
        </div>
      </section>
    </div>
  );

  return (
    <div className={`relative mx-auto w-full origin-top overflow-x-auto`}>
      {displayedSelectArea()}
      {/* Info: (20241202- Anna) 渲染打印模板，通過 CSS 隱藏 */}
      <div ref={printRef} className="hidden print:block">
        <CashFlowA4Template
          reportFinancial={reportFinancial}
          curDate={`${curDate.from}\n${t('reports:COMMON.TO')}${curDate.to}`} // Info: (20241202- Anna) 格式化為字符串
          preDate={`${preDate.from}\n${t('reports:COMMON.TO')}${preDate.to}`} // Info: (20241202- Anna) 格式化為字符串
        >
          {ItemSummary}
          {ItemDetail}
          {freeCashFlow}
        </CashFlowA4Template>
      </div>
      {/*  Info: (20241202- Anna) 預覽區域 */}
      <div className="block print:hidden">
        {ItemSummary}
        {ItemDetail}
        {operatingCF5Y}
        {investmentRatio}
        {freeCashFlow}
      </div>
      <DownloadCashFlowStatement
        reportFinancial={reportFinancial}
        downloadRef={downloadRef}
        isDownloading={isDownloading}
      />
    </div>
  );
};

export default CashFlowStatementList;
