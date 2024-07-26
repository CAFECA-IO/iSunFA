/* eslint-disable tailwindcss/no-arbitrary-value */
// TODO: 在 tailwindcss.config 註冊 css 變數，取消 eslint-disable (20240723 - Shirley)
import { APIName } from '@/constants/api_connection';
import { DEFAULT_DISPLAYED_COMPANY_ID } from '@/constants/display';
import { useUserCtx } from '@/contexts/user_context';
import { FinancialReport } from '@/interfaces/report';
import APIHandler from '@/lib/utils/api_handler';
import Image from 'next/image';
import React from 'react';
import PieChart from '@/components/balance_sheet_report_body/pie_chart';
import PieChartAssets from '@/components/balance_sheet_report_body/pie_chart_assets';

interface IBalanceSheetReportBodyAllProps {
  reportId: string;
}

const BalanceSheetReportBodyAll = ({ reportId }: IBalanceSheetReportBodyAllProps) => {
  const { selectedCompany } = useUserCtx();
  const {
    data: reportFinancial,
    code: getReportFinancialCode,
    success: getReportFinancialSuccess,
    isLoading: getReportFinancialIsLoading,
  } = APIHandler<FinancialReport>(APIName.REPORT_FINANCIAL_GET_BY_ID, {
    params: {
      companyId: selectedCompany?.id ?? DEFAULT_DISPLAYED_COMPANY_ID,
      reportId: reportId ?? '10000003',
    },
  });

  // TODO: 測試用，正式上線時需刪除 (20240723 - Shirley)
  // eslint-disable-next-line no-console
  console.log('reportFinancial', reportFinancial);

  if (getReportFinancialIsLoading) {
    return <div>Loading...</div>;
  } else if (!getReportFinancialSuccess) {
    return <div>Error {getReportFinancialCode}</div>;
  }

  const page1 = (
    <div className="">
      {/* Info: watermark logo (20240723 - Shirley) */}
      <div className="relative right-0 top-16 z-0">
        <Image
          className="absolute right-0 top-0"
          src="/logo/watermark_logo.svg"
          alt="isunfa logo"
          width={400}
          height={300}
        />
      </div>

      <header className="mb-[86px] flex justify-between pl-0 text-white">
        <div className="w-3/10 bg-surface-brand-secondary pb-14px pl-[10px] pr-14px pt-[40px] font-bold">
          <div className="">
            <h1 className="mb-30px text-h6">
              2330 <br />
              台灣積體電路製造股份有限公司
            </h1>
            <p className="font-normal">
              2023年第4季 <br />
              合併財務報告 - 資產負債表
            </p>
          </div>
        </div>
        <div className="box-border w-35% text-right">
          <h2 className="relative border-b-[10px] border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Balance Sheet
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-9/12 bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>

      <section className="text-text-neutral-secondary">
        <div className="relative z-1 mb-[16px] flex justify-between font-semibold text-surface-brand-secondary">
          <p>一、項目彙總格式</p>
          <p>單位：新台幣仟元</p>
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
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2023-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2022-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
                資產
              </td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">11XX</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">流動資產合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                {reportFinancial?.general[1].curPeriodAmountString}
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
                {reportFinancial?.general[1].curPeriodPercentage}
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                {reportFinancial?.general[1].prePeriodAmountString}
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
                {reportFinancial?.general[1].prePeriodPercentage}
              </td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">15XX</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">非流動資產合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                {reportFinancial?.general[2].curPeriodAmountString}
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
                {reportFinancial?.general[2].curPeriodPercentage}
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                {reportFinancial?.general[2].prePeriodAmountString}
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
                {reportFinancial?.general[2].prePeriodPercentage}
              </td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1XXX</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">資產總計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                {reportFinancial?.general[3].curPeriodAmountString}
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
                {reportFinancial?.general[3].curPeriodPercentage}
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                {reportFinancial?.general[3].prePeriodAmountString}
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
                {reportFinancial?.general[3].prePeriodPercentage}
              </td>
            </tr>
            <tr>
              <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
                負債及權益
              </td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">21XX</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">流動負債合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">913,583,316</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">16</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">944,226,817</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">19</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">21XX</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">非流動負債合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                1,135,525,052
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">21</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">944,226,817</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">19</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">21XX</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">負債總計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,049,108,368
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">37</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">944,226,817</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">40</td>
            </tr>
          </tbody>
        </table>
      </section>
      <footer className="mt-[40px] flex items-center justify-between border-t-[2px_solid_#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">1</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <Image src="/logo/white_isunfa_logo_light.svg" alt="" />
        </div>
      </footer>
    </div>
  );
  const page2 = (
    <div className="">
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
            Balance Sheet
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-9/12 bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p>一、項目彙總格式</p>
          <p>單位：新台幣仟元</p>
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
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2023-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2022-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
                權益
              </td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3100</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                歸屬於母公司業主之權益
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">259,320,710</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">5</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">259,303,805</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">5</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3200</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">資本公積合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">69,876,381</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">69,330,340</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3300</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">保留盈餘合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                3,158,030,792
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">57</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,637,524,688
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">53</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3400</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">其他權益合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-28,314,256</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-20,505,626</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">31XX</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                歸屬於母公司業主之權益合計
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                3,458,913,627
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">63</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,945,653,195
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">59</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">36XX</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">非控制權益</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">24,349,220</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">14,835,672</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3XXX</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">權益總額</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                3,483,262,847
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">63</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,960,488,867
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">60</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3XX2</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">負債及權益總計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                5,532,371,215
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">100</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                4,964,778,878
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">100</td>
            </tr>
          </tbody>
        </table>

        {/* Info: watermark logo (20240723 - Shirley) */}
        <div className="relative bottom-20 right-0 -z-10">
          <Image
            className="absolute right-0 top-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>

        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
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
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2023-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2022-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
                資產
              </td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">11XX</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">流動資產合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,194,032,910
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">40</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,052,896,744
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">41</td>
            </tr>
          </tbody>
        </table>
      </section>
      <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">2</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <Image src="/logo/white_isunfa_logo_light.svg" alt="" />
        </div>
      </footer>
    </div>
  );
  const page3 = (
    <div>
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
            Balance Sheet
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
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
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2023-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2022-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
                資產
              </td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">11XX</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">流動資產合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,194,032,910
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">40</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,052,896,744
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">41</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1100</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">現金及約當現金</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                1,465,427,753
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">26</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                1,342,814,083
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">27</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1120</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                透過其他綜合損益按公允價值衡量之金融資產－流動
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">154,530,830</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">3</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">122,998,543</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">2</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1136</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                按攤銷後成本衡量之金融資產－流動
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">66,761,221</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">94,600,219</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">2</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1139</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">避險之金融資產－流動</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">2,329</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1170</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">應收帳款淨額</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">201,313,914</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">4</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">229,755,887</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">5</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1180</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">應收帳款－關係人淨額</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">624,451</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,583,958</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1210</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">其他應收款－關係人</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">71,871</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">68,975</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">130X</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">存貨</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">250,997,088</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">5</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">221,149,441</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">4</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1470</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">其他流動資產</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">53,381,146</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">38,853,204</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1476</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">其他金融資產－流動</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">27,158,766</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">25,964,428</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
            </tr>
          </tbody>
        </table>
      </section>
      <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">3</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <img src="/logo/white_isunfa_logo_light.svg" alt="" />
        </div>
      </footer>
    </div>
  );
  const page4 = (
    <div>
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
            Balance Sheet
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
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
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2023-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2022-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1479</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">其他流動資產－其他</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">26,222,380</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">12,888,776</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">11XX</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">流動資產合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,194,032,910
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">40</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,052,896,744
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">41</td>
            </tr>
            <tr>
              <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
                非流動資產
              </td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1510</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                透過損益按公允價值衡量之金融資產－非流動
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">13,417,457</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">6,540,000</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1517</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                透過其他綜合損益按公允價值衡量之金融資產－非流動
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">7,208,655</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">6,159,200</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1536</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                按攤銷後成本衡量之金融資產－非流動
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">79,199,367</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">2</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">35,127,215</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1550</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">採用權益法之投資</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">29,616,638</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">27,641,505</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1600</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">不動產、廠房及設備</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                3,064,474,984
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">55</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,693,836,894
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">54</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1755</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">使用權資產</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">40,424,830</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">41,914,136</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1780</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">無形資產</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">22,766,744</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">25,999,155</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1840</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">遞延所得稅資產</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">64,175,787</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">69,185,842</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1900</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">其他非流動資產</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">17,053,843</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">12,018,111</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1920</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">存出保證金</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">7,044,420</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">4,467,022</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
          </tbody>
        </table>
      </section>
      <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">4</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <img src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
      <div className="mt-4 flex justify-center"></div>
    </div>
  );
  const page5 = (
    <div>
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
            Balance Sheet
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
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
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2023-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2022-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1990</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">其他非流動資產－其他</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">10,009,423</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">7,551,089</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">15XX</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">非流動資產合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                3,338,338,305
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">60</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,911,882,134
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">59</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">1XXX</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">資產總計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                5,532,371,215
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">100</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                4,964,778,878
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">100</td>
            </tr>
            <tr>
              <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
                負債及權益
              </td>
            </tr>
            <tr>
              <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
                負債
              </td>
            </tr>
            <tr>
              <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
                流動負債
              </td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2120</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                透過損益按公允價值衡量之金融負債－流動
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">121,412</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">116,215</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2126</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">避險之金融負債－流動</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">27,334,164</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">813</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2170</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">應付帳款</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">55,726,757</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">54,879,708</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2180</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">應付帳款－關係人</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,566,300</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,642,637</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2200</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">其他應付款</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">423,960,584</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">8</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">454,300,789</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">9</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2201</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">應付薪資</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">33,200,563</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">36,435,509</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2206</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">應付員工紅利</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">50,164,989</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">61,058,446</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2207</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">應付董事酬勞</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">551,955</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">690,128</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
          </tbody>
        </table>
      </section>
      <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">5</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <img src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    </div>
  );
  const page6 = (
    <div>
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
            Balance Sheet
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
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
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2023-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2022-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2213</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">應付設備款</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">171,484,616</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">3</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">213,499,613</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">4</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2216</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">應付股利</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">168,558,461</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">3</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">142,617,093</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">3</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2230</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">本期所得稅負債</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">98,912,902</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">2</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">120,801,814</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">3</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2300</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">其他流動負債</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">305,961,197</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">5</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">312,484,864</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">6</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2320</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                一年或一營業週期內到期長期負債
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">9,293,266</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">19,313,889</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2399</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">其他流動負債－其他</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">296,667,931</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">5</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">293,170,952</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">6</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">21XX</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">流動負債合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">913,583,316</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">16</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">944,226,817</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">19</td>
            </tr>
            <tr>
              <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
                非流動負債
              </td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2530</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">應付公司債</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">913,899,843</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">17</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">834,336,439</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">17</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2540</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">長期借款</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">4,382,965</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">4,760,047</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2541</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">銀行長期借款</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">4,382,965</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">4,760,047</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2570</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">遞延所得稅負債</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">53,856</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">1,031,383</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2580</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">租賃負債－非流動</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">28,681,835</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">29,764,097</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2600</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">其他非流動負債</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">188,506,553</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">3</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">190,171,228</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">4</td>
            </tr>
          </tbody>
        </table>
      </section>
      <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">6</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <img src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    </div>
  );
  const page7 = (
    <div>
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
            Balance Sheet
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
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
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2023-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2022-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2640</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                淨確定福利負債－非流動
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">9,257,224</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">3</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">9,321,091</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2645</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">存入保證金</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">923,164</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">892,021</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2670</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">其他非流動負債－其他</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">178,326,165</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">2</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">179,958,116</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">4</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">25XX</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">非流動負債合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                1,135,525,052
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">5</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                1,060,063,194
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">21</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">2XXX</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">負債總計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,049,108,368
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,004,290,011
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">40</td>
            </tr>
            <tr>
              <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
                權益
              </td>
            </tr>
            <tr>
              <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
                歸屬於母公司業主之權益
              </td>
            </tr>
            <tr>
              <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
                股本
              </td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3110</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">普通股股本</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">259,320,710</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">17</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">259,303,805</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">5</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3100</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">股本合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">259,320,710</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">259,303,805</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">5</td>
            </tr>
            <tr>
              <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
                資本公積
              </td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3210</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">資本公積－發行溢價</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">33,299,225</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">33,076,016</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3211</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                資本公積－普通股股票溢價
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">24,406,854</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">24,183,645</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3213</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                資本公積－轉換公司債轉換溢價
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">8,892,371</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">3</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">8,892,371</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
          </tbody>
        </table>
      </section>
      <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">7</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <img src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    </div>
  );
  const page8 = (
    <div>
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
            Balance Sheet
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
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
                2023-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2022-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3230</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                資本公積－買賣取得或處分子公司股權價格與帳面價值差額
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">8,406,282</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">8,406,282</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3235</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                資本公積－彙列對子公司所有權權益變動數
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">4,199,936</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">4,229,892</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3250</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">資本公積－受贈資產</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">81,368</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">64,955</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3251</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                資本公積－受領股票贈與
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">11,275</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">11,275</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3252</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                資本公積－其他受贈資產
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">70,093</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">53,680</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3260</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                資本公積－採用權益法認列關係企業及合資股權權益之變動數
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">302,396</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">311,863</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3270</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">資本公積－合併溢額</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">22,803,291</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">22,803,291</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3273</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                資本公積－限制員工權利股票
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">783,883</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">438,029</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3200</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">資本公積合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">69,876,381</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">69,330,340</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
            </tr>
            <tr>
              <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
                保留盈餘
              </td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3310</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">法定盈餘公積</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">311,146,899</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">6</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">311,146,899</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">6</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3320</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">特別盈餘公積</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">3,154,310</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
          </tbody>
        </table>
      </section>
      <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">8</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <img src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    </div>
  );
  const page9 = (
    <div>
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
            Balance Sheet
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p>二、細項分類格式</p>
          <p>單位：新台幣仟元</p>
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
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2023-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2022-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3350</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                未分配盈餘（或待彌補虧損）
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,846,883,893
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">51</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,323,223,479
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">47</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3300</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">保留盈餘合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                3,158,030,792
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">57</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,637,524,688
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">53</td>
            </tr>
            <tr>
              <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px]">
                其他權益
              </td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3400</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">其他權益合計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                (28,314,256)
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                (20,505,626)
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3500</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">庫藏股票</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">31XX</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                歸屬於母公司業主之權益合計
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                3,458,913,627
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">63</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,945,653,195
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">59</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">36XX</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">非控制權益</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">24,349,220</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">14,835,672</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">1</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3XXX</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">權益總額</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                3,483,262,847
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">63</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                2,960,488,867
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">60</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3XX2</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">負債及權益總計</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                5,532,371,215
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">100</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
                4,964,778,878
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">100</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3998</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                預收股款（權益項下）之約當發行股數
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">3999</td>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">
                母公司暨子公司所持有之母公司庫藏股票數（單位：股）
              </td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">-</td>
            </tr>
          </tbody>
        </table>
        {/* Info: watermark logo (20240723 - Anna) */}
        <div className="relative -z-10">
          <Image
            className="absolute right-0 top-[-300px]"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>
      </section>
      <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">9</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <img src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    </div>
  );
  const page10 = (
    <div>
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
            Balance Sheet
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p>三、資產負債比例表</p>
        </div>
        <div className="flex flex-col space-y-10">
          <div className="flex items-center space-x-10">
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#FD6F8E]"></span>
                資產
              </li>
              <li className="flex items-center">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#53B1FD]"></span>
                負債
              </li>
              <li className="flex items-center">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#9B8AFB]"></span>
                權益
              </li>
            </ul>
            <PieChart data={[50, 31, 19]} />
          </div>
          <div className="flex items-center space-x-10">
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#FD6F8E]"></span>
                資產
              </li>
              <li className="flex items-center">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#53B1FD]"></span>
                負債
              </li>
              <li className="flex items-center">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#9B8AFB]"></span>
                權益
              </li>
            </ul>
            <PieChart data={[50, 30, 20]} />
          </div>
        </div>
        <div className="relative -z-10">
  <Image
    className="absolute right-0 top-[-300px]"
    src="/logo/watermark_logo.svg"
    alt="isunfa logo"
    width={450}
    height={300}
  />
</div>
      </section>
      <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">10</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <img src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    </div>
  );
  const page11 = (
    <div>
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
            Balance Sheet
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p>四、資產分布圖</p>
        </div>
        <div className="flex flex-col space-y-10">
          <div className="flex items-center justify-between">
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#FD6F8E]"></span>
                <span>不動產、廠房及設備</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#6CDEA0]"></span>
                <span>現⾦及約當現⾦</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#F670C7]"></span>
                <span>存貨</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#FD853A]"></span>
                <span>應收帳款淨額</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#53B1FD]"></span>
                <span className="flex-1">透過其他綜合損益按公允價值衡量之⾦融資產－流動</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#9B8AFB]"></span>
                <span>其他</span>
              </li>
            </ul>
            <PieChartAssets
              data={[55, 26, 5, 4, 3, 7]}
              labels={[
                '不動產、廠房及設備',
                '現⾦及約當現⾦',
                '存貨',
                '應收帳款淨額',
                '透過其他綜合損益按公允價值衡量之金融資產－流動',
                '其他',
              ]}
              colors={['#FD6F8E', '#6CDEA0', '#F670C7', '#FD853A', '#53B1FD', '#9B8AFB']}
            />
          </div>
          <div className="flex items-center justify-between">
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#FD6F8E]"></span>
                <span>不動產、廠房及設備</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#6CDEA0]"></span>
                <span>現⾦及約當現⾦</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#F670C7]"></span>
                <span>存貨</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#FD853A]"></span>
                <span>應收帳款淨額</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#304872]"></span>
                <span>按攤銷後成本衡量之⾦融資產－流動</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#53B1FD]"></span>
                <span className="flex-1">透過其他綜合損益按公允價值衡量之⾦融資產－流動</span>
              </li>
              <li className="flex items-center">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#9B8AFB]"></span>
                <span>其他</span>
              </li>
            </ul>
            <PieChartAssets
              data={[54, 27, 5, 4, 2, 2, 6]}
              labels={[
                '不動產、廠房及設備',
                '現⾦及約當現⾦',
                '存貨',
                '應收帳款淨額',
                '透過其他綜合損益按公允價值衡量之金融資產－流動',
                '按攤銷後成本衡量之金融資產－流動',
                '其他',
              ]}
              colors={['#FD6F8E', '#6CDEA0', '#F670C7', '#FD853A', '#53B1FD', '#304872', '#9B8AFB']}
            />
          </div>
        </div>
        <div className="relative -z-10">
          <Image
            className="absolute right-0 top-[-300px]"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>
      </section>
      <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">11</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <img src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    </div>
  );
  const page12 = (
    <div>
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
            Balance Sheet
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mt-[30px] flex justify-between font-semibold text-surface-brand-secondary">
          <p>五、應收帳款週轉天數</p>
          <p>單位：天</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold"></th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                2023-12-31
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2022年度
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">應收帳款週轉天數</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">34</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">37</td>
            </tr>
          </tbody>
        </table>
        <div className="mb-[16px] mt-[32px] flex justify-between font-semibold text-surface-brand-secondary">
          <p>六、存貨週轉天數</p>
          <p>單位：天</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-left text-[14px] font-semibold"></th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2023年度
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                2022年度
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">存貨週轉天數</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">93</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">88</td>
            </tr>
          </tbody>
        </table>
        <div className="relative -z-10">
          <Image
            className="absolute right-0 top-[-300px]"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>
      </section>
      <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">12</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <img src="./logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
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
      {page12}
    </div>
  );
};

export default BalanceSheetReportBodyAll;
