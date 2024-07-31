/* eslint-disable tailwindcss/no-arbitrary-value */
// TODO: 在 tailwindcss.config 註冊 css 變數，取消 eslint-disable (20240723 - Shirley Anna)
import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { CashFlowStatementReport, FinancialReportItem } from '@/interfaces/report';
import APIHandler from '@/lib/utils/api_handler';
import React, { useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import LineChart from '@/components/cash_flow_statement_report_body/line_chart';
import BarChart from '@/components/cash_flow_statement_report_body/bar_chart';
import Image from 'next/image';
import { FREE_COMPANY_ID, NON_EXISTING_REPORT_ID } from '@/constants/config';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import useStateRef from 'react-usestateref';
import { timestampToString } from '@/lib/utils/common';

interface ICashFlowStatementReportBodyAllProps {
  reportId: string;
}

const ACCOUNTINGS_WHOLE_COLUMN = [
  '營業活動之現⾦流量－間接法',
  '調整項目',
  '投資活動之現金流量',
  '籌資活動之現金流量',
  '營業活動之現金流量-間接法',
  '與營業活動相關之資產／負債變動數',
  '與營業活動相關之資產之淨變動',
  '與營業活動相關之負債之淨變動',
  '投資活動之現金流量',
  '籌資活動之現金流量',
];

const CashFlowStatementReportBodyAll = ({ reportId }: ICashFlowStatementReportBodyAllProps) => {
  const { selectedCompany } = useUserCtx();

  const {
    data: reportFinancial,
    code: getReportFinancialCode,
    success: getReportFinancialSuccess,
    isLoading: getReportFinancialIsLoading,
  } = APIHandler<CashFlowStatementReport>(APIName.REPORT_FINANCIAL_GET_BY_ID, {
    params: {
      companyId: selectedCompany?.id ?? FREE_COMPANY_ID,
      reportId: reportId ?? NON_EXISTING_REPORT_ID,
    },
  });

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

  // TODO: 測試用，正式上線時需刪除 (20240723 - Shirley Anna)
  // eslint-disable-next-line no-console
  console.log('reportFinancial', reportFinancial);

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

  if (getReportFinancialIsLoading === undefined || getReportFinancialIsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
        <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
      </div>
    );
  } else if (!getReportFinancialSuccess) {
    return <div>Error {getReportFinancialCode}</div>;
  }

  const renderedFooter = (page: number) => {
    return (
      <footer className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between border-t-2 border-solid border-[#e0e0e0] bg-surface-brand-secondary p-10px">
        <p className="m-0 text-xs text-white">{page}</p>
        <div className="text-base font-bold text-surface-brand-secondary">
          <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    );
  };

  const renderTable = (data: FinancialReportItem[], startIndex: number, endIndex: number) => {
    return (
      <table className="relative w-full border-collapse bg-white">
        <thead>
          <tr>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-xs font-semibold">
              代號
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-xs font-semibold">
              會計項目
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-xxs font-semibold">
              {curDate.from}至{curDate.to}
            </th>
            <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-xxs font-semibold">
              {preDate.from}至{preDate.to}
            </th>
          </tr>
        </thead>
        <tbody>
          {data.slice(startIndex, endIndex).map((value) => {
            if (ACCOUNTINGS_WHOLE_COLUMN.includes(value.name)) {
              return (
                <tr key={value.code}>
                  <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-xs font-bold">
                    {value.name}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={value.code}>
                <td className="border border-[#dee2e6] p-[10px] text-xs">{value.code}</td>
                <td className="border border-[#dee2e6] p-[10px] text-xs">{value.name}</td>
                <td className="border border-[#dee2e6] p-[10px] text-end text-xs">
                  {value.curPeriodAmount}
                </td>
                <td className="border border-[#dee2e6] p-[10px] text-end text-xs">
                  {value.prePeriodAmount}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };

  const renderedPage10_1 = () => {
    return (
      <div className="mt-4 text-text-neutral-primary">
        <h3 className="text-base font-semibold leading-[24px] tracking-[0.16px]">
          不動產、廠房、設備的收支項目：
        </h3>
        <ol className="list-decimal pl-6 text-xs font-normal leading-[20px] tracking-[0.12px] text-text-neutral-primary">
          {firstThought?.split('\n').map((line) => (
            <li key={line} className="mb-2 ml-1">
              {line}
            </li>
          ))}
        </ol>

        <h3 className="mt-4 text-base font-semibold leading-[24px] tracking-[0.16px]">
          策略性投資項目：
        </h3>
        <ol className="list-decimal pl-6 text-xs font-normal leading-[20px] tracking-[0.12px] text-text-neutral-primary">
          {secondThought?.split('\n').map((line) => (
            <li key={line} className="mb-2 ml-1">
              {line}
            </li>
          ))}
        </ol>
      </div>
    );
  };

  const renderedPage11_1 = () => {
    return (
      <ol className="list-decimal pl-6 text-xs font-normal leading-[20px] tracking-[0.12px] text-text-neutral-primary">
        {thirdThought?.split('\n').map((line) => (
          <li key={line} className="mb-2 ml-1">
            {line}
          </li>
        ))}
      </ol>
    );
  };

  const renderedPage11_2 = (currentYear: string, previousYear: string) => {
    if (!reportFinancial?.otherInfo?.freeCash) {
      return null;
    }

    const displayedTableBody =
      reportFinancial?.otherInfo?.freeCash[currentYear] &&
        reportFinancial?.otherInfo?.freeCash[previousYear] ? (
        <tbody>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-start text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
              營業活動現金流入
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
              {reportFinancial?.otherInfo?.freeCash[
                currentYear
              ]?.operatingCashFlow.toLocaleString()}
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
              {reportFinancial?.otherInfo?.freeCash[
                previousYear
              ]?.operatingCashFlow.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-start text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
              不動產、廠房及設備
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
              {reportFinancial?.otherInfo?.freeCash[currentYear]?.ppe.toLocaleString()}
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
              {reportFinancial?.otherInfo?.freeCash[previousYear]?.ppe.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-start text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
              無形資產支出
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
              {reportFinancial?.otherInfo?.freeCash[currentYear]?.intangibleAsset.toLocaleString()}
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
              {reportFinancial?.otherInfo?.freeCash[previousYear]?.intangibleAsset.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td className="border border-[#dee2e6] p-[10px] text-start text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
              自由現金流量
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
              {reportFinancial?.otherInfo?.freeCash[currentYear]?.freeCash.toLocaleString()}
            </td>
            <td className="border border-[#dee2e6] p-[10px] text-end text-[12px] font-normal leading-[20px] tracking-[0.12px] text-text-neutral-secondary">
              {reportFinancial?.otherInfo?.freeCash[previousYear]?.freeCash.toLocaleString()}
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
            <tr className="bg-[#ffd892]">
              <th className="border border-[#c1c9d5] p-[10px] text-left text-[10px] font-semibold leading-[20px] tracking-[0.1px] text-text-neutral-secondary"></th>
              <th className="border border-[#c1c9d5] p-[10px] text-center text-[10px] font-semibold leading-[20px] tracking-[0.1px] text-text-neutral-secondary">
                {currentYear}年度
              </th>
              <th className="border border-[#c1c9d5] p-[10px] text-center text-[10px] font-semibold leading-[20px] tracking-[0.1px] text-text-neutral-secondary">
                {previousYear}年度
              </th>
            </tr>
          </thead>
          {displayedTableBody}
        </table>
      </div>
    );
  };

  const page1 = (
    <div id="1" className="relative h-a4-height overflow-hidden">
      <header className="mb-10 flex justify-between text-white">
        <div className="w-30% bg-surface-brand-secondary pb-14px pl-[10px] pr-14px pt-[40px] font-bold">
          <div className="">
            {reportFinancial && reportFinancial.company && (
              <>
                <h1 className="mb-30px text-h6">
                  {reportFinancial.company.code} <br />
                  {reportFinancial.company.name}
                </h1>
                <p className="font-normal">
                  {curDate.from}至{curDate.to} <br />
                  合併財務報告 - 現金流量表
                </p>
              </>
            )}
          </div>
        </div>
        <div className="box-border w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="mb-[16px] flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>一、項目彙總格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        {reportFinancial && reportFinancial.general && renderTable(reportFinancial.general, 0, 10)}
      </section>
      {renderedFooter(1)}
    </div>
  );
  const page2 = (
    <div id="2" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-[29px] flex w-[28%]">
          <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
          <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="mb-1 mt-8 flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>一、項目彙總格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        {reportFinancial && reportFinancial.general && renderTable(reportFinancial.general, 10, 19)}
        <div className="relative -z-10">
          <Image
            className="absolute -top-300px right-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>

        <div className="mb-1 mt-8 flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        {reportFinancial && reportFinancial.details && renderTable(reportFinancial.details, 0, 3)}

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
      {renderedFooter(2)}
    </div>
  );
  const page3 = (
    <div id="3" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-[29px] flex w-[28%]">
          <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
          <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="mb-1 mt-8 flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        {reportFinancial && reportFinancial.details && renderTable(reportFinancial.details, 0, 13)}

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
      {renderedFooter(3)}
    </div>
  );
  const page4 = (
    <div id="4" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-[29px] flex w-[28%]">
          <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
          <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="mb-1 mt-8 flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        {reportFinancial && reportFinancial.details && renderTable(reportFinancial.details, 13, 26)}

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
      {renderedFooter(4)}
    </div>
  );
  const page5 = (
    <div id="5" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-[29px] flex w-[28%]">
          <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
          <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="mb-1 mt-8 flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        {reportFinancial && reportFinancial.details && renderTable(reportFinancial.details, 26, 41)}

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
      {renderedFooter(5)}
    </div>
  );
  const page6 = (
    <div id="6" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-[29px] flex w-[28%]">
          <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
          <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="mb-1 mt-8 flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        {reportFinancial && reportFinancial.details && renderTable(reportFinancial.details, 41, 55)}

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
      {renderedFooter(6)}
    </div>
  );
  const page7 = (
    <div id="7" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-[29px] flex w-[28%]">
          <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
          <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-text-neutral-secondary">
        <div className="mb-1 mt-8 flex justify-between text-xs font-semibold text-surface-brand-secondary">
          <p>一、項目彙總格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        {reportFinancial && reportFinancial.details && renderTable(reportFinancial.details, 55, 70)}

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
      {renderedFooter(7)}
    </div>
  );
  const page8 = (
    <div id="8" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-[29px] flex w-[28%]">
          <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
          <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-3 text-xs text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
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
              <div className="absolute bottom-0 left-0 h-px w-full bg-darkBlue2"></div>
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
                  <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold"></th>
                  {lineChartLabels?.map((label) => (
                    <th
                      key={label}
                      className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-xs">
                <tr>
                  <td className="border border-[#dee2e6] p-[10px] font-semibold">A</td>
                  {Object.keys(reportFinancial.otherInfo.operatingStabilized.beforeIncomeTax).map(
                    (year) => (
                      <td
                        key={year}
                        className="border border-[#dee2e6] p-[10px] font-semibold"
                      ></td>
                    )
                  )}
                </tr>
                <tr>
                  <td className="border border-[#dee2e6] p-[10px]">稅前淨利（淨損）</td>
                  {Object.entries(
                    reportFinancial.otherInfo.operatingStabilized.beforeIncomeTax
                  ).map(([year, value]) => (
                    <td key={year} className="border border-[#dee2e6] p-[10px] text-end">
                      {value.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border border-[#dee2e6] p-[10px]">折舊及攤銷費用</td>
                  {Object.keys(reportFinancial.otherInfo.operatingStabilized.beforeIncomeTax).map(
                    (year) => (
                      <td key={year} className="border border-[#dee2e6] p-[10px] text-end">
                        {reportFinancial.otherInfo.operatingStabilized.amortizationDepreciation[year].toLocaleString()}
                      </td>
                    )
                  )}
                </tr>
                <tr>
                  <td className="border border-[#dee2e6] p-[10px]">支付的所得稅</td>
                  {Object.entries(reportFinancial.otherInfo.operatingStabilized.tax).map(
                    ([year, value]) => (
                      <td key={year} className="border border-[#dee2e6] p-[10px] text-end">
                        {value.toLocaleString()}
                      </td>
                    )
                  )}
                </tr>
                <tr>
                  <td className="border border-[#dee2e6] p-[10px] font-semibold">B</td>
                  {Object.keys(reportFinancial.otherInfo.operatingStabilized.beforeIncomeTax).map(
                    (year) => (
                      <td
                        key={year}
                        className="border border-[#dee2e6] p-[10px] font-semibold"
                      ></td>
                    )
                  )}
                </tr>
                <tr>
                  <td className="border border-[#dee2e6] p-[10px]">營業活動的現金</td>
                  {Object.entries(
                    reportFinancial.otherInfo.operatingStabilized.operatingIncomeCashFlow
                  ).map(([year, value]) => (
                    <td key={year} className="border border-[#dee2e6] p-[10px] text-end">
                      {value.toLocaleString()}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="border border-[#dee2e6] p-[10px]"></td>
                  {Object.keys(reportFinancial.otherInfo.operatingStabilized.beforeIncomeTax).map(
                    (year) => (
                      <td key={year} className="border border-[#dee2e6] p-[10px]"></td>
                    )
                  )}
                </tr>
                <tr>
                  <td className="border border-[#dee2e6] p-[10px]">A和B比例關係</td>
                  {Object.entries(reportFinancial.otherInfo.operatingStabilized.ratio).map(
                    ([year, value]) => (
                      <td key={year} className="border border-[#dee2e6] p-[10px] text-end">
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
      {renderedFooter(8)}
    </div>
  );
  const page9 = (
    <div id="9" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-[29px] flex w-[28%]">
          <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
          <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-1 text-xs text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] font-semibold text-surface-brand-secondary">
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
              <p className="my-auto items-end text-xs font-semibold text-lightGray5">
                {curYear}年度投資活動項目佔比
              </p>
              <div className="absolute bottom-0 left-0 h-px w-full bg-darkBlue2"></div>
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
              <p className="my-auto items-end text-xs font-semibold text-lightGray5">
                {preYear}年度投資活動項目佔比
              </p>
              <div className="absolute bottom-0 left-0 h-px w-full bg-darkBlue2"></div>
            </div>
            <BarChart data={preBarChartData} labels={preBarChartLabels} />
          </div>
        </div>
        <div className="mb-[16px] mt-4 font-semibold text-surface-brand-secondary">
          <p className="text-xs font-semibold">
            {reportFinancial &&
              reportFinancial.otherInfo &&
              reportFinancial.otherInfo.fourPointOneTitle}
          </p>
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
      {renderedFooter(9)}
    </div>
  );
  const page10 = (
    <div id="10" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-[29px] flex w-[28%]">
          <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
          <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-3 text-xs text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] text-xs font-semibold leading-[20px] tracking-[0.12px] text-surface-brand-secondary">
          <p className="text-xs font-semibold">
            {reportFinancial &&
              reportFinancial.otherInfo &&
              reportFinancial.otherInfo.fourPointOneTitle}{' '}
          </p>
        </div>
        {renderedPage10_1()}
      </section>
      {renderedFooter(10)}
    </div>
  );
  const page11 = (
    <div id="11" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-[29px] flex w-[28%]">
          <div className="h-[10px] w-[82.5%] bg-surface-brand-secondary"></div>
          <div className="h-[10px] w-[17.5%] bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative mx-3 text-xs text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] text-xs font-semibold leading-[20px] tracking-[0.12px] text-surface-brand-secondary">
          <h3 className="mt-8 text-base font-semibold leading-[24px] tracking-[0.16px] text-black">
            其他：
          </h3>
          {renderedPage11_1()}
        </div>
        <div className="mb-4 mt-[32px] text-center text-xs font-semibold leading-[20px] tracking-[0.12px] text-surface-brand-secondary">
          <p className="text-start text-xs font-semibold">
            五、年度產生的自由現金：公司可以靈活運用的現金
          </p>
          {renderedPage11_2(curYear, preYear)}
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
      {renderedFooter(11)}
    </div>
  );

  return (
    <div className="mx-auto w-a4-width">
      {page1}
      {page2}
      {page3}
      {page4}
      {page5}
      {page6}
      {page7}
      {page8}
      {page9}
      {page10}
      {page11}
    </div>
  );
};

export default CashFlowStatementReportBodyAll;
