import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { CashFlowStatementReport, FinancialReportItem } from '@/interfaces/report';
import APIHandler from '@/lib/utils/api_handler';
import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import LineChart from '@/components/cash_flow_statement_report_body/line_chart';
import BarChart from '@/components/cash_flow_statement_report_body/bar_chart';
import Image from 'next/image';
import { NON_EXISTING_REPORT_ID } from '@/constants/config';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import useStateRef from 'react-usestateref';
import { timestampToString } from '@/lib/utils/common';
import { useTranslation } from 'next-i18next';
import { DecimalOperations } from '@/lib/utils/decimal_operations';

interface ICashFlowStatementReportBodyAllProps {
  reportId: string;
}

const CashFlowStatementReportBodyAll = ({ reportId }: ICashFlowStatementReportBodyAllProps) => {
  const { t } = useTranslation(['reports']);
  const { connectedAccountBook } = useUserCtx();

  const [financialReport, setFinancialReport] = useState<CashFlowStatementReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGetFinancialReportSuccess, setIsGetFinancialReportSuccess] = useState<boolean>(false);
  const [errorCode, setErrorCode] = useState<string>('');

  const { trigger: getFinancialReportAPI } = APIHandler<CashFlowStatementReport>(
    APIName.REPORT_GET_BY_ID
  );

  useEffect(() => {
    if (isLoading) return;
    setIsLoading(true);

    const getFinancialReport = async () => {
      try {
        const {
          data: reportFinancial,
          code: getFRCode,
          success: getFRSuccess,
        } = await getFinancialReportAPI({
          params: {
            companyId: 1,
            reportId: reportId ?? NON_EXISTING_REPORT_ID,
            accountBookId: connectedAccountBook?.id,
          },
        });

        if (!getFRSuccess) {
          return;
        }

        setFinancialReport(reportFinancial);
        setIsGetFinancialReportSuccess(getFRSuccess);
        setErrorCode(getFRCode);
      } finally {
        setIsLoading(false);
      }
    };

    getFinancialReport();
  }, [reportId]);

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

  useEffect(() => {
    if (isGetFinancialReportSuccess === true && financialReport) {
      const currentFrom = timestampToString(financialReport.curDate.from ?? 0);
      const currentTo = timestampToString(financialReport.curDate.to ?? 0);
      const previousFrom = timestampToString(financialReport.preDate.from ?? 0);
      const previousTo = timestampToString(financialReport.preDate.to ?? 0);
      const currentYear = currentTo.year;
      const previousYear = previousTo.year;

      if (financialReport.otherInfo?.lineChartDataForRatio) {
        setLineChartData(financialReport.otherInfo.lineChartDataForRatio.data);
        setLineChartLabels(financialReport.otherInfo.lineChartDataForRatio.labels);
      }

      if (financialReport.otherInfo?.strategyInvest) {
        const curInvestment = financialReport.otherInfo.strategyInvest[currentYear];
        const preInvestment = financialReport.otherInfo.strategyInvest[previousYear];

        setCurBarChartData(curInvestment.data);
        setCurBarChartLabels(curInvestment.labels);
        setPreBarChartData(preInvestment.data);
        setPreBarChartLabels(preInvestment.labels);
      }

      setFirstThought(financialReport?.otherInfo?.ourThoughts?.[0]);
      setSecondThought(financialReport?.otherInfo?.ourThoughts?.[1]);
      setThirdThought(financialReport?.otherInfo?.ourThoughts?.[2]);

      setCurDate({ from: currentFrom.date, to: currentTo.date });
      setCurYear(currentYear);
      setPreDate({ from: previousFrom.date, to: previousTo.date });
      setPreYear(previousYear);
    }
  }, [financialReport]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
        <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
      </div>
    );
  } else if (
    !isGetFinancialReportSuccess ||
    !financialReport ||
    !Object.prototype.hasOwnProperty.call(financialReport, 'otherInfo') ||
    !financialReport.otherInfo ||
    !Object.prototype.hasOwnProperty.call(financialReport.otherInfo, 'operatingStabilized') ||
    !Object.prototype.hasOwnProperty.call(financialReport.otherInfo, 'lineChartDataForRatio') ||
    !Object.prototype.hasOwnProperty.call(financialReport.otherInfo, 'strategyInvest') ||
    !Object.prototype.hasOwnProperty.call(financialReport.otherInfo, 'freeCash')
  ) {
    return <div>Error {errorCode}</div>;
  }

  const renderedFooter = (pageNumber: number) => {
    return (
      <footer className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between bg-surface-brand-secondary p-10px">
        <p className="m-0 text-xs text-white">{pageNumber}</p>
        <div className="text-base font-bold text-surface-brand-secondary">
          <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    );
  };

  const renderTable = (data: FinancialReportItem[], startIndex: number, endIndex: number) => {
    // Info: (20250219 - Anna) 判斷是否為「標題列」：如果 `code` 為空值，則視為標題列
    const isTitleRow = (value: FinancialReportItem) => !value.code;

    // Info: (20250219 - Anna) 過濾掉 curPeriodAmount 和 prePeriodAmount 皆為 0 的列
    const filteredData = data.filter(
      (value) =>
        isTitleRow(value) ||
        !DecimalOperations.isZero(value.curPeriodAmount ?? '0') ||
        !DecimalOperations.isZero(value.prePeriodAmount ?? '0')
    );

    // Info: (20250217 - Anna) 如果 `slice(startIndex, endIndex)` 內沒有資料，回傳 null，避免渲染該區間
    const slicedData = filteredData.slice(startIndex, endIndex);
    if (slicedData.length === 0) return null;

    return (
      <table className="relative w-full border-collapse bg-white">
        <thead>
          <tr>
            <th className="w-55px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
              {t('reports:TAX_REPORT.CODE_NUMBER')}
            </th>
            <th className="w-260px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
              {t('reports:REPORTS.ACCOUNTING_ITEMS')}
            </th>
            <th className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
              {curDate.from} <br />至{curDate.to}
            </th>
            <th className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
              {preDate.from} <br />至{preDate.to}
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredData.slice(startIndex, endIndex).map((value, index) => {
            if (!value.code) {
              return (
                <tr key={`${value.code + value.name + index}`}>
                  <td
                    colSpan={6}
                    className="border border-stroke-neutral-quaternary p-10px text-xs font-bold"
                  >
                    {value.name}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={value.code}>
                <td className="border border-stroke-neutral-quaternary p-10px text-xs">
                  {value.code}
                </td>
                <td className="border border-stroke-neutral-quaternary p-10px text-xs">
                  {value.name}
                </td>
                <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                  {
                    DecimalOperations.isZero(value.curPeriodAmount)
                      ? '-' // Info: (20241021 - Anna) 如果數字是 0，顯示 "-"
                      : DecimalOperations.isNegative(value.curPeriodAmount)
                        ? `(${DecimalOperations.abs(value.curPeriodAmount)})` // Info: (20241021 - Anna) 負數，顯示括號和千分位
                        : value.curPeriodAmount // Info: (20241021 - Anna) 正數，顯示千分位
                  }
                </td>
                <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                  {
                    DecimalOperations.isZero(value.prePeriodAmount)
                      ? '-' // Info: (20241021 - Anna) 如果數字是 0，顯示 "-"
                      : DecimalOperations.isNegative(value.prePeriodAmount)
                        ? `(${DecimalOperations.abs(value.prePeriodAmount)})` // Info: (20241021 - Anna) 負數，顯示括號和千分位
                        : value.prePeriodAmount // Info: (20241021 - Anna) 正數，顯示千分位
                  }
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const renderedPage10part1 = () => {
    return (
      <div className="mt-4 text-text-neutral-primary">
        <h3 className="text-xs font-semibold leading-6">{t('reports:REPORTS.PPE')}</h3>
        <ol className="list-decimal pl-6 text-xs font-normal leading-5 text-text-neutral-primary">
          {firstThought?.split('\n').map((line, index) => (
            <li key={`${line + index}`} className="mb-2 ml-1">
              {t(`reports:REPORTS.${line}`)}
            </li>
          ))}
        </ol>

        <h3 className="mt-4 text-xs font-semibold leading-6">
          {t('reports:REPORTS.STRATEGIC_INVESTMENTS')}
        </h3>
        <ol className="list-decimal pl-6 text-xs font-normal leading-5 text-text-neutral-primary">
          {secondThought?.split('\n').map((line, index) => (
            <li key={`${line + index}`} className="mb-2 ml-1">
              {t(`reports:REPORTS.${line}`)}
            </li>
          ))}
        </ol>
        <h3 className="mt-4 text-xs font-semibold leading-6">{t('reports:REPORTS.OTHERS')}</h3>
        <ol className="list-decimal pl-6 text-xs font-normal leading-5 text-text-neutral-primary">
          {thirdThought?.split('\n').map((line: string) => (
            <li key={line} className="mb-2 ml-1">
              {t(`reports:REPORTS.${line}`)}
            </li>
          ))}
        </ol>
      </div>
    );
  };

  const renderedPage11part2 = (currentYear: string, previousYear: string) => {
    if (!financialReport?.otherInfo?.freeCash) {
      return null;
    }

    const displayedTableBody =
      financialReport?.otherInfo?.freeCash[currentYear] &&
      financialReport?.otherInfo?.freeCash[previousYear] ? (
        <tbody>
          <tr>
            <td className="border border-stroke-neutral-quaternary p-10px text-start text-xs font-normal leading-5 text-text-neutral-secondary">
              營業活動現金流入
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs font-normal leading-5 text-text-neutral-secondary">
              {DecimalOperations.isZero(financialReport?.otherInfo?.freeCash[currentYear]?.operatingCashFlow)
                ? '-' // Info: (20241021 - Anna) 如果是 0，顯示 "-"
                : DecimalOperations.isNegative(financialReport?.otherInfo?.freeCash[currentYear]?.operatingCashFlow)
                  ? `(${DecimalOperations.abs(financialReport?.otherInfo?.freeCash[currentYear]?.operatingCashFlow)})` // Info: (20241021 - Anna) 如果是負數，使用括號表示，並加千分位
                  : financialReport?.otherInfo?.freeCash[
                      currentYear
                    ]?.operatingCashFlow}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs font-normal leading-5 text-text-neutral-secondary">
              {financialReport?.otherInfo?.freeCash[previousYear]?.operatingCashFlow === 0
                ? '-' // Info: (20241021 - Anna) 如果是 0，顯示 "-"
                : financialReport?.otherInfo?.freeCash[previousYear]?.operatingCashFlow < 0
                  ? `(${Math.abs(financialReport?.otherInfo?.freeCash[previousYear]?.operatingCashFlow).toLocaleString()})` // Info: (20241021 - Anna) 如果是負數，使用括號表示，並加千分位
                  : financialReport?.otherInfo?.freeCash[
                      previousYear
                    ]?.operatingCashFlow.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td className="border border-stroke-neutral-quaternary p-10px text-start text-xs font-normal leading-5 text-text-neutral-secondary">
              不動產、廠房及設備
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs font-normal leading-5 text-text-neutral-secondary">
              {financialReport?.otherInfo?.freeCash[currentYear]?.ppe === 0
                ? '-' // Info: (20241021 - Anna) 如果是 0，顯示 "-"
                : financialReport?.otherInfo?.freeCash[currentYear]?.ppe < 0
                  ? `(${Math.abs(financialReport?.otherInfo?.freeCash[currentYear]?.ppe).toLocaleString()})` // Info: (20241021 - Anna) 如果是負數，使用括號表示，並加千分位
                  : financialReport?.otherInfo?.freeCash[currentYear]?.ppe.toLocaleString()}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs font-normal leading-5 text-text-neutral-secondary">
              {financialReport?.otherInfo?.freeCash[previousYear]?.ppe === 0
                ? '-' // Info: (20241021 - Anna) 如果是 0，顯示 "-"
                : financialReport?.otherInfo?.freeCash[previousYear]?.ppe < 0
                  ? `(${Math.abs(financialReport?.otherInfo?.freeCash[previousYear]?.ppe).toLocaleString()})` // Info: (20241021 - Anna) 如果是負數，使用括號表示，並加千分位
                  : financialReport?.otherInfo?.freeCash[previousYear]?.ppe.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td className="border border-stroke-neutral-quaternary p-10px text-start text-xs font-normal leading-5 text-text-neutral-secondary">
              無形資產支出
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs font-normal leading-5 text-text-neutral-secondary">
              {financialReport?.otherInfo?.freeCash[currentYear]?.intangibleAsset === 0
                ? '-' // Info: (20241021 - Anna) 如果是 0，顯示 "-"
                : financialReport?.otherInfo?.freeCash[currentYear]?.intangibleAsset < 0
                  ? `(${Math.abs(financialReport?.otherInfo?.freeCash[currentYear]?.intangibleAsset).toLocaleString()})` // Info: (20241021 - Anna) 如果是負數，使用括號表示，並加千分位
                  : financialReport?.otherInfo?.freeCash[
                      currentYear
                    ]?.intangibleAsset.toLocaleString()}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs font-normal leading-5 text-text-neutral-secondary">
              {financialReport?.otherInfo?.freeCash[previousYear]?.intangibleAsset === 0
                ? '-' // Info: (20241021 - Anna) 如果是 0，顯示 "-"
                : financialReport?.otherInfo?.freeCash[previousYear]?.intangibleAsset < 0
                  ? `(${Math.abs(financialReport?.otherInfo?.freeCash[previousYear]?.intangibleAsset).toLocaleString()})` // Info: (20241021 - Anna) 如果是負數，使用括號表示，並加千分位
                  : financialReport?.otherInfo?.freeCash[
                      previousYear
                    ]?.intangibleAsset.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td className="border border-stroke-neutral-quaternary p-10px text-start text-xs font-normal leading-5 text-text-neutral-secondary">
              自由現金流量
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs font-normal leading-5 text-text-neutral-secondary">
              {financialReport?.otherInfo?.freeCash[currentYear]?.freeCash === 0
                ? '-' // Info: (20241021 - Anna) 如果是 0，顯示 "-"
                : financialReport?.otherInfo?.freeCash[currentYear]?.freeCash < 0
                  ? `(${Math.abs(financialReport?.otherInfo?.freeCash[currentYear]?.freeCash).toLocaleString()})` // Info: (20241021 - Anna) 如果是負數，使用括號表示，並加千分位
                  : financialReport?.otherInfo?.freeCash[currentYear]?.freeCash.toLocaleString()}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs font-normal leading-5 text-text-neutral-secondary">
              {financialReport?.otherInfo?.freeCash[previousYear]?.freeCash === 0
                ? '-' // Info: (20241021 - Anna) 如果是 0，顯示 "-"
                : financialReport?.otherInfo?.freeCash[previousYear]?.freeCash < 0
                  ? `(${Math.abs(financialReport?.otherInfo?.freeCash[previousYear]?.freeCash).toLocaleString()})` // Info: (20241021 - Anna) 如果是負數，使用括號表示，並加千分位
                  : financialReport?.otherInfo?.freeCash[previousYear]?.freeCash.toLocaleString()}
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
            <tr className="bg-surface-brand-primary-50">
              <th className="border border-stroke-neutral-quaternary p-10px text-left text-xs font-semibold leading-5 text-text-neutral-secondary"></th>
              <th className="border border-stroke-neutral-quaternary p-10px text-center text-xs font-semibold leading-5 text-text-neutral-secondary">
                {t('reports:REPORTS.YEAR_TEMPLATE', { year: currentYear })}
              </th>
              <th className="border border-stroke-neutral-quaternary p-10px text-center text-xs font-semibold leading-5 text-text-neutral-secondary">
                {t('reports:REPORTS.YEAR_TEMPLATE', { year: previousYear })}
              </th>
            </tr>
          </thead>
          {displayedTableBody}
        </table>
      </div>
    );
  };
  // Info: (20250217 - Anna) 只有當 financialReport.general 有數據時才渲染，否則返回 null
  const page1Table = financialReport?.general ? renderTable(financialReport.general, 0, 10) : null;
  const page1 = page1Table && (
    <div id="1" className="relative h-a4-height overflow-hidden">
      <header className="mb-10 flex justify-between text-white">
        <div className="w-30% bg-surface-brand-secondary pb-14px pl-10px pr-14px pt-40px font-bold">
          <div className="">
            {financialReport && financialReport.company && (
              <>
                <h1 className="mb-30px text-h6">
                  {financialReport.company.code} <br />
                  {financialReport.company.name}
                </h1>
                <p className="text-left text-xs font-bold leading-5">
                  <span>
                    {curDate.from} <br />至{curDate.to} <br />
                  </span>
                  <span className="mt-3 block">財務報告 - 現金流量表</span>
                </p>
              </>
            )}
          </div>
        </div>
        <div className="box-border w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <div className="flex items-center">
            <p>{t('reports:REPORTS.ITEM_SUMMARY_FORMAT')}</p>
          </div>
          <p>
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {financialReport.company.accountingSetting?.currency}
          </p>
        </div>
        {page1Table}
      </section>
    </div>
  );
  const page2Table = financialReport?.general ? renderTable(financialReport.general, 10, 19) : null;
  const page2 = page2Table && (
    <div id="2" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="mb-1 mt-8 flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>{t('reports:REPORTS.ITEM_SUMMARY_FORMAT')}</p>
          <p>
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {financialReport.company.accountingSetting?.currency}
          </p>
        </div>
        {page2Table}
        <div className="relative -z-10">
          <Image
            className="absolute -top-300px right-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>

        <div className="relative bottom-20 right-0 -z-10">
          <Image
            className="absolute right-0 top-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>
      </section>
    </div>
  );
  const page3Table = financialReport?.details ? renderTable(financialReport.details, 0, 13) : null;
  const page3 = page3Table && (
    <div id="3" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="mb-1 mt-8 flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>{t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}</p>
          <p>
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {financialReport.company.accountingSetting?.currency}
          </p>
        </div>
        {page3Table}

        <div className="relative bottom-20 right-0 -z-10">
          <Image
            className="absolute right-0 top-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>
      </section>
    </div>
  );
  const page4Table = financialReport?.details ? renderTable(financialReport.details, 13, 26) : null;
  const page4 = page4Table && (
    <div id="4" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="mb-1 mt-8 flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>{t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}</p>
          <p>
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {financialReport.company.accountingSetting?.currency}
          </p>
        </div>
        {page4Table}

        <div className="relative bottom-20 right-0 -z-10">
          <Image
            className="absolute right-0 top-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>
      </section>
    </div>
  );
  const page5Table = financialReport?.details ? renderTable(financialReport.details, 26, 41) : null;
  const page5 = page5Table && (
    <div id="5" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="mb-1 mt-8 flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>{t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}</p>
          <p>
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {financialReport.company.accountingSetting?.currency}
          </p>
        </div>
        {page5Table}

        <div className="relative bottom-20 right-0 -z-10">
          <Image
            className="absolute right-0 top-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>
      </section>
    </div>
  );
  const page6Table = financialReport?.details ? renderTable(financialReport.details, 41, 55) : null;
  const page6 = page6Table && (
    <div id="6" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="mb-1 mt-8 flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>{t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}</p>
          <p>
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {financialReport.company.accountingSetting?.currency}
          </p>
        </div>
        {page6Table}

        <div className="relative bottom-20 right-0 -z-10">
          <Image
            className="absolute right-0 top-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>
      </section>
    </div>
  );
  const page7Table = financialReport?.details ? renderTable(financialReport.details, 55, 70) : null;
  const page7 = page7Table && (
    <div id="7" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="mb-1 mt-8 flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>{t('reports:REPORTS.ITEM_SUMMARY_FORMAT')}</p>
          <p>
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {financialReport.company.accountingSetting?.currency}
          </p>
        </div>
        {page7Table}

        <div className="relative bottom-20 right-0 -z-10">
          <Image
            className="absolute right-0 top-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>
      </section>
    </div>
  );
  const page8 = (
    <div id="8" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-3 text-xs text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>
            {' '}
            {financialReport && financialReport.otherInfo && financialReport.otherInfo.thirdTitle}
          </p>
        </div>
        {financialReport &&
        financialReport.otherInfo &&
        Object.prototype.hasOwnProperty.call(financialReport.otherInfo, 'operatingStabilized') ? (
          <>
            <div className="relative mb-0 flex items-center pb-1">
              <Image
                src="/icons/line_chart_icon.svg"
                alt=""
                className="mr-2"
                width={24}
                height={24}
              />
              <p className="my-auto items-center text-center text-xs font-semibold">
                {t('reports:REPORTS.RATIO_A_B')}
              </p>
              <div className="absolute bottom-0 left-0 h-px w-full bg-stroke-neutral-secondary"></div>
            </div>
            <div className="mb-16 flex">
              <div className="mt-18px w-3/5">
                <LineChart data={lineChartData.map(val => parseFloat(val))} labels={lineChartLabels} />
              </div>
              <div className="mt-18px w-2/5 pl-8 text-xs">
                <p className="mb-1 text-xs">
                  <span className="mr-1">A.</span>
                  <span>{t('reports:REPORTS.PBT_DA_TAXES_PAID')}</span>
                </p>
                <p className="text-xs">
                  <span className="mr-1">B.</span>
                  <span>{t('reports:REPORTS.OPERATION_CASH_FLOW')}</span>
                </p>
              </div>
            </div>
            <div className="mb-1 mt-2 flex justify-between text-xs font-semibold text-surface-brand-secondary">
              <p>{t('reports:REPORTS.CHART_SOURCE')}</p>
            </div>
            <table className="relative w-full border-collapse bg-white">
              <thead>
                <tr className="text-xs">
                  <th className="w-300px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold"></th>
                  {lineChartLabels?.map((label, index) => (
                    <th
                      key={`${label + index}`}
                      className="w-150px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-xs">
                <tr>
                  <td className="border border-stroke-neutral-quaternary p-10px text-xs font-semibold">
                    A
                  </td>
                  {Object.keys(financialReport.otherInfo.operatingStabilized.beforeIncomeTax).map(
                    (year) => (
                      <td
                        key={`${year}_A`}
                        className="border border-stroke-neutral-quaternary p-10px font-semibold"
                      ></td>
                    )
                  )}
                </tr>
                <tr>
                  <td className="border border-stroke-neutral-quaternary p-10px text-xs">
                    {t('reports:REPORTS.PBT')}
                  </td>
                  {Object.entries(
                    financialReport.otherInfo.operatingStabilized.beforeIncomeTax
                  ).map(([year, value]) => (
                    <td
                      key={`${year}_b`}
                      className="border border-stroke-neutral-quaternary p-10px text-end"
                    >
                      {
                        value === 0
                          ? '-' // Info: (20241021 - Anna) 如果數字是 0，顯示 "-"
                          : value < 0
                            ? `(${Math.abs(value).toLocaleString()})` // Info: (20241021 - Anna) 負數，顯示括號和千分位
                            : value.toLocaleString() // Info: (20241021 - Anna) 正數，顯示千分位
                      }
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border border-stroke-neutral-quaternary p-10px text-xs">
                    {t('reports:REPORTS.DA')}
                  </td>
                  {Object.keys(financialReport.otherInfo.operatingStabilized.beforeIncomeTax).map(
                    (year) => (
                      <td
                        key={`${year}_c`}
                        className="border border-stroke-neutral-quaternary p-10px text-end"
                      >
                        {
                          financialReport.otherInfo.operatingStabilized.amortizationDepreciation[
                            year
                          ] === 0
                            ? '-' // Info: (20241021 - Anna) 如果是 0，顯示 "-"
                            : financialReport.otherInfo.operatingStabilized
                                  .amortizationDepreciation[year] < 0
                              ? `(${Math.abs(
                                  financialReport.otherInfo.operatingStabilized
                                    .amortizationDepreciation[year]
                                ).toLocaleString()})` // Info: (20241021 - Anna) 負數用括號並加千分位
                              : financialReport.otherInfo.operatingStabilized.amortizationDepreciation[
                                  year
                                ].toLocaleString() // Info: (20241021 - Anna) 正數顯示千分位
                        }
                      </td>
                    )
                  )}
                </tr>
                <tr>
                  <td className="border border-stroke-neutral-quaternary p-10px text-xs">
                    {t('reports:REPORTS.INCOME_TAXES_PAID')}
                  </td>
                  {Object.entries(financialReport.otherInfo.operatingStabilized.tax).map(
                    ([year, value]) => (
                      <td
                        key={`${year}_d`}
                        className="border border-stroke-neutral-quaternary p-10px text-end"
                      >
                        {
                          value === 0
                            ? '-' // Info: (20241021 - Anna) 如果數字是 0，顯示 "-"
                            : value < 0
                              ? `(${Math.abs(value).toLocaleString()})` // Info: (20241021 - Anna) 負數，顯示括號和千分位
                              : value.toLocaleString() // Info: (20241021 - Anna) 正數，顯示千分位
                        }
                      </td>
                    )
                  )}
                </tr>
                <tr>
                  <td className="border border-stroke-neutral-quaternary p-10px text-xs font-semibold">
                    B
                  </td>
                  {Object.keys(financialReport.otherInfo.operatingStabilized.beforeIncomeTax).map(
                    (year) => (
                      <td
                        key={`${year}_B`}
                        className="border border-stroke-neutral-quaternary p-10px font-semibold"
                      ></td>
                    )
                  )}
                </tr>
                <tr>
                  <td className="border border-stroke-neutral-quaternary p-10px text-xs">
                    {t('reports:REPORTS.CASH_FROM_OPERATING')}
                  </td>
                  {Object.entries(
                    financialReport.otherInfo.operatingStabilized.operatingIncomeCashFlow
                  ).map(([year, value]) => (
                    <td
                      key={`${year}_e`}
                      className="border border-stroke-neutral-quaternary p-10px text-end"
                    >
                      {value === 0
                        ? '-' // Info: (20241021 - Anna) 如果是 0，顯示 "-"
                        : value < 0
                          ? `(${Math.abs(value).toLocaleString()})` // Info: (20241021 - Anna) 負數用括號並加千分位
                          : value.toLocaleString()}{' '}
                      {/* Info: (20241021 - Anna) 正數，顯示千分位 */}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border border-stroke-neutral-quaternary p-16px"></td>
                  {Object.keys(financialReport.otherInfo.operatingStabilized.beforeIncomeTax).map(
                    (year) => (
                      <td
                        key={`${year}_f`}
                        className="border border-stroke-neutral-quaternary p-10px"
                      ></td>
                    )
                  )}
                </tr>
                <tr>
                  <td className="border border-stroke-neutral-quaternary p-10px text-xs">
                    {t('reports:REPORTS.RATIO_A_B')}
                  </td>
                  {Object.entries(financialReport.otherInfo.operatingStabilized.ratio).map(
                    ([year, value]) => (
                      <td
                        key={`${year}_g`}
                        className="border border-stroke-neutral-quaternary p-10px text-end"
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
        <div className="relative bottom-20 right-0 -z-10">
          <Image
            className="absolute right-0 top-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>
      </section>
    </div>
  );
  const page9 = (
    <div id="9" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-xs text-text-neutral-secondary">
        <div className="mb-16px mt-32px font-semibold text-surface-brand-secondary">
          <p className="break-words text-xs font-semibold leading-tight">
            {financialReport && financialReport.otherInfo && financialReport.otherInfo.fourthTitle}
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
                {t('reports:REPORTS.INVESTMENT_PROPORTION', { year: curYear })}
              </p>
              <div className="absolute bottom-0 left-0 h-px w-full bg-stroke-neutral-secondary"></div>
            </div>
            <BarChart data={curBarChartData.map(val => parseFloat(val))} labels={['A', 'B', 'C']} />
            <div className="ml-11 text-xs font-semibold">
              <p>A: {curBarChartLabels[0]}</p>
              <p>B: {curBarChartLabels[1]}</p>
              <p>C: {curBarChartLabels[2]}</p>
            </div>
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
                {t('reports:REPORTS.INVESTMENT_PROPORTION', { year: preYear })}
              </p>
              <div className="absolute bottom-0 left-0 h-px w-full bg-stroke-neutral-secondary"></div>
            </div>
            <BarChart data={preBarChartData.map(val => parseFloat(val))} labels={['A', 'B', 'C']} />
            <div className="ml-8 text-xs font-semibold">
              <p>A: {preBarChartLabels[0]}</p>
              <p>B: {preBarChartLabels[1]}</p>
              <p>C: {preBarChartLabels[2]}</p>
            </div>
          </div>
        </div>
        <div className="relative bottom-20 right-0 -z-10">
          <Image
            className="absolute right-0 top-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>
      </section>
    </div>
  );
  const page10 = (
    <div id="10" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-3 text-xs text-text-neutral-secondary">
        <div className="mb-16px mt-32px text-xs font-semibold leading-5 text-surface-brand-secondary">
          <p className="text-xs font-semibold">
            {financialReport &&
              financialReport.otherInfo &&
              financialReport.otherInfo.fourPointOneTitle}{' '}
          </p>
        </div>
        {renderedPage10part1()}
      </section>
    </div>
  );
  const page11 = (
    <div id="11" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-3 text-xs text-text-neutral-secondary">
        <div className="mb-4 mt-32px text-center text-xs font-semibold leading-5 text-surface-brand-secondary">
          <p className="text-start text-xs font-semibold">
            五、{t('reports:REPORTS.FREE_CASH_FLOW')}
          </p>
          {renderedPage11part2(curYear, preYear)}
          <div className="relative -z-10">
            <Image
              className="absolute -top-180px right-0"
              src="/logo/watermark_logo.svg"
              alt="isunfa logo"
              width={450}
              height={300}
            />
          </div>
        </div>
      </section>
    </div>
  );

  const pages: { component: React.ReactElement; pageNumber: number }[] = [];
  let currentPageNumber = 1; // Info: (20250217 - Anna) 追蹤實際的顯示頁碼

  // Info: (20250217 - Anna) 第一部分：Summary (彙總)
  if (page1) {
    pages.push({ component: page1, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }
  if (page2) {
    pages.push({ component: page2, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }
  // Info: (20250217 - Anna) 第二部分：Details (細項)
  if (page3) {
    pages.push({ component: page3, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }
  if (page4) {
    pages.push({ component: page4, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }
  if (page5) {
    pages.push({ component: page5, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }
  if (page6) {
    pages.push({ component: page6, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }
  if (page7) {
    pages.push({ component: page7, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }
  // Info: (20250217 - Anna) 第三部分：固定的圖表頁 (不受資料長度影響)
  pages.push(
    { component: page8, pageNumber: currentPageNumber },
    { component: page9, pageNumber: currentPageNumber + 1 },
    { component: page10, pageNumber: currentPageNumber + 2 },
    { component: page11, pageNumber: currentPageNumber + 3 }
  );

  // Info: (20250217 - Anna) 在這裡同步更新 `currentPageNumber`，以防後續還有頁面
  currentPageNumber += 4;

  return (
    <div className="mx-auto w-a4-width origin-top overflow-x-auto">
      {pages
        .filter(({ component }) => component) // Info: (20250217 - Anna) 過濾掉 null 或 undefined 的 component
        .map(({ component, pageNumber }, index) => (
          <React.Fragment key={`page-${index + 1}`}>
            {index !== 0 && <hr className="break-before-page" />}
            {React.cloneElement(component, {
              children: [...component.props.children, renderedFooter(pageNumber)],
            })}
          </React.Fragment>
        ))}
    </div>
  );
};

export default CashFlowStatementReportBodyAll;
