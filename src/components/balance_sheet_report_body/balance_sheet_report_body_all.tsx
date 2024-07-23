/* eslint-disable tailwindcss/no-arbitrary-value */
// TODO: 在 tailwindcss.config 註冊 css 變數，取消 eslint-disable (20240723 - Shirley)
import { APIName } from '@/constants/api_connection';
import { DEFAULT_DISPLAYED_COMPANY_ID } from '@/constants/display';
import { useUserCtx } from '@/contexts/user_context';
import APIHandler from '@/lib/utils/api_handler';
import Image from 'next/image';
import React from 'react';

interface FinancialReportItem {
  code: string;
  name: string;
  curPeriodAmount: number;
  curPeriodAmountString: string;
  curPeriodPercentage: number;
  prePeriodAmount: number;
  prePeriodAmountString: string;
  prePeriodPercentage: number;
  indent: number;
}

interface FinancialReport {
  general: FinancialReportItem[];
  details: FinancialReportItem[];
}

interface IBalanceSheetReportBodyAllProps {
  reportId: string;
}

/* Deprecated: 作為參考的 API response (20240723 - Shirley)

example
"general": [
  {
    "code": "",
    "name": "資產",
    "curPeriodAmount": 0,
    "curPeriodAmountString": "0",
    "curPeriodPercentage": 0,
    "prePeriodAmount": 0,
    "prePeriodAmountString": "0",
    "prePeriodPercentage": 0,
    "indent": 0
  },
  {
    "code": "11XX",
    "name": "流動資產合計",
    "curPeriodAmount": 0,
    "curPeriodAmountString": "0",
    "curPeriodPercentage": 0,
    "prePeriodAmount": 0,
    "prePeriodAmountString": "0",
    "prePeriodPercentage": 0,
    "indent": 1
  },
  {
    "code": "15XX",
    "name": "非流動資產合計",
    "curPeriodAmount": 0,
    "curPeriodAmountString": "0",
    "curPeriodPercentage": 0,
    "prePeriodAmount": 0,
    "prePeriodAmountString": "0",
    "prePeriodPercentage": 0,
    "indent": 1
  },
  {
    "code": "1XXX",
    "name": "資產總計",
    "curPeriodAmount": 0,
    "curPeriodAmountString": "0",
    "curPeriodPercentage": 0,
    "prePeriodAmount": 0,
    "prePeriodAmountString": "0",
    "prePeriodPercentage": 0,
    "indent": 0
  },
  {
    "code": "",
    "name": "負債及權益",
    "curPeriodAmount": 0,
    "curPeriodAmountString": "0",
    "curPeriodPercentage": 0,
    "prePeriodAmount": 0,
    "prePeriodAmountString": "0",
    "prePeriodPercentage": 0,
    "indent": 0
  },
  {
    "code": "",
    "name": "負債",
    "curPeriodAmount": 0,
    "curPeriodAmountString": "0",
    "curPeriodPercentage": 0,
    "prePeriodAmount": 0,
    "prePeriodAmountString": "0",
    "prePeriodPercentage": 0,
    "indent": 1
  },
  {
    "code": "21XX",
    "name": "流動負債合計",
    "curPeriodAmount": 0,
    "curPeriodAmountString": "0",
    "curPeriodPercentage": 0,
    "prePeriodAmount": 0,
    "prePeriodAmountString": "0",
    "prePeriodPercentage": 0,
    "indent": 2
  },
  {
    "code": "25XX",
    "name": "非流動負債合計",
    "curPeriodAmount": 0,
    "curPeriodAmountString": "0",
    "curPeriodPercentage": 0,
    "prePeriodAmount": 0,
    "prePeriodAmountString": "0",
    "prePeriodPercentage": 0,
    "indent": 2
  },
  {
    "code": "2XXX",
    "name": "負債總計",
    "curPeriodAmount": 0,
    "curPeriodAmountString": "0",
    "curPeriodPercentage": 0,
    "prePeriodAmount": 0,
    "prePeriodAmountString": "0",
    "prePeriodPercentage": 0,
    "indent": 1
  },
  {
    "code": "",
    "name": "權益",
    "curPeriodAmount": 0,
    "curPeriodAmountString": "0",
    "curPeriodPercentage": 0,
    "prePeriodAmount": 0,
    "prePeriodAmountString": "0",
    "prePeriodPercentage": 0,
    "indent": 1
  },
  {
    "code": "",
    "name": "歸屬於母公司業主之權利",
    "curPeriodAmount": 0,
    "curPeriodAmountString": "0",
    "curPeriodPercentage": 0,
    "prePeriodAmount": 0,
    "prePeriodAmountString": "0",
    "prePeriodPercentage": 0,
    "indent": 2
  },
  {
    "code": "3100",
    "name": "股本合計",
    "curPeriodAmount": 0,
    "curPeriodAmountString": "0",
    "curPeriodPercentage": 0,
    "prePeriodAmount": 0,
    "prePeriodAmountString": "0",
    "prePeriodPercentage": 0,
    "indent": 3
  },
  {
    "code": "3200",
    "name": "資本公積合計",
    "curPeriodAmount": 0,
    "curPeriodAmountString": "0",
    "curPeriodPercentage": 0,
    "prePeriodAmount": 0,
    "prePeriodAmountString": "0",
    "prePeriodPercentage": 0,
    "indent": 3
  },
  {
    "code": "3300",
    "name": "保留盈餘合計",
    "curPeriodAmount": 0,
    "curPeriodAmountString": "0",
    "curPeriodPercentage": 0,
    "prePeriodAmount": 0,
    "prePeriodAmountString": "0",
    "prePeriodPercentage": 0,
    "indent": 3
  },
  {
    "code": "3400",
    "name": "其他權益合計",
    "curPeriodAmount": 0,
    "curPeriodAmountString": "0",
    "curPeriodPercentage": 0,
    "prePeriodAmount": 0,
    "prePeriodAmountString": "0",
    "prePeriodPercentage": 0,
    "indent": 3
  },
  {
    "code": "31XX",
    "name": "歸屬於母公司業主之權益總計",
    "curPeriodAmount": 0,
    "curPeriodAmountString": "0",
    "curPeriodPercentage": 0,
    "prePeriodAmount": 0,
    "prePeriodAmountString": "0",
    "prePeriodPercentage": 0,
    "indent": 2
  },
  {
    "code": "3600",
    "name": "非控制權益",
    "curPeriodAmount": 0,
    "curPeriodAmountString": "0",
    "curPeriodPercentage": 0,
    "prePeriodAmount": 0,
    "prePeriodAmountString": "0",
    "prePeriodPercentage": 0,
    "indent": 2
  },
  {
    "code": "32XX",
    "name": "權益總額",
    "curPeriodAmount": 0,
    "curPeriodAmountString": "0",
    "curPeriodPercentage": 0,
    "prePeriodAmount": 0,
    "prePeriodAmountString": "0",
    "prePeriodPercentage": 0,
    "indent": 1
  },
  {
    "code": "3X2X",
    "name": "負債及權益總計",
    "curPeriodAmount": 0,
    "curPeriodAmountString": "0",
    "curPeriodPercentage": 0,
    "prePeriodAmount": 0,
    "prePeriodAmountString": "0",
    "prePeriodPercentage": 0,
    "indent": 0
  }
],
"details": [

]
}

*/

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
        <div className="w-[30%] bg-surface-brand-secondary pb-14px pl-[10px] pr-14px pt-[40px] font-bold">
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
            <span className="absolute bottom-[-20px] right-0 h-[5px] w-[75%] bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>

      <section className="text-text-neutral-secondary">
        <div className="text-primary-surface-brand-secondary z-1 relative mb-[16px] flex justify-between font-semibold text-surface-brand-secondary">
          <p>一、項目彙總格式</p>
          <p>單位：新台幣仟元</p>
        </div>
        <table className="z-1 relative w-full border-collapse bg-white">
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
          <img src="/logo/white_isunfa_logo_light.svg" alt="" />
        </div>
      </footer>
    </div>
  );

  const page2 = (
    <div className="">
      <header className="flex justify-between text-white">
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
              <td colSpan={5} className="border border-[#dee2e6] p-[10px] text-[14px]">
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
          <img src="/logo/white_isunfa_logo_light.svg" alt="" />
        </div>
      </footer>
    </div>
  );
  return (
    <div className="mx-auto w-a4-width">
      {page1}
      {page2}
    </div>
  );
};

export default BalanceSheetReportBodyAll;
