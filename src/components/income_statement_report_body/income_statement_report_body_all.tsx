/* eslint-disable tailwindcss/no-arbitrary-value */
// TODO: 在 tailwindcss.config 註冊 css 變數，取消 eslint-disable (20240723 - Shirley Anna)
import { SkeletonList } from '@/components/skeleton/skeleton';
import { APIName } from '@/constants/api_connection';
import { FREE_COMPANY_ID, NON_EXISTING_REPORT_ID } from '@/constants/config';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { useUserCtx } from '@/contexts/user_context';
import { FinancialReport } from '@/interfaces/report';
import APIHandler from '@/lib/utils/api_handler';
import Image from 'next/image';
import React from 'react';

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
  } = APIHandler<FinancialReport>(APIName.REPORT_FINANCIAL_GET_BY_ID, {
    params: {
      companyId: selectedCompany?.id ?? FREE_COMPANY_ID,
      reportId: reportId ?? NON_EXISTING_REPORT_ID,
    },
  });

  // TODO: 測試用，正式上線時需刪除 (20240723 - Shirley)
  // eslint-disable-next-line no-console
  console.log('reportFinancial', reportFinancial);

  if (getReportFinancialIsLoading) {
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
        <p className="m-0 text-[12px] text-white">{page}</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    );
  };

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
            {/* <h1 className="mb-30px text-h6">
              2330 <br />
              台灣積體電路製造股份有限公司
            </h1> */}
            {reportFinancial && reportFinancial.company && (
              <>
                <h1 className="mb-30px text-h6">
                  {reportFinancial.company.code} <br />
                  {reportFinancial.company.name}
                </h1>
                <p className="font-normal">
                  {reportFinancial.curDate.from}至{reportFinancial.curDate.to} <br />
                  合併財務報告 - 綜合損益表
                </p>
              </>
            )}
            {/* <p className="font-normal">
              2023年第四季 <br />
              合併財務報告 - 綜合損益表
            </p> */}
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
          <p>一、項目彙總格式</p>
          <p>單位：新台幣仟元 每股盈餘單位：新台幣元</p>
        </div>
        <table className="relative z-1 w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                會計項目
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2023-1-1 至 2023-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2022-1-1 至 2022-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.general &&
              reportFinancial.general.slice(0, 10).map((value) => (
                <tr key={value.code}>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.code}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.name}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
                    {value.curPeriodPercentage}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
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
          <p>一、項目彙總格式</p>
          <p>單位：新台幣仟元 每股盈餘單位：新台幣元</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                會計項目
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2023-1-1 至 2023-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2022-1-1 至 2022-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.general &&
              reportFinancial.general.slice(10, 24).map((value) => (
                <tr key={value.code}>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.code}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.name}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
                    {value.curPeriodPercentage}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
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
          <p>一、項目彙總格式</p>
          <p>單位：新台幣仟元 每股盈餘單位：新台幣元</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                會計項目
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2023-1-1 至 2023-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2022-1-1 至 2022-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.general &&
              reportFinancial.general.slice(24, 33).map((value) => (
                <tr key={value.code}>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.code}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.name}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
                    {value.curPeriodPercentage}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
                    {value.prePeriodPercentage}
                  </td>
                </tr>
              ))}

            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]"></td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]"></td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]"></td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]"></td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]"></td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]"></td>
            </tr>
          </tbody>
          <tbody>
            {reportFinancial &&
              reportFinancial.general &&
              reportFinancial.general.slice(34, 36).map((value) => (
                <tr key={value.code}>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px] font-semibold">
                    {value.code}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px] font-semibold">
                    {value.name}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px] font-semibold">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[14px] font-semibold"></td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px] font-semibold">
                    {value.prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[14px] font-semibold"></td>
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
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元 每股盈餘單位：新台幣元</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                會計項目
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2023-1-1 至 2023-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2022-1-1 至 2022-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              reportFinancial.details.slice(0, 15).map((value) => (
                <tr key={value.code}>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.code}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.name}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
                    {value.curPeriodPercentage}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
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
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元 每股盈餘單位：新台幣元</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                會計項目
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2023-1-1 至 2023-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2022-1-1 至 2022-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              reportFinancial.details.slice(15, 28).map((value) => (
                <tr key={value.code}>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.code}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.name}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
                    {value.curPeriodPercentage}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
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
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元 每股盈餘單位：新台幣元</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                會計項目
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2023-1-1 至 2023-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2022-1-1 至 2022-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              reportFinancial.details.slice(28, 39).map((value) => (
                <tr key={value.code}>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.code}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.name}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
                    {value.curPeriodPercentage}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
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
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元 每股盈餘單位：新台幣元</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                會計項目
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2023-1-1 至 2023-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2022-1-1 至 2022-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              reportFinancial.details.slice(39, 49).map((value) => (
                <tr key={value.code}>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.code}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.name}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
                    {value.curPeriodPercentage}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
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
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元 每股盈餘單位：新台幣元</p>
        </div>
        <table className="relative z-10 w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                會計項目
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2023-1-1 至 2023-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2022-1-1 至 2022-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              reportFinancial.details.slice(49, 58).map((value) => (
                <tr key={value.code}>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.code}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.name}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
                    {value.curPeriodPercentage}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
                    {value.prePeriodPercentage}
                  </td>
                </tr>
              ))}
          </tbody>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              reportFinancial.details.slice(58, 62).map((value) => (
                <tr key={value.code}>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px] font-semibold">
                    {value.code}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px] font-semibold">
                    {value.name}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px] font-semibold">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[14px] font-semibold"></td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px] font-semibold">
                    {value.prePeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-center text-[14px] font-semibold"></td>
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
          <p>三、投入費用和成本，與收入的倍數關係</p>
          <p>單位：新台幣仟元</p>
        </div>
        <table className="relative z-10 w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                會計項目
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2023-1-1 至 2023-12-31
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2022-1-1 至 2022-12-31
              </th>
            </tr>
          </thead>
          {/* <tbody>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">4000</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">營業收入合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,161,735,841
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,263,891,292
              </td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">5000</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">營業成本合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">986,625,213</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">915,536,486</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">6100</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">推銷費用</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">10,590,705</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">9,920,446</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">6200</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">管理費用</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">60,872,841</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">53,524,898</td>
            </tr>
            <tr className="font-semibold">
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]"></td>
              <td className="border border-[#dee2e6] p-[10px] text-start text-[14px]">
                投入費用和成本合計
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                1,058,088,759
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">978,981,830</td>
            </tr>
          </tbody> */}
          <tbody>
            {reportFinancial && reportFinancial.details && reportFinancial.details[1] && (
              <tr key={reportFinancial.details[1].code}>
                <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                  {reportFinancial.details[1].code}
                </td>
                <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                  {reportFinancial.details[1].name}
                </td>
                <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                  {reportFinancial.details[1].curPeriodAmount}
                </td>
                <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                  {reportFinancial.details[1].prePeriodAmount}
                </td>
              </tr>
            )}
          </tbody>
          <tbody>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]"></td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]"></td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]"></td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]"></td>
            </tr>
          </tbody>
          <tbody>
            {reportFinancial && reportFinancial.details && reportFinancial.details[3] && (
              <tr key={reportFinancial.details[3].code}>
                <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                  {reportFinancial.details[3].code}
                </td>
                <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                  {reportFinancial.details[3].name}
                </td>
                <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                  {reportFinancial.details[3].curPeriodAmount}
                </td>
                <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                  {reportFinancial.details[3].prePeriodAmount}
                </td>
              </tr>
            )}
          </tbody>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              reportFinancial.details.slice(7, 9).map((value) => (
                <tr key={value.code}>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.code}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-[14px]">{value.name}</td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.curPeriodAmount}
                  </td>
                  <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                    {value.prePeriodAmount}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <p className="mt-4">2023年度營業收入，為當年度投入費用和成本的2.04倍</p>
        <p className="mb-10 mt-4">2022年度營業收入，為當年度投入費用和成本的2.31倍</p>
        <div className="mb-4 mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p>四、收入提撥至研發費用比例</p>
          <p>單位：新台幣仟元</p>
        </div>
        <table className="relative z-10 mb-75px w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                代號
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold">
                會計項目
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2023-1-1 至 2023-12-31
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2022-1-1 至 2022-12-31
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">4000</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">營業收入合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,161,735,841
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,263,891,292
              </td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">6300</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">研究發展費用</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">182,370,170</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">163,262,283</td>
            </tr>
            <tr className="font-semibold">
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]"></td>
              <td className="border border-[#dee2e6] p-[10px] text-start text-[14px]">
                收入提撥至研發費用比例
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">8.44%</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">7.21%</td>
            </tr>
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
    <div className="mx-auto w-a4-width">
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
