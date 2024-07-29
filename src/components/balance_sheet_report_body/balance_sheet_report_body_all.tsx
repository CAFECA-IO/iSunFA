/* eslint-disable tailwindcss/no-arbitrary-value */
// TODO: 在 tailwindcss.config 註冊 css 變數，取消 eslint-disable (20240723 - Shirley)
import { APIName } from '@/constants/api_connection';
import { FREE_COMPANY_ID } from '@/constants/config';
import { useUserCtx } from '@/contexts/user_context';
import { FinancialReport, FinancialReportItem } from '@/interfaces/report';
import APIHandler from '@/lib/utils/api_handler';
import Image from 'next/image';
import React, { useEffect } from 'react';
import PieChart from '@/components/balance_sheet_report_body/pie_chart';
import PieChartAssets from '@/components/balance_sheet_report_body/pie_chart_assets';
import useStateRef from 'react-usestateref';
import { NON_EXISTING_REPORT_ID } from '@/constants/config';
import { timestampToString } from '@/lib/utils/common';

interface IBalanceSheetReportBodyAllProps {
  reportId: string;
}

enum ReportColumnType {
  CURRENT = 'current',
  PREVIOUS = 'previous',
}

const ACCOUNTINGS_WHOLE_COLUMN = [
  '資產',
  '負債及權益',
  '負債',
  '權益',
  '歸屬於母公司業主之權利',
  '流動資產',
  '股本',
  '流動負債',
  '非流動負債',
  '資本公積',
  '保留盈餘',
  '其他權益',
];

