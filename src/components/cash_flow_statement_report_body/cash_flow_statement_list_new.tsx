import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { CashFlowStatementReport, FinancialReportItem } from '@/interfaces/report';
import APIHandler from '@/lib/utils/api_handler';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
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

interface CashFlowStatementListProps {
  selectedDateRange: IDatePeriod | null; // Info: (20241024 - Anna) 接收來自上層的日期範圍
}

const CashFlowStatementList: React.FC<CashFlowStatementListProps> = ({ selectedDateRange }) => {
  const { isAuthLoading, selectedCompany } = useUserCtx();
  const hasCompanyId = isAuthLoading === false && !!selectedCompany?.id;
  // Info: (20241024 - Anna) 用 useRef 追蹤之前的日期範圍
  const prevSelectedDateRange = useRef<IDatePeriod | null>(null);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false); // Info: (20241024 - Anna) 追蹤是否已經成功請求過一次 API

  // Info: (20241024 - Anna) 使用 APIHandler 串同一支 API
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

  const [lineChartData, setLineChartData] = useStateRef<number[]>([]);
  const [lineChartLabels, setLineChartLabels] = useStateRef<string[]>([]);

  const [curBarChartData, setCurBarChartData] = useStateRef<number[]>([]);
  const [curBarChartLabels, setCurBarChartLabels] = useStateRef<string[]>([]);
  const [preBarChartData, setPreBarChartData] = useStateRef<number[]>([]);
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
          companyId: selectedCompany?.id,
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
  }, [hasCompanyId, selectedCompany?.id, selectedDateRange, trigger]);

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
    !Object.prototype.hasOwnProperty.call(reportFinancial.otherInfo, 'operatingStabilized') ||
    !Object.prototype.hasOwnProperty.call(reportFinancial.otherInfo, 'lineChartDataForRatio') ||
    !Object.prototype.hasOwnProperty.call(reportFinancial.otherInfo, 'strategyInvest') ||
    !Object.prototype.hasOwnProperty.call(reportFinancial.otherInfo, 'freeCash')
  ) {
    return <div>Error {getReportFinancialCode}</div>;
  }

  const renderTable = (data: FinancialReportItem[]) => {
    return (
      <table className="relative z-1 w-full border-collapse bg-white">
        <thead>
          <tr>
            <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
              代號
            </th>
            <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
              會計項目
            </th>
            <th className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
              {curDate.from}至{curDate.to}
            </th>
            <th className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
              {preDate.from}至{preDate.to}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((value) => {
            if (!value.code) {
              return (
                <tr key={value.code}>
                  <td
                    colSpan={6}
                    className="border border-stroke-brand-secondary-soft p-10px text-xs font-bold"
                  >
                    {value.name}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={value.code}>
                <td className="border border-stroke-brand-secondary-soft p-10px text-xs">
                  {value.code}
                </td>
                <td className="border border-stroke-brand-secondary-soft p-10px text-xs">
                  {value.name}
                </td>
                <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
                  {
                    value.curPeriodAmount === 0
                      ? '-' // Info: (20241021 - Anna) 如果是 0，顯示 "-"
                      : value.curPeriodAmount < 0
                        ? `(${Math.abs(value.curPeriodAmount).toLocaleString()})` // Info:(20241021 - Anna) 負數，顯示括號和千分位
                        : value.curPeriodAmount.toLocaleString() // Info:(20241021 - Anna) 正數，顯示千分位
                  }
                </td>
                <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs">
                  {value.prePeriodAmount === 0
                    ? '-'
                    : value.prePeriodAmount < 0
                      ? `(${Math.abs(value.prePeriodAmount).toLocaleString()})`
                      : value.prePeriodAmount.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const renderedInvestmentRatio = () => {
    return (
      <div className="mt-4 text-text-neutral-primary">
        <h3 className="text-base font-semibold leading-6">不動產、廠房、設備的收支項目：</h3>
        <ol className="list-decimal pl-6 text-xs font-normal leading-5 text-text-neutral-primary">
          {firstThought?.split('\n').map((line) => (
            <li key={line} className="mb-2 ml-1">
              {line}
            </li>
          ))}
        </ol>

        <h3 className="mt-4 text-base font-semibold leading-6">策略性投資項目：</h3>
        <ol className="list-decimal pl-6 text-xs font-normal leading-5 text-text-neutral-primary">
          {secondThought?.split('\n').map((line) => (
            <li key={line} className="mb-2 ml-1">
              {line}
            </li>
          ))}
        </ol>
        <h3 className="mt-4 text-base font-semibold leading-6">其他：</h3>
        <ol className="list-decimal pl-6 text-xs font-normal leading-5 text-text-neutral-primary">
          {thirdThought?.split('\n').map((line) => (
            <li key={line} className="mb-2 ml-1">
              {line}
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
            <td className="border border-stroke-brand-secondary-soft p-10px text-start text-xs font-normal leading-5 text-text-neutral-secondary">
              營業活動現金流入
            </td>
            <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs font-normal leading-5 text-text-neutral-secondary">
              {reportFinancial?.otherInfo?.freeCash[currentYear]?.operatingCashFlow === 0
                ? '-'
                : reportFinancial?.otherInfo?.freeCash[currentYear]?.operatingCashFlow < 0
                  ? `(${Math.abs(reportFinancial?.otherInfo?.freeCash[currentYear]?.operatingCashFlow).toLocaleString()})` // Info: (20241021 - Anna) 如果是負數，使用括號表示，並加千分位
                  : reportFinancial?.otherInfo?.freeCash[
                      currentYear
                    ]?.operatingCashFlow.toLocaleString()}
            </td>
            <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs font-normal leading-5 text-text-neutral-secondary">
              {reportFinancial?.otherInfo?.freeCash[previousYear]?.operatingCashFlow === 0
                ? '-'
                : reportFinancial?.otherInfo?.freeCash[previousYear]?.operatingCashFlow < 0
                  ? `(${Math.abs(reportFinancial?.otherInfo?.freeCash[previousYear]?.operatingCashFlow).toLocaleString()})`
                  : reportFinancial?.otherInfo?.freeCash[
                      previousYear
                    ]?.operatingCashFlow.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td className="border border-stroke-brand-secondary-soft p-10px text-start text-xs font-normal leading-5 text-text-neutral-secondary">
              不動產、廠房及設備
            </td>
            <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs font-normal leading-5 text-text-neutral-secondary">
              {reportFinancial?.otherInfo?.freeCash[currentYear]?.ppe === 0
                ? '-'
                : reportFinancial?.otherInfo?.freeCash[currentYear]?.ppe < 0
                  ? `(${Math.abs(reportFinancial?.otherInfo?.freeCash[currentYear]?.ppe).toLocaleString()})`
                  : reportFinancial?.otherInfo?.freeCash[currentYear]?.ppe.toLocaleString()}
            </td>
            <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs font-normal leading-5 text-text-neutral-secondary">
              {reportFinancial?.otherInfo?.freeCash[previousYear]?.ppe === 0
                ? '-'
                : reportFinancial?.otherInfo?.freeCash[previousYear]?.ppe < 0
                  ? `(${Math.abs(reportFinancial?.otherInfo?.freeCash[previousYear]?.ppe).toLocaleString()})`
                  : reportFinancial?.otherInfo?.freeCash[previousYear]?.ppe.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td className="border border-stroke-brand-secondary-soft p-10px text-start text-xs font-normal leading-5 text-text-neutral-secondary">
              無形資產支出
            </td>
            <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs font-normal leading-5 text-text-neutral-secondary">
              {reportFinancial?.otherInfo?.freeCash[currentYear]?.intangibleAsset === 0
                ? '-'
                : reportFinancial?.otherInfo?.freeCash[currentYear]?.intangibleAsset < 0
                  ? `(${Math.abs(reportFinancial?.otherInfo?.freeCash[currentYear]?.intangibleAsset).toLocaleString()})`
                  : reportFinancial?.otherInfo?.freeCash[
                      currentYear
                    ]?.intangibleAsset.toLocaleString()}
            </td>
            <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs font-normal leading-5 text-text-neutral-secondary">
              {reportFinancial?.otherInfo?.freeCash[previousYear]?.intangibleAsset === 0
                ? '-'
                : reportFinancial?.otherInfo?.freeCash[previousYear]?.intangibleAsset < 0
                  ? `(${Math.abs(reportFinancial?.otherInfo?.freeCash[previousYear]?.intangibleAsset).toLocaleString()})`
                  : reportFinancial?.otherInfo?.freeCash[
                      previousYear
                    ]?.intangibleAsset.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td className="border border-stroke-brand-secondary-soft p-10px text-start text-xs font-normal leading-5 text-text-neutral-secondary">
              自由現金流量
            </td>
            <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs font-normal leading-5 text-text-neutral-secondary">
              {reportFinancial?.otherInfo?.freeCash[currentYear]?.freeCash === 0
                ? '-'
                : reportFinancial?.otherInfo?.freeCash[currentYear]?.freeCash < 0
                  ? `(${Math.abs(reportFinancial?.otherInfo?.freeCash[currentYear]?.freeCash).toLocaleString()})`
                  : reportFinancial?.otherInfo?.freeCash[currentYear]?.freeCash.toLocaleString()}
            </td>
            <td className="border border-stroke-brand-secondary-soft p-10px text-end text-xs font-normal leading-5 text-text-neutral-secondary">
              {reportFinancial?.otherInfo?.freeCash[previousYear]?.freeCash === 0
                ? '-'
                : reportFinancial?.otherInfo?.freeCash[previousYear]?.freeCash < 0
                  ? `(${Math.abs(reportFinancial?.otherInfo?.freeCash[previousYear]?.freeCash).toLocaleString()})`
                  : reportFinancial?.otherInfo?.freeCash[previousYear]?.freeCash.toLocaleString()}
            </td>
          </tr>
        </tbody>
      ) : (
        <tbody></tbody>
      );

    return (
      <div className="mt-4">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr className="bg-surface-brand-primary-soft">
              <th className="border border-stroke-brand-secondary-soft p-10px text-left text-xxs font-semibold leading-5 text-text-neutral-secondary"></th>
              <th className="border border-stroke-brand-secondary-soft p-10px text-center text-xxs font-semibold leading-5 text-text-neutral-secondary">
                {currentYear}年度
              </th>
              <th className="border border-stroke-brand-secondary-soft p-10px text-center text-xxs font-semibold leading-5 text-text-neutral-secondary">
                {previousYear}年度
              </th>
            </tr>
          </thead>
          {displayedTableBody}
        </table>
      </div>
    );
  };

  const ItemSummary = (
    <div id="1" className="relative overflow-y-hidden">
      <section className="mx-1 text-text-neutral-secondary">
        <div className="relative z-1 mb-16px flex justify-between font-semibold text-surface-brand-secondary">
          <div className="flex items-center">
            <p>項目彙總格式</p>
            <CollapseButton onClick={toggleSummaryTable} isCollapsed={isSummaryCollapsed} />
          </div>
          <p>單位：新台幣元</p>
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
        <div className="mb-1 mt-8 flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <div className="flex items-center">
            <p>細項分類格式</p>
            <CollapseButton onClick={toggleDetailTable} isCollapsed={isDetailCollapsed} />
          </div>
          <p>單位：新台幣元</p>
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
      <section className="relative mx-3 text-xs text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>
            {' '}
            {reportFinancial && reportFinancial.otherInfo && reportFinancial.otherInfo.thirdTitle}
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
              <p className="my-auto items-center text-center text-xs font-semibold">A和B比例關係</p>
              <div className="absolute bottom-0 left-0 h-px w-full bg-stroke-neutral-secondary"></div>
            </div>
            <div className="mb-16 flex">
              <div className="mt-18px w-3/5">
                <LineChart data={lineChartData} labels={lineChartLabels} />
              </div>
              <div className="mt-18px w-2/5 pl-8 text-xs">
                <p>A. 稅前淨利(淨損)+折舊及攤銷費用-支付的所得稅</p>
                <p>B. 營業活動的現金流入(流出)</p>
              </div>
            </div>
            <div className="mb-1 mt-2 flex justify-between text-xs font-semibold text-surface-brand-secondary">
              <p>圖表金額來源彙總：</p>
            </div>
            <table className="relative w-full border-collapse bg-white">
              <thead>
                <tr className="text-xxs">
                  <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold"></th>
                  {lineChartLabels?.map((label) => (
                    <th
                      key={label}
                      className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-xs">
                <tr>
                  <td className="border border-stroke-brand-secondary-soft p-10px font-semibold">
                    A
                  </td>
                  {Object.keys(reportFinancial.otherInfo.operatingStabilized.beforeIncomeTax).map(
                    (year) => (
                      <td
                        key={year}
                        className="border border-stroke-brand-secondary-soft p-10px font-semibold"
                      ></td>
                    )
                  )}
                </tr>
                <tr>
                  <td className="border border-stroke-brand-secondary-soft p-10px">
                    稅前淨利（淨損）
                  </td>
                  {Object.entries(
                    reportFinancial.otherInfo.operatingStabilized.beforeIncomeTax
                  ).map(([year, value]) => (
                    <td
                      key={year}
                      className="border border-stroke-brand-secondary-soft p-10px text-end"
                    >
                      {value === 0
                        ? '-'
                        : value < 0
                          ? `(${Math.abs(value).toLocaleString()})`
                          : value.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border border-stroke-brand-secondary-soft p-10px">
                    折舊及攤銷費用
                  </td>
                  {Object.keys(reportFinancial.otherInfo.operatingStabilized.beforeIncomeTax).map(
                    (year) => (
                      <td
                        key={year}
                        className="border border-stroke-brand-secondary-soft p-10px text-end"
                      >
                        {
                          reportFinancial.otherInfo.operatingStabilized.amortizationDepreciation[
                            year
                          ] === 0
                            ? '-' // Info: (20241021 - Anna) 如果數字是 0，顯示 "-"
                            : reportFinancial.otherInfo.operatingStabilized
                                  .amortizationDepreciation[year] < 0
                              ? `(${Math.abs(
                                  reportFinancial.otherInfo.operatingStabilized
                                    .amortizationDepreciation[year]
                                ).toLocaleString()})` // Info: (20241021 - Anna) 負數用括號並加千分位
                              : reportFinancial.otherInfo.operatingStabilized.amortizationDepreciation[
                                  year
                                ].toLocaleString() // Info: (20241021 - Anna) 正數顯示千分位
                        }
                      </td>
                    )
                  )}
                </tr>
                <tr>
                  <td className="border border-stroke-brand-secondary-soft p-10px">支付的所得稅</td>
                  {Object.entries(reportFinancial.otherInfo.operatingStabilized.tax).map(
                    ([year, value]) => (
                      <td
                        key={year}
                        className="border border-stroke-brand-secondary-soft p-10px text-end"
                      >
                        {value === 0
                          ? '-'
                          : value < 0
                            ? `(${Math.abs(value).toLocaleString()})`
                            : value.toLocaleString()}
                      </td>
                    )
                  )}
                </tr>
                <tr>
                  <td className="border border-stroke-brand-secondary-soft p-10px font-semibold">
                    B
                  </td>
                  {Object.keys(reportFinancial.otherInfo.operatingStabilized.beforeIncomeTax).map(
                    (year) => (
                      <td
                        key={year}
                        className="border border-stroke-brand-secondary-soft p-10px font-semibold"
                      ></td>
                    )
                  )}
                </tr>
                <tr>
                  <td className="border border-stroke-brand-secondary-soft p-10px">
                    營業活動的現金
                  </td>
                  {Object.entries(
                    reportFinancial.otherInfo.operatingStabilized.operatingIncomeCashFlow
                  ).map(([year, value]) => (
                    <td
                      key={year}
                      className="border border-stroke-brand-secondary-soft p-10px text-end"
                    >
                      {value === 0
                        ? '-'
                        : value < 0
                          ? `(${Math.abs(value).toLocaleString()})`
                          : value.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border border-stroke-brand-secondary-soft p-10px"></td>
                  {Object.keys(reportFinancial.otherInfo.operatingStabilized.beforeIncomeTax).map(
                    (year) => (
                      <td
                        key={year}
                        className="border border-stroke-brand-secondary-soft p-10px"
                      ></td>
                    )
                  )}
                </tr>
                <tr>
                  <td className="border border-stroke-brand-secondary-soft p-10px">A和B比例關係</td>
                  {Object.entries(reportFinancial.otherInfo.operatingStabilized.ratio).map(
                    ([year, value]) => (
                      <td
                        key={year}
                        className="border border-stroke-brand-secondary-soft p-10px text-end"
                      >
                        {value.toFixed(2)}
                      </td>
                    )
                  )}
                </tr>
              </tbody>
            </table>
          </>
        ) : null}
      </section>
    </div>
  );
  const investmentRatio = (
    <div id="4" className="relative overflow-hidden">
      <section className="relative mx-1 text-xs text-text-neutral-secondary">
        <div className="mb-16px mt-32px font-semibold text-surface-brand-secondary">
          <p className="break-words text-xs font-semibold leading-tight">
            {reportFinancial && reportFinancial.otherInfo && reportFinancial.otherInfo.fourthTitle}
          </p>
        </div>
        <div className="mx-1 mt-8 flex items-end justify-between">
          <div className="w-1/2">
            <div className="relative mb-0 flex items-center pb-1">
              <Image
                src="/icons/bar_chart_icon.svg"
                alt=""
                className="mr-2"
                width={24}
                height={24}
              />
              <p className="my-auto items-end text-xs font-semibold text-text-neutral-secondary">
                {curYear}年度投資活動項目佔比
              </p>
              <div className="absolute bottom-0 left-0 h-px w-full bg-stroke-neutral-secondary"></div>
            </div>
            <BarChart data={curBarChartData} labels={curBarChartLabels} />
          </div>
          <div className="w-1/2">
            <div className="relative mb-0 flex items-center pb-1">
              <Image
                src="/icons/bar_chart_icon.svg"
                alt=""
                className="mr-2"
                width={24}
                height={24}
              />
              <p className="my-auto items-end text-xs font-semibold text-text-neutral-secondary">
                {preYear}年度投資活動項目佔比
              </p>
              <div className="absolute bottom-0 left-0 h-px w-full bg-stroke-neutral-secondary"></div>
            </div>
            <BarChart data={preBarChartData} labels={preBarChartLabels} />
          </div>
        </div>
        <div className="mb-16px mt-4 font-semibold text-surface-brand-secondary">
          <p className="text-xs font-semibold">{curYear}年度上圖組成項目之細項及iSunFa認為：</p>
        </div>
        <div id="5" className="relative overflow-hidden">
          <section className="relative mx-3 text-xs text-text-neutral-secondary">
            <div className="mb-16px mt-32px text-xs font-semibold leading-5 text-surface-brand-secondary"></div>
            {renderedInvestmentRatio()}
          </section>
        </div>
      </section>
    </div>
  );
  const freeCashFlow = (
    <div id="6" className="relative overflow-hidden">
      <section className="relative mx-3 text-xs text-text-neutral-secondary">
        <div className="mb-16px mt-32px text-xs font-semibold leading-5 text-surface-brand-secondary"></div>
        <div className="mb-4 mt-32px text-center text-xs font-semibold leading-5 text-surface-brand-secondary">
          <p className="text-start text-xs font-semibold">
            年度產生的自由現金：公司可以靈活運用的現金
          </p>
          {renderedFreeCashFlow(curYear, preYear)}
        </div>
      </section>
    </div>
  );

  return (
    <div className="mx-auto w-full origin-top overflow-x-auto">
      {ItemSummary}
      {ItemDetail}
      {operatingCF5Y}
      {investmentRatio}
      {freeCashFlow}
    </div>
  );
};

export default CashFlowStatementList;
