/* eslint-disable tailwindcss/no-arbitrary-value */
// TODO: 在 tailwindcss.config 註冊 css 變數，取消 eslint-disable (20240723 - Shirley Anna)
import { SkeletonList } from '@/components/skeleton/skeleton';
import { APIName } from '@/constants/api_connection';
import { FREE_COMPANY_ID, NON_EXISTING_REPORT_ID } from '@/constants/config';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { useUserCtx } from '@/contexts/user_context';
import { FinancialReport, IncomeStatementOtherInfo } from '@/interfaces/report';
import APIHandler from '@/lib/utils/api_handler';
import Image from 'next/image';
import React from 'react';
import { format } from 'date-fns';

interface IIncomeStatementReportBodyAllProps {
  reportId: string;
}

const IncomeStatementReportBodyAll = ({ reportId }: IIncomeStatementReportBodyAllProps) => {
  const { selectedCompany } = useUserCtx();
  const {
    data: reportFinancial,
    code: getReportFinancialCode,
    success: getReportFinancialSuccess,
    isLoading: getReportFinancialIsLoading,
  } = APIHandler<FinancialReport>(
    APIName.REPORT_FINANCIAL_GET_BY_ID,
    {
      params: {
        companyId: selectedCompany?.id ?? FREE_COMPANY_ID,
        reportId: reportId ?? NON_EXISTING_REPORT_ID,
      },
    },
    true
  );

  // TODO: 測試用，正式上線時需刪除 (20240723 - Shirley)
  // eslint-disable-next-line no-console
  console.log('reportFinancial', reportFinancial);

  if (getReportFinancialIsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
        <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
      </div>
    );
  } else if (!getReportFinancialSuccess || !reportFinancial) {
    return <div>Error {getReportFinancialCode}</div>;
  }

  const renderedFooter = (page: number) => {
    return (
      <footer className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between border-t-2 border-solid border-[#e0e0e0] bg-surface-brand-secondary p-10px">
        <p className="m-0 text-[12px] text-white">{page}</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    );
  };
  const otherInfo = reportFinancial?.otherInfo as IncomeStatementOtherInfo;

  /* Info: 計算 totalCost 和 salesExpense 的 curPeriodAmount 和 prePeriodAmount 的總和 (20240730 - Anna) */
  const curPeriodTotal =
    (otherInfo?.revenueAndExpenseRatio.totalCost?.curPeriodAmount || 0) +
    (otherInfo?.revenueAndExpenseRatio.salesExpense?.curPeriodAmount || 0);
  const prePeriodTotal =
    (otherInfo?.revenueAndExpenseRatio.totalCost?.prePeriodAmount || 0) +
    (otherInfo?.revenueAndExpenseRatio.salesExpense?.prePeriodAmount || 0);
  /* Info: 提取 curRatio 、 preRatio 、revenueToRD (20240730 - Anna) */
  const curRatio = otherInfo?.revenueAndExpenseRatio.ratio.curRatio || 0;
  const preRatio = otherInfo?.revenueAndExpenseRatio.ratio.preRatio || 0;
  const revenueToRD = otherInfo?.revenueToRD;
  /* Info: 格式化數字為千分位 (20240730 - Anna) */
  const formatNumber = (num: number) => num.toLocaleString();
  /* Info: 轉換和格式化日期 (20240730 - Anna) */
  const curDateFrom = new Date(reportFinancial.curDate.from * 1000);
  const curDateTo = new Date(reportFinancial.curDate.to * 1000);
  const preDateFrom = new Date(reportFinancial.preDate.from * 1000);
  const preDateTo = new Date(reportFinancial.preDate.to * 1000);
  const formattedCurFromDate = format(curDateFrom, 'yyyy-MM-dd');
  const formattedCurToDate = format(curDateTo, 'yyyy-MM-dd');
  const formattedPreFromDate = format(preDateFrom, 'yyyy-MM-dd');
  const formattedPreToDate = format(preDateTo, 'yyyy-MM-dd');

  const page1 = (
    <div id="1" className="relative h-a4-height overflow-hidden">
      {/* Info: watermark logo (20240723 - Anna) */}
      <div className="relative right-0 top-16 z-0">
        <Image
          className="absolute right-0 top-0"
          src="/logo/watermark_logo.svg"
          alt="isunfa logo"
          width={400}
          height={300}
        />
      </div>

      <header className="mb-[86px] flex justify-between text-white">
        <div className="w-[30%] bg-surface-brand-secondary pb-14px pl-[10px] pr-14px pt-[40px] font-bold">
          <div className="">
            {reportFinancial && reportFinancial.company && (
              <>
                <h1 className="mb-30px text-h6">
                  {reportFinancial.company.code} <br />
                  {reportFinancial.company.name}
                </h1>
                <p className="text-left text-[12px] font-bold leading-[20px] tracking-[0.01em]">
                  {formattedCurFromDate}至{formattedCurToDate} <br />
                  合併財務報告 - 綜合損益表
                </p>
              </>
            )}
          </div>
        </div>
        <div className="box-border w-35% text-right">
          <h2 className="relative border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Income Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>

      <section className="text-text-neutral-secondary">
        <div className="text-primary-surface-brand-secondary relative z-1 mb-[16px] flex justify-between font-semibold text-surface-brand-secondary">
          <p className="text-[12px] font-bold leading-[20px] tracking-[0.01em]">一、項目彙總格式</p>
          <p className="text-[12px] font-bold leading-[20px] tracking-[0.01em]">
            單位：新台幣仟元 每股盈餘單位：新台幣元
          </p>
        </div>
        <table className="relative z-1 w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="whitespace-nowrap border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[12px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[12px] font-semibold">
                會計項目
              </th>
              <th className="whitespace-nowrap border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[12px] font-semibold">
                {reportFinancial && reportFinancial.company && (
                  <p className="text-left font-barlow text-[12px] font-semibold leading-[20px] tracking-[0.01em]">
                    {formattedCurFromDate}至{formattedCurToDate}
                  </p>
                )}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[12px] font-semibold">
                %
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[12px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="text-left font-barlow text-[12px] font-semibold leading-[20px] tracking-[0.01em]">
                    {formattedPreFromDate}至{formattedPreToDate}
                  </p>
                )}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[12px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.general &&
              reportFinancial.general.slice(0, 10).map((value) => (
                <tr key={value.code} className="h-[40px]">
                  <td className="border border-[#dee2e6] p-[10px] text-[12px]">{value.code}</td>
                  <td
                    className="border border-[#dee2e6] p-[10px] text-[12px]"
                    style={{ width: '200px' }}
                  >
                    {value.name}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[12px]">
                    {value.curPeriodPercentage}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {value.prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[12px]">
                    {value.prePeriodPercentage}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
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
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Income Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p className="text-[12px] font-bold leading-[20px] tracking-[0.01em]">一、項目彙總格式</p>
          <p className="text-[12px] font-bold leading-[20px] tracking-[0.01em]">
            單位：新台幣仟元 每股盈餘單位：新台幣元
          </p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[12px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[12px] font-semibold">
                會計項目
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[12px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="text-center font-barlow text-[12px] font-semibold leading-[20px] tracking-[0.01em]">
                    {formattedCurFromDate}
                    <br />至{formattedCurToDate}
                  </p>
                )}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[12px] font-semibold">
                %
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[12px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="text-center font-barlow text-[12px] font-semibold leading-[20px] tracking-[0.01em]">
                    {formattedPreFromDate}
                    <br />至{formattedPreToDate}
                  </p>
                )}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[12px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.general &&
              reportFinancial.general.slice(10, 24).map((value) => (
                <tr key={value.code} className="h-[40px]">
                  <td className="border border-[#dee2e6] p-[10px] text-[12px]">{value.code}</td>
                  <td className="min-w-[177px] border border-[#dee2e6] p-[10px] text-[12px]">
                    {value.name}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[12px]">
                    {value.curPeriodPercentage}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {value.prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[12px]">
                    {value.prePeriodPercentage}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
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
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Income Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p className="text-[12px] font-bold leading-[20px] tracking-[0.01em]">一、項目彙總格式</p>
          <p className="text-[12px] font-bold leading-[20px] tracking-[0.01em]">
            單位：新台幣仟元 每股盈餘單位：新台幣元
          </p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="whitespace-nowrap border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[12px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[12px] font-semibold">
                會計項目
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[12px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="text-left font-barlow text-[12px] font-semibold leading-[20px] tracking-[0.01em]">
                    {formattedCurFromDate}至{formattedCurToDate}
                  </p>
                )}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[12px] font-semibold">
                %
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[12px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="text-left font-barlow text-[12px] font-semibold leading-[20px] tracking-[0.01em]">
                    {formattedPreFromDate}至{formattedPreToDate}
                  </p>
                )}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[12px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.general &&
              reportFinancial.general.slice(24, 33).map((value) => (
                <tr key={value.code} className="h-[40px]">
                  <td className="border border-[#dee2e6] p-[10px] text-[12px]">{value.code}</td>
                  <td className="w-[177px] border border-[#dee2e6] p-[10px] text-[12px]">
                    {value.name}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[12px]">
                    {value.curPeriodPercentage}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {value.prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[12px]">
                    {value.prePeriodPercentage}
                  </td>
                </tr>
              ))}

            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[12px]">&nbsp;</td>
              <td className="border border-[#dee2e6] p-[10px] text-[12px]">&nbsp;</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">&nbsp;</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[12px]">&nbsp;</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">&nbsp;</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[12px]">&nbsp;</td>
            </tr>
          </tbody>
          <tbody>
            {reportFinancial &&
              reportFinancial.general &&
              reportFinancial.general.slice(34, 36).map((value) => (
                <tr key={value.code} className="h-[40px]">
                  <td className="border border-[#dee2e6] p-[10px] text-[12px] font-semibold">
                    {value.code}
                  </td>
                  <td className="w-[177px] border border-[#dee2e6] p-[10px] text-[12px] font-semibold">
                    {value.name}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px] font-semibold">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[12px] font-semibold">
                    &nbsp;
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px] font-semibold">
                    {value.prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[12px] font-semibold">
                    &nbsp;
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <div className="relative mt-6">
          <Image
            className="absolute bottom-[-100px] right-0 h-auto w-auto opacity-5"
            src="/logo/watermark_logo.svg"
            alt="iSunFA"
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
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Income Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p className="text-[12px] font-bold leading-[20px] tracking-[0.01em]">二、細項分類格式</p>
          <p className="text-[12px] font-bold leading-[20px] tracking-[0.01em]">
            單位：新台幣仟元 每股盈餘單位：新台幣元
          </p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[12px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[12px] font-semibold">
                會計項目
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[12px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="text-left font-barlow text-[12px] font-semibold leading-[20px] tracking-[0.01em]">
                    {formattedCurFromDate}至{formattedCurToDate}
                  </p>
                )}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[12px] font-semibold">
                %
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[12px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="text-left font-barlow text-[12px] font-semibold leading-[20px] tracking-[0.01em]">
                    {formattedPreFromDate}至{formattedPreToDate}
                  </p>
                )}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[12px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              reportFinancial.details.slice(0, 15).map((value) => (
                <tr key={value.code} className="h-[40px]">
                  <td className="border border-[#dee2e6] p-[10px] text-[12px]">{value.code}</td>
                  <td className="w-[177px] border border-[#dee2e6] p-[10px] text-[12px]">
                    {value.name}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[12px]">
                    {value.curPeriodPercentage}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {value.prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[12px]">
                    {value.prePeriodPercentage}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
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
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Income Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p className="text-[12px] font-bold leading-[20px] tracking-[0.01em]">二、細項分類格式</p>
          <p className="text-[12px] font-bold leading-[20px] tracking-[0.01em]">
            單位：新台幣仟元 每股盈餘單位：新台幣元
          </p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[12px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[12px] font-semibold">
                會計項目
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[12px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="text-left font-barlow text-[12px] font-semibold leading-[20px] tracking-[0.01em]">
                    {formattedCurFromDate}至{formattedCurToDate}
                  </p>
                )}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[12px] font-semibold">
                %
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[12px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="text-left font-barlow text-[12px] font-semibold leading-[20px] tracking-[0.01em]">
                    {formattedPreFromDate}至{formattedPreToDate}
                  </p>
                )}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[12px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              reportFinancial.details.slice(15, 28).map((value) => (
                <tr key={value.code} className="h-[40px]">
                  <td className="border border-[#dee2e6] p-[10px] text-[12px]">{value.code}</td>
                  <td className="w-[177px] border border-[#dee2e6] p-[10px] text-[12px]">
                    {value.name}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[12px]">
                    {value.curPeriodPercentage}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {value.prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[12px]">
                    {value.prePeriodPercentage}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
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
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Income Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p className="text-[12px] font-bold leading-[20px] tracking-[0.01em]">二、細項分類格式</p>
          <p className="text-[12px] font-bold leading-[20px] tracking-[0.01em]">
            單位：新台幣仟元 每股盈餘單位：新台幣元
          </p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[12px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[12px] font-semibold">
                會計項目
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[12px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="text-left font-barlow text-[12px] font-semibold leading-[20px] tracking-[0.01em]">
                    {formattedCurFromDate}至{formattedCurToDate}
                  </p>
                )}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[12px] font-semibold">
                %
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[12px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="text-left font-barlow text-[12px] font-semibold leading-[20px] tracking-[0.01em]">
                    {formattedPreFromDate}至{formattedPreToDate}
                  </p>
                )}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[12px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              reportFinancial.details.slice(28, 39).map((value) => (
                <tr key={value.code} className="h-[40px]">
                  <td className="border border-[#dee2e6] p-[10px] text-[12px]">{value.code}</td>
                  <td className="w-[177px] border border-[#dee2e6] p-[10px] text-[12px]">
                    {value.name}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[12px]">
                    {value.curPeriodPercentage}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {value.prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[12px]">
                    {value.prePeriodPercentage}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
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
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Income Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p className="text-[12px] font-bold leading-[20px] tracking-[0.01em]">二、細項分類格式</p>
          <p className="text-[12px] font-bold leading-[20px] tracking-[0.01em]">
            單位：新台幣仟元 每股盈餘單位：新台幣元
          </p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[12px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[12px] font-semibold">
                會計項目
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[12px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="text-center font-barlow text-[12px] font-semibold leading-[20px] tracking-[0.01em]">
                    {formattedCurFromDate}
                    <br />至{formattedCurToDate}
                  </p>
                )}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[12px] font-semibold">
                %
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[12px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="text-center font-barlow text-[12px] font-semibold leading-[20px] tracking-[0.01em]">
                    {formattedPreFromDate}
                    <br />至{formattedPreToDate}
                  </p>
                )}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[12px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              reportFinancial.details.slice(39, 49).map((value) => (
                <tr key={value.code} className="h-[40px]">
                  <td className="border border-[#dee2e6] p-[10px] text-[12px]">{value.code}</td>
                  <td className="w-[177px] min-w-[177px] border border-[#dee2e6] p-[10px] text-[12px]">
                    {value.name}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[12px]">
                    {value.curPeriodPercentage}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {value.prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[12px]">
                    {value.prePeriodPercentage}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
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
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Income Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p className="text-[12px] font-bold leading-[20px] tracking-[0.01em]">二、細項分類格式</p>
          <p className="text-[12px] font-bold leading-[20px] tracking-[0.01em]">
            單位：新台幣仟元 每股盈餘單位：新台幣元
          </p>
        </div>
        <table className="relative z-10 w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[12px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[12px] font-semibold">
                會計項目
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[12px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="text-left font-barlow text-[12px] font-semibold leading-[20px] tracking-[0.01em]">
                    {formattedCurFromDate}至{formattedCurToDate}
                  </p>
                )}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[12px] font-semibold">
                %
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[12px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="text-left font-barlow text-[12px] font-semibold leading-[20px] tracking-[0.01em]">
                    {formattedPreFromDate}至{formattedPreToDate}
                  </p>
                )}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[12px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              reportFinancial.details.slice(49, 58).map((value) => (
                <tr key={value.code} className="h-[40px]">
                  <td className="border border-[#dee2e6] p-[10px] text-[12px]">{value.code}</td>
                  <td className="w-[177px] border border-[#dee2e6] p-[10px] text-[12px]">
                    {value.name}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[12px]">
                    {value.curPeriodPercentage}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {value.prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[12px]">
                    {value.prePeriodPercentage}
                  </td>
                </tr>
              ))}
          </tbody>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              reportFinancial.details.slice(58, 62).map((value) => (
                <tr key={value.code} className="h-[40px]">
                  <td className="border border-[#dee2e6] p-[10px] text-[12px] font-semibold">
                    {value.code}
                  </td>
                  <td className="w-[177px] border border-[#dee2e6] p-[10px] text-[12px] font-semibold">
                    {value.name}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px] font-semibold">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[12px] font-semibold">
                    &nbsp;
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px] font-semibold">
                    {value.prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[12px] font-semibold">
                    &nbsp;
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {/* Info: watermark logo (20240724 - Anna) */}
        <div className="relative right-0 -z-10" style={{ top: '-280px' }}>
          <Image
            className="absolute right-0"
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
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Income Statement
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p className="text-[12px] font-bold leading-[20px] tracking-[0.01em]">
            三、投入費用和成本，與收入的倍數關係
          </p>
          <p className="text-[12px] font-bold leading-[20px] tracking-[0.01em]">單位：新台幣仟元</p>
        </div>
        <table className="relative z-10 w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[12px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[12px] font-semibold">
                會計項目
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[12px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="text-center font-barlow text-[12px] font-semibold leading-[20px] tracking-[0.01em]">
                    {formattedCurFromDate}至{formattedCurToDate}
                  </p>
                )}
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[12px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="text-center font-barlow text-[12px] font-semibold leading-[20px] tracking-[0.01em]">
                    {formattedPreFromDate}至{formattedPreToDate}
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
                  <td className="border border-[#dee2e6] p-[10px] text-[12px]">
                    {otherInfo.revenueAndExpenseRatio.revenue.code}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-[12px]">
                    {otherInfo.revenueAndExpenseRatio.revenue.name}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {otherInfo.revenueAndExpenseRatio.revenue.curPeriodAmountString}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {otherInfo.revenueAndExpenseRatio.revenue.prePeriodAmountString}
                  </td>
                </tr>
              )}
          </tbody>
          <tbody>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[12px]">&nbsp;</td>
              <td className="border border-[#dee2e6] p-[10px] text-[12px]">&nbsp;</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">&nbsp;</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">&nbsp;</td>
            </tr>
          </tbody>
          <tbody>
            {otherInfo &&
              otherInfo.revenueAndExpenseRatio &&
              otherInfo.revenueAndExpenseRatio.totalCost && (
                <tr key={otherInfo.revenueAndExpenseRatio.totalCost.code}>
                  <td className="border border-[#dee2e6] p-[10px] text-[12px]">
                    {otherInfo.revenueAndExpenseRatio.totalCost.code}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-[12px]">
                    {otherInfo.revenueAndExpenseRatio.totalCost.name}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {otherInfo.revenueAndExpenseRatio.totalCost.curPeriodAmountString}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
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
                  <td className="border border-[#dee2e6] p-[10px] text-[12px]">
                    {otherInfo.revenueAndExpenseRatio.salesExpense.code}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-[12px]">
                    {otherInfo.revenueAndExpenseRatio.salesExpense.name}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {otherInfo.revenueAndExpenseRatio.salesExpense.curPeriodAmountString}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
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
                  <td className="border border-[#dee2e6] p-[10px] text-[12px]">
                    {otherInfo.revenueAndExpenseRatio.administrativeExpense.code}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-[12px]">
                    {otherInfo.revenueAndExpenseRatio.administrativeExpense.name}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {otherInfo.revenueAndExpenseRatio.administrativeExpense.curPeriodAmountString}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {otherInfo.revenueAndExpenseRatio.administrativeExpense.prePeriodAmountString}
                  </td>
                </tr>
              )}
          </tbody>
          <tbody>
            <tr className="font-semibold">
              <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">&nbsp;</td>
              <td className="border border-[#dee2e6] p-[10px] text-start text-[12px]">
                投入費用和成本合計
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                {formatNumber(curPeriodTotal)}
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                {formatNumber(prePeriodTotal)}
              </td>
            </tr>
          </tbody>
        </table>
        {reportFinancial && reportFinancial.company && (
          <p className="mt-4 text-[12px]">
            {formattedCurFromDate}至{formattedCurToDate}
            營業收入，為投入費用和成本的{curRatio.toFixed(2)}倍
          </p>
        )}
        {reportFinancial && reportFinancial.company && (
          <p className="mt-4 text-[12px]">
            {formattedPreFromDate}至{formattedPreToDate}
            營業收入，為投入費用和成本的{preRatio.toFixed(2)}倍
          </p>
        )}
        <div className="mb-4 mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p className="text-[12px] font-bold leading-[20px] tracking-[0.01em]">
            四、收入提撥至研發費用比例
          </p>
          <p className="text-[12px] font-bold leading-[20px] tracking-[0.01em]">單位：新台幣仟元</p>
        </div>
        <table className="relative z-10 mb-75px w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[12px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[12px] font-semibold">
                會計項目
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[12px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="text-center font-barlow text-[12px] font-semibold leading-[20px] tracking-[0.01em]">
                    {formattedCurFromDate}至{formattedCurToDate}
                  </p>
                )}
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[12px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {reportFinancial && reportFinancial.company && (
                  <p className="text-center font-barlow text-[12px] font-semibold leading-[20px] tracking-[0.01em]">
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
                  <td className="border border-[#dee2e6] p-[10px] text-[12px]">
                    {revenueToRD.revenue.code}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-[12px]">
                    {revenueToRD.revenue.name}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {revenueToRD.revenue.curPeriodAmountString}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {revenueToRD.revenue.prePeriodAmountString}
                  </td>
                </tr>
                <tr key={revenueToRD.researchAndDevelopmentExpense.code}>
                  <td className="border border-[#dee2e6] p-[10px] text-[12px]">
                    {revenueToRD.researchAndDevelopmentExpense.code}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-[12px]">
                    {revenueToRD.researchAndDevelopmentExpense.name}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {revenueToRD.researchAndDevelopmentExpense.curPeriodAmountString}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {revenueToRD.researchAndDevelopmentExpense.prePeriodAmountString}
                  </td>
                </tr>
                <tr className="font-semibold">
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">&nbsp;</td>
                  <td className="border border-[#dee2e6] p-[10px] text-start text-[12px]">
                    收入提撥至研發費用比例
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {' '}
                    {/* Info: 保留兩位小數 (20240724 - Anna) */}
                    {revenueToRD.ratio.curRatio.toFixed(2)}%
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[12px]">
                    {' '}
                    {revenueToRD.ratio.preRatio.toFixed(2)}%
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
        {/* Info: watermark logo (20240724 - Anna) */}
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
      {renderedFooter(9)}
    </div>
  );

  return (
    <div className="scale-80 mx-auto w-a4-width origin-top overflow-x-auto md:scale-100 lg:scale-100">
      {page1}
      <hr className="break-before-page" />
      {page2}
      <hr className="break-before-page" />
      {page3}
      <hr className="break-before-page" />
      {page4}
      <hr className="break-before-page" />
      {page5}
      <hr className="break-before-page" />
      {page6}
      <hr className="break-before-page" />
      {page7}
      <hr className="break-before-page" />
      {page8}
      <hr className="break-before-page" />
      {page9}
    </div>
  );
};

export default IncomeStatementReportBodyAll;