const BalanceSheetReportBodyAll = ({ reportId }: IBalanceSheetReportBodyAllProps) => {
  const { selectedCompany } = useUserCtx();

  const [curAssetLiabilityRatio, setCurAssetLiabilityRatio] = useStateRef<Array<number>>([]);
  const [preAssetLiabilityRatio, setPreAssetLiabilityRatio] = useStateRef<Array<number>>([]);

  const [curAssetMixRatio, setCurAssetMixRatio] = useStateRef<Array<number>>([]);
  const [preAssetMixRatio, setPreAssetMixRatio] = useStateRef<Array<number>>([]);

  const [curDate, setCurDate] = useStateRef<string>('');
  const [curYear, setCurYear] = useStateRef<string>('');
  const [preDate, setPreDate] = useStateRef<string>('');
  const [preYear, setPreYear] = useStateRef<string>('');

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

  const gatherALRData = (type: ReportColumnType) => {
    if (!reportFinancial?.general) return [0, 0, 0];

    const periodAmount = type === ReportColumnType.CURRENT ? 'curPeriodAmount' : 'prePeriodAmount';

    const totalAssets = Number(
      reportFinancial.general.find((item) => item.name === '資產總計')?.[periodAmount] || 0
    );
    const totalLiabilities = Number(
      reportFinancial.general.find((item) => item.name === '負債總計')?.[periodAmount] || 0
    );
    const totalEquity = Number(
      reportFinancial.general.find((item) => item.name === '權益總額')?.[periodAmount] || 0
    );

    if (totalAssets === 0 || totalLiabilities === 0 || totalEquity === 0) return [0, 0, 0];

    const total = totalAssets + totalLiabilities + totalEquity;

    return [
      (totalAssets / total) * 100,
      (totalLiabilities / total) * 100,
      (totalEquity / total) * 100,
    ];
  };

  // TODO: 改成拿後端的百分比，流動跟非流動資產的最大5筆 (20240726 - Shirley)
  const gatherAMRData = (type: ReportColumnType) => {
    if (!reportFinancial?.general || !reportFinancial?.details) return [0, 0, 0, 0, 0, 0];

    const periodAmount = type === ReportColumnType.CURRENT ? 'curPeriodAmount' : 'prePeriodAmount';

    const totalAssets = Number(
      reportFinancial.general.find((item) => item.name === '資產總計')?.[periodAmount] || 0
    );

    const equipment = Number(
      reportFinancial.details.find((item) => item.name === '不動產、廠房及設備')?.[periodAmount] ||
        0
    );

    const cash = Number(
      reportFinancial.details.find((item) => item.name === '現⾦及約當現⾦')?.[periodAmount] || 0
    );

    const inventory = Number(
      reportFinancial.details.find((item) => item.name === '存貨')?.[periodAmount] || 0
    );

    const receivable = Number(
      reportFinancial.details.find((item) => item.name === '應收帳款淨額')?.[periodAmount] || 0
    );

    const otherAssetsFromComprehensive = Number(
      reportFinancial.details.find(
        (item) => item.name === '透過其他綜合損益按公允價值衡量之⾦融資產－流動'
      )?.[periodAmount] || 0
    );

    const remainingAssets =
      totalAssets - equipment - cash - inventory - receivable - otherAssetsFromComprehensive;

    if (totalAssets === 0) return [0, 0, 0, 0, 0, 0];

    const result = [
      Math.round((equipment / totalAssets) * 100),
      Math.round((cash / totalAssets) * 100),
      Math.round((inventory / totalAssets) * 100),
      Math.round((receivable / totalAssets) * 100),
      Math.round((otherAssetsFromComprehensive / totalAssets) * 100),
      Math.round((remainingAssets / totalAssets) * 100),
    ];

    return result;
  };

  useEffect(() => {
    if (getReportFinancialSuccess === true && reportFinancial) {
      const curALR = gatherALRData(ReportColumnType.CURRENT);
      const preALR = gatherALRData(ReportColumnType.PREVIOUS);
      const curAMR = gatherAMRData(ReportColumnType.CURRENT);
      const preAMR = gatherAMRData(ReportColumnType.PREVIOUS);
      const currentDateString = timestampToString(reportFinancial.curDate.to ?? 0);
      const previousDateString = timestampToString(reportFinancial.preDate.to ?? 0);
      const currentYear = currentDateString.year;
      const previousYear = previousDateString.year;

      setCurAssetLiabilityRatio(curALR);
      setPreAssetLiabilityRatio(preALR);
      setCurAssetMixRatio(curAMR);
      setPreAssetMixRatio(preAMR);
      setCurDate(currentDateString.date);
      setPreDate(previousDateString.date);
      setCurYear(currentYear);
      setPreYear(previousYear);
    }
  }, [reportFinancial]);

  if (getReportFinancialIsLoading) {
    return <div>Loading...</div>;
  } else if (!getReportFinancialSuccess && reportFinancial) {
    return <div>Error {getReportFinancialCode}</div>;
  }

  const rowsForPage1 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(0, 9).map((item, index) => {
      if (ACCOUNTINGS_WHOLE_COLUMN.includes(item.name)) {
        return (
          <tr key={item.code}>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px] font-bold">
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: it's ok to use index in the static data (20240723 - Shirley)
        // eslint-disable-next-line react/no-array-index-key
        <tr key={index}>
          <td className="border border-[#dee2e6] p-[10px] text-[14px]">{item.code}</td>
          <td className="border border-[#dee2e6] p-[10px] text-[14px]">{item.name}</td>
          <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
            {item.curPeriodPercentage}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
            {item.prePeriodPercentage}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage2 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(9, 20).map((item, index) => {
      if (ACCOUNTINGS_WHOLE_COLUMN.includes(item.name)) {
        return (
          <tr key={item.code}>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px] font-bold">
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: it's ok to use index in the static data (20240723 - Shirley)
        // eslint-disable-next-line react/no-array-index-key
        <tr key={index}>
          <td className="border border-[#dee2e6] p-[10px] text-[14px]">{item.code}</td>
          <td className="border border-[#dee2e6] p-[10px] text-[14px]">{item.name}</td>
          <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
            {item.curPeriodPercentage}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
            {item.prePeriodPercentage}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage2_1 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(0, 2).map((item, index) => {
      if (ACCOUNTINGS_WHOLE_COLUMN.includes(item.name)) {
        return (
          <tr key={item.code}>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px] font-bold">
              {item.name}
            </td>
          </tr>
        );
      }
      return (
        // Info: it's ok to use index in the static data (20240723 - Shirley)
        // eslint-disable-next-line react/no-array-index-key
        <tr key={index}>
          <td className="border border-[#dee2e6] p-[10px] text-[14px]">{item.code}</td>
          <td className="border border-[#dee2e6] p-[10px] text-[14px]">{item.name}</td>
          <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
            {item.curPeriodPercentage}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
            {item.prePeriodPercentage}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage3 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(0, 14).map((item, index) => {
      if (ACCOUNTINGS_WHOLE_COLUMN.includes(item.name)) {
        return (
          <tr key={item.code}>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px] font-bold">
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: it's ok to use index in the static data (20240723 - Shirley)
        // eslint-disable-next-line react/no-array-index-key
        <tr key={index}>
          <td className="border border-[#dee2e6] p-[10px] text-[14px]">{item.code}</td>
          <td className="border border-[#dee2e6] p-[10px] text-[14px]">{item.name}</td>
          <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
            {item.curPeriodPercentage}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
            {item.prePeriodPercentage}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage4 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(14, 26).map((item, index) => {
      if (ACCOUNTINGS_WHOLE_COLUMN.includes(item.name)) {
        return (
          <tr key={item.code}>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px] font-bold">
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: it's ok to use index in the static data (20240723 - Shirley)
        // eslint-disable-next-line react/no-array-index-key
        <tr key={index}>
          <td className="border border-[#dee2e6] p-[10px] text-[14px]">{item.code}</td>
          <td className="border border-[#dee2e6] p-[10px] text-[14px]">{item.name}</td>
          <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
            {item.curPeriodPercentage}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
            {item.prePeriodPercentage}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage5 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(26, 39).map((item, index) => {
      if (ACCOUNTINGS_WHOLE_COLUMN.includes(item.name)) {
        return (
          <tr key={item.code}>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px] font-bold">
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: it's ok to use index in the static data (20240723 - Shirley)
        // eslint-disable-next-line react/no-array-index-key
        <tr key={index}>
          <td className="border border-[#dee2e6] p-[10px] text-[14px]">{item.code}</td>
          <td className="border border-[#dee2e6] p-[10px] text-[14px]">{item.name}</td>
          <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
            {item.curPeriodPercentage}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
            {item.prePeriodPercentage}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage6 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(39, 56).map((item, index) => {
      if (ACCOUNTINGS_WHOLE_COLUMN.includes(item.name)) {
        return (
          <tr key={item.code}>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px] font-bold">
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: it's ok to use index in the static data (20240723 - Shirley)
        // eslint-disable-next-line react/no-array-index-key
        <tr key={index}>
          <td className="border border-[#dee2e6] p-[10px] text-[14px]">{item.code}</td>
          <td className="border border-[#dee2e6] p-[10px] text-[14px]">{item.name}</td>
          <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
            {item.curPeriodPercentage}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
            {item.prePeriodPercentage}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage7 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(56, 75).map((item, index) => {
      if (ACCOUNTINGS_WHOLE_COLUMN.includes(item.name)) {
        return (
          <tr key={item.code}>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px] font-bold">
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: it's ok to use index in the static data (20240723 - Shirley)
        // eslint-disable-next-line react/no-array-index-key
        <tr key={index}>
          <td className="border border-[#dee2e6] p-[10px] text-[14px]">{item.code}</td>
          <td className="border border-[#dee2e6] p-[10px] text-[14px]">{item.name}</td>
          <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
            {item.curPeriodPercentage}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
            {item.prePeriodPercentage}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage8 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(75, 90).map((item, index) => {
      if (ACCOUNTINGS_WHOLE_COLUMN.includes(item.name)) {
        return (
          <tr key={item.code}>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px] font-bold">
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: it's ok to use index in the static data (20240723 - Shirley)
        // eslint-disable-next-line react/no-array-index-key
        <tr key={index}>
          <td className="border border-[#dee2e6] p-[10px] text-[14px]">{item.code}</td>
          <td className="border border-[#dee2e6] p-[10px] text-[14px]">{item.name}</td>
          <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
            {item.curPeriodPercentage}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
            {item.prePeriodPercentage}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage9 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(90, 102).map((item, index) => {
      if (ACCOUNTINGS_WHOLE_COLUMN.includes(item.name)) {
        return (
          <tr key={item.code}>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px] font-bold">
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: it's ok to use index in the static data (20240723 - Shirley)
        // eslint-disable-next-line react/no-array-index-key
        <tr key={index}>
          <td className="border border-[#dee2e6] p-[10px] text-[14px]">{item.code}</td>
          <td className="border border-[#dee2e6] p-[10px] text-[14px]">{item.name}</td>
          <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
            {item.curPeriodPercentage}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
            {item.prePeriodPercentage}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForPage12 = (items: Array<FinancialReportItem>) => {
    const rows = items.slice(42, 54).map((item, index) => {
      if (ACCOUNTINGS_WHOLE_COLUMN.includes(item.name)) {
        return (
          <tr key={item.code}>
            <td colSpan={6} className="border border-[#dee2e6] p-[10px] text-[14px] font-bold">
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        // Info: it's ok to use index in the static data (20240723 - Shirley)
        // eslint-disable-next-line react/no-array-index-key
        <tr key={index}>
          <td className="border border-[#dee2e6] p-[10px] text-[14px]">{item.code}</td>
          <td className="border border-[#dee2e6] p-[10px] text-[14px]">{item.name}</td>
          <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
            {item.curPeriodPercentage}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-[#dee2e6] p-[10px] text-center text-[14px]">
            {item.prePeriodPercentage}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const page1 = (
    <div id="1">
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
              {curYear}年第4季 <br />
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
                {curDate}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                {preDate}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.general &&
              Object.prototype.hasOwnProperty.call(reportFinancial, 'general') &&
              rowsForPage1(reportFinancial.general)}
          </tbody>
        </table>
      </section>
      <footer className="mt-[40px] flex items-center justify-between border-t-[2px_solid_#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">1</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    </div>
  );

  const page2 = (
    <div id="2">
      <header className="flex justify-between text-white">
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
                {curDate}{' '}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                {preDate}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.general &&
              Object.prototype.hasOwnProperty.call(reportFinancial, 'general') &&
              rowsForPage2(reportFinancial.general)}
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
                {curDate}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                {preDate}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              Object.prototype.hasOwnProperty.call(reportFinancial, 'details') &&
              rowsForPage2_1(reportFinancial.details)}
            {/* <tr>
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
            </tr> */}
          </tbody>
        </table>
      </section>
      <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">2</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    </div>
  );
  const page3 = (
    <div id="3">
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
                {curDate}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                {preDate}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.general &&
              Object.prototype.hasOwnProperty.call(reportFinancial, 'general') &&
              rowsForPage3(reportFinancial.details)}
          </tbody>
        </table>
      </section>
      <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">3</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    </div>
  );
  const page4 = (
    <div id="4">
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
                {curDate}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                {preDate}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.general &&
              Object.prototype.hasOwnProperty.call(reportFinancial, 'details') &&
              rowsForPage4(reportFinancial.details)}
          </tbody>
        </table>
      </section>
      <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">4</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
      <div className="mt-4 flex justify-center"></div>
    </div>
  );
  const page5 = (
    <div id="5">
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
                {curDate}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                {preDate}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              Object.prototype.hasOwnProperty.call(reportFinancial, 'details') &&
              rowsForPage5(reportFinancial.details)}
          </tbody>
        </table>
      </section>
      <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">5</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    </div>
  );
  const page6 = (
    <div id="6">
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
                {curDate}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                {preDate}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              Object.prototype.hasOwnProperty.call(reportFinancial, 'details') &&
              rowsForPage6(reportFinancial.details)}
          </tbody>
        </table>
      </section>
      <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">6</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    </div>
  );
  const page7 = (
    <div id="7">
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
                {curDate}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                {preDate}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              Object.prototype.hasOwnProperty.call(reportFinancial, 'details') &&
              rowsForPage7(reportFinancial.details)}
          </tbody>
        </table>
      </section>
      <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">7</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    </div>
  );
  const page8 = (
    <div id="8">
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
                {curDate}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th
                className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {preDate}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              Object.prototype.hasOwnProperty.call(reportFinancial, 'details') &&
              rowsForPage8(reportFinancial.details)}
          </tbody>
        </table>
      </section>
      <footer className="mt-[40px] flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">8</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    </div>
  );
  const page9 = (
    <div id="9">
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
                {curDate}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                {preDate}
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-center text-[14px] font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {reportFinancial &&
              reportFinancial.details &&
              Object.prototype.hasOwnProperty.call(reportFinancial, 'details') &&
              rowsForPage9(reportFinancial.details)}
          </tbody>
        </table>
        {/* Info: watermark logo (20240723 - Anna) */}
        <div className="relative -z-10">
          <Image
            className="absolute -top-300px right-0"
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
          <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    </div>
  );
  const page10 = (
    <div id="10">
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
          <div className="flex flex-col space-y-0">
            <p className="text-xs font-semibold text-text-brand-secondary-lv2">{curDate}</p>
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
              <PieChart data={curAssetLiabilityRatio} />
            </div>
          </div>
          <div className="flex flex-col space-y-0">
            <p className="text-xs font-semibold text-text-brand-secondary-lv2">{preDate}</p>
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
              <PieChart data={preAssetLiabilityRatio} />
            </div>
          </div>
        </div>
        <div className="relative -z-10">
          <Image
            className="absolute -top-300px right-0"
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
          <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    </div>
  );
  const page11 = (
    <div id="11">
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
              data={curAssetMixRatio}
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
              data={preAssetMixRatio}
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
            className="absolute -top-300px right-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>
      </section>
      <footer className="mt-5 flex items-center justify-between border-t-2 border-[#e0e0e0] bg-surface-brand-secondary p-[10px]">
        <p className="m-0 text-[12px] text-white">11</p>
        <div className="text-[16px] font-bold text-surface-brand-secondary">
          <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
        </div>
      </footer>
    </div>
  );
  const page12 = (
    <div id="12">
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
        <div className="mt-30px flex justify-between font-semibold text-surface-brand-secondary">
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
                {curYear}年度
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                {preYear}年度
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">應收帳款週轉天數</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-</td>
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
                {curYear}年度
              </th>
              <th className="border border-[#c1c9d5] bg-[#ffd892] p-[10px] text-end text-[14px] font-semibold">
                {preYear}年度
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {reportFinancial &&
                reportFinancial.general &&
                Object.prototype.hasOwnProperty.call(reportFinancial, 'general') &&
                rowsForPage12(reportFinancial.general)}
              <td className="border border-[#dee2e6] p-[10px] text-[14px]">存貨週轉天數</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-</td>
              <td className="border border-[#dee2e6] p-[10px] text-end text-[14px]">-</td>
            </tr>
          </tbody>
        </table>
        <div className="relative -z-10">
          <Image
            className="absolute -top-300px right-0"
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
          <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
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
