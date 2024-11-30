import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { BalanceSheetReport } from '@/interfaces/report';
import APIHandler from '@/lib/utils/api_handler';
import Image from 'next/image';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import PieChart from '@/components/balance_sheet_report_body/pie_chart';
import PieChartAssets from '@/components/balance_sheet_report_body/pie_chart_assets';
import useStateRef from 'react-usestateref';
import { timestampToString } from '@/lib/utils/common';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { useTranslation } from 'next-i18next';
import CollapseButton from '@/components/button/collapse_button';
import { FinancialReportTypesKey } from '@/interfaces/report_type';
import BalanceDetailsButton from '@/components/button/balance_details_button';
import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';
import { IDatePeriod } from '@/interfaces/date_period';
import PrintButton from '@/components/button/print_button';
import DownloadButton from '@/components/button/download_button';
import Toggle from '@/components/toggle/toggle';
// import { useGlobalCtx } from '@/contexts/global_context';
// import { useReactToPrint } from 'react-to-print';
import BalanceSheetA4Template from '@/components/balance_sheet_report_body/balance_sheet_a4_template';
import { Html2PdfOptions } from 'html2pdf.js';

interface BalanceSheetListProps {
  selectedDateRange: IDatePeriod | null; // Info: (20241023 - Anna) 接收來自上層的日期範圍
  isPrinting: boolean; // Info: (20241122 - Anna)  從父層傳入的列印狀態
  printRef: React.RefObject<HTMLDivElement>; // Info: (20241122 - Anna) 從父層傳入的 Ref
  printFn: () => void; // Info: (20241122 - Anna) 從父層傳入的列印函數
}

// Info: (20241022 - Anna) 定義圓餅圖顏色（紅、藍、紫）
const ASSETS_LIABILITIES_EQUITY_COLOR = ['bg-[#FD6F8E]', 'bg-[#53B1FD]', 'bg-[#9B8AFB]'];

const COLORS = ['#FD6F8E', '#6CDEA0', '#F670C7', '#FD853A', '#53B1FD', '#9B8AFB'];

const COLOR_CLASSES = [
  'bg-[#FD6F8E]',
  'bg-[#6CDEA0]',
  'bg-[#F670C7]',
  'bg-[#FD853A]',
  'bg-[#53B1FD]',
  'bg-[#9B8AFB]',
];

const BalanceSheetList: React.FC<BalanceSheetListProps> = ({
  selectedDateRange,
  isPrinting, // Info: (20241122 - Anna) 使用打印狀態
  printRef, // Info: (20241122 - Anna) 使用打印範圍 Ref
  printFn, // Info: (20241122 - Anna) 使用打印函數
}) => {
  const { t } = useTranslation(['report_401']);
  // const { exportVoucherModalVisibilityHandler } = useGlobalCtx();

  // 🌟 新增狀態來追蹤是否正在下載 PDF
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    const element = document.getElementById('download-content');
    if (element) {
      try {
        setIsDownloadingPDF(true); // 🌟 開始下載時，顯示內容

        // 動態載入 html2pdf.js
        const html2pdf = (await import('html2pdf.js')).default;

        const options: Html2PdfOptions = {
          margin: 0,
          filename: 'example.pdf',
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        };

        // 🌟 確保 printRef.current 不是 null
        html2pdf()
          .set(options)
          .from(printRef.current as HTMLElement) // 🌟 確保使用的是正確的節點
          .save();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error loading html2pdf.js:', error);
      } finally {
        setIsDownloadingPDF(false); // 🌟 完成下載後，隱藏內容
      }
    } else {
      // eslint-disable-next-line no-console
      console.error('Element not found for PDF generation');
    }
  };

  // Info: (20241121 - Anna) 新增 Ref 來捕獲列印區塊的 DOM
  // const printRef = useRef<HTMLDivElement>(null);

  // Info: (20241112 - Anna) 添加狀態來控制打印模式(加頁首頁尾、a4大小)
  // const [isPrinting, setIsPrinting] = useState(false);

  // const handlePrint = () => {
  //   // setIsPrinting(true); // Info: (20241118 - Anna) 開啟列印模式
  //   // setTimeout(() => {
  //   //   window.print(); // Info: (20241118 - Anna) 觸發瀏覽器列印
  //   //   setIsPrinting(false); // Info: (20241118 - Anna) 列印完成後退出列印模式
  //   // }, 500); // Info: (20241118 - Anna) 等待渲染完成後再列印

  //   //  window.print(); // Info: (20241118 - Anna) 預覽PDF

  //   setIsPrinting(true); // Info: (20241118 - Anna) 啟動列印模式 不會預覽PDF
  // };
  // const handlePrint = async () => {
  //   setIsPrinting(true); // 啟用列印模式

  //   const waitForRender = () => {
  //     return new Promise<void>((resolve) => {
  //       const observer = new MutationObserver(() => {
  //         const allPagesRendered = document.querySelectorAll('.print-content').length > 0;
  //         if (allPagesRendered) {
  //           observer.disconnect();
  //           resolve();
  //         }
  //       });

  //       observer.observe(document.body, { childList: true, subtree: true });

  //       // 超時保證流程不會卡死
  //       setTimeout(() => {
  //         observer.disconnect();
  //         resolve();
  //       }, 5000);
  //     });
  //   };

  //   await waitForRender();
  //   window.print(); // 觸發列印
  //   setIsPrinting(false); // 退出列印模式
  // };
  // const handlePrint = () => {
  //   setIsPrinting(true); // 啟用列印模式
  //   setTimeout(() => {
  //     window.print(); // 直接使用瀏覽器列印功能
  //     setIsPrinting(false); // 列印完成後退出列印模式
  //   }, 500); // 等待 500ms 確保渲染完成
  // };

  // const handlePrint = useReactToPrint({
  //   content: () => printRef.current as HTMLElement,
  //   documentTitle: 'Balance Sheet Report',
  //   onBeforePrint: async () => {
  //     // eslint-disable-next-line no-console
  //     console.log('Before Print: isPrinting =', isPrinting);
  //     return Promise.resolve();
  //   },
  //   onAfterPrint: async () => {
  //     setIsPrinting(false);
  //     // eslint-disable-next-line no-console
  //     console.log('After Print: isPrinting =', isPrinting);
  //     return Promise.resolve();
  //   },
  // } as unknown as Parameters<typeof useReactToPrint>[0]);

  // const handlePrint = useReactToPrint({
  //   printRef,
  // } as unknown as Parameters<typeof useReactToPrint>[0]);

  // const handlePrintClick = () => {
  //   setIsPrinting(true); // 啟用列印模式
  //   handlePrint(); // 呼叫列印
  // };

  // const handleOnAfterPrint = React.useCallback(() => {
  //   // eslint-disable-next-line no-console
  //   console.log('onAfterPrint call ');
  // }, []);

  // const handleOnBeforePrint = React.useCallback(() => {
  //   // eslint-disable-next-line no-console
  //   console.log('onBeforePrint call ');
  //   return Promise.resolve();
  // }, []);

  // const printFn = useReactToPrint({
  //   contentRef: printRef,
  //   documentTitle: 'alance Sheet Report',
  //   onAfterPrint: handleOnAfterPrint,
  //   onBeforePrint: handleOnBeforePrint,
  // });

  // const handleOnClick = React.useCallback(() => {
  //   printFn();
  // }, [printFn]);

  // Info: (20241023 - Anna) 追蹤是否已經成功請求過一次 API
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  // Info: (20241023 - Anna) 使用 useRef 追蹤之前的日期範圍
  const prevSelectedDateRange = useRef<IDatePeriod | null>(null);

  const { isAuthLoading, selectedCompany } = useUserCtx();
  const hasCompanyId = isAuthLoading === false && !!selectedCompany?.id;

  const [totalSubAccountsToggle, setTotalSubAccountsToggle] = useState(false); // Info: (20241029 - Anna) 新增 totalSubAccountsToggle 狀態

  // Info: (20241029 - Anna) 切換 totalSubAccountsToggle 的開關狀態
  const totalSubAccountsToggleHandler = () => {
    setTotalSubAccountsToggle((prevState) => !prevState);
  };

  const [curAssetLiabilityRatio, setCurAssetLiabilityRatio] = useStateRef<Array<number>>([]);
  const [preAssetLiabilityRatio, setPreAssetLiabilityRatio] = useStateRef<Array<number>>([]);
  const [curAssetLiabilityRatioLabels, setCurAssetLiabilityRatioLabels] = useStateRef<
    Array<string>
  >([]);
  const [preAssetLiabilityRatioLabels, setPreAssetLiabilityRatioLabels] = useStateRef<
    Array<string>
  >([]);

  const [curAssetMixRatio, setCurAssetMixRatio] = useStateRef<Array<number>>([]);
  const [preAssetMixRatio, setPreAssetMixRatio] = useStateRef<Array<number>>([]);
  const [curAssetMixLabels, setCurAssetMixLabels] = useStateRef<Array<string>>([]);
  const [preAssetMixLabels, setPreAssetMixLabels] = useStateRef<Array<string>>([]);

  const [curDate, setCurDate] = useStateRef<string>('');
  const [curYear, setCurYear] = useStateRef<string>('');
  const [preDate, setPreDate] = useStateRef<string>('');
  const [preYear, setPreYear] = useStateRef<string>('');

  const {
    data: reportFinancial,
    code: getReportFinancialCode,
    success: getReportFinancialSuccess,
    isLoading: getReportFinancialIsLoading,
    trigger,
  } = APIHandler<BalanceSheetReport>(APIName.REPORT_GET_V2);

  // Info: (20241023 - Anna) 將 getBalanceSheetReport 包裝為 useCallback 並加入 setSelectedDateRange 作為依賴項
  // Info: (20241023 - Anna) 檢查selectedDateRange存在，避免無效API請求
  const getBalanceSheetReport = useCallback(async () => {
    if (!hasCompanyId || !selectedDateRange || selectedDateRange.endTimeStamp === 0) {
      return;
    }

    // Info: (20241023 - Anna) 如果日期範圍與上次相同，且已經成功請求過，則跳過 API 請求
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
          startDate: selectedDateRange.startTimeStamp,
          endDate: selectedDateRange.endTimeStamp,
          language: 'en',
          reportType: FinancialReportTypesKey.balance_sheet,
        },
      });

      if (response.success) {
        // Info: (20241023 - Anna) 設定已成功請求過 API
        setHasFetchedOnce(true);
        prevSelectedDateRange.current = selectedDateRange;
      }
    } catch (error) {
      (() => {})(); // Info: (20241023 - Anna) Empty function, does nothing
    } finally {
      (() => {})(); // Info: (20241023 - Anna) Empty function, does nothing
    }
  }, [hasCompanyId, selectedCompany?.id, selectedDateRange, trigger]);

  // Info: (20241023 - Anna) 在 useEffect 中依賴 getBalanceSheetReport，當日期範圍變更時觸發 API 請求
  useEffect(() => {
    // if (!selectedDateRange) return; // Info: (20241023 - Anna) 如果尚未選擇日期區間，不觸發請求
    if (!selectedDateRange || selectedDateRange.startTimeStamp === 0) return; // Info: (20241121 - Anna) 新增檢查
    getBalanceSheetReport();
    // }, [getBalanceSheetReport, selectedDateRange]); // Info: (20241121 - Anna) 直接依賴 getBalanceSheetReport
  }, [selectedDateRange, getBalanceSheetReport]); // Info: (20241121 - Anna) 簡化依賴

  const isNoDataForCurALR = curAssetLiabilityRatio.every((value) => value === 0);
  const isNoDataForPreALR = preAssetLiabilityRatio.every((value) => value === 0);

  // Info: (20241001 - Anna) 管理表格摺疊狀態(項目彙總格式)
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  // Info: (20241001 - Anna) 管理表格摺疊狀態(細項分類格式)
  const [isDetailCollapsed, setIsDetailCollapsed] = useState(false);
  // Info: (20241017 - Anna) 管理表格摺疊狀態(某個項目的展開組成科目)
  const [isSubAccountsCollapsed, setIsSubAccountsCollapsed] = useState<{ [key: string]: boolean }>(
    {}
  );

  // Info: (20241001 - Anna) 切換摺疊狀態(項目彙總格式)
  const toggleSummaryTable = () => {
    setIsSummaryCollapsed(!isSummaryCollapsed);
  };
  // Info: (20241001 - Anna) 切換摺疊狀態(細項分類格式)
  const toggleDetailTable = () => {
    setIsDetailCollapsed(!isDetailCollapsed);
  };
  // Info: (20241017 - Anna) 切換摺疊狀態(某個項目的展開組成科目)
  const toggleSubAccounts = (code: string) => {
    setIsSubAccountsCollapsed((prevState) => ({
      ...prevState,
      [code]: !prevState[code],
    }));
  };

  useEffect(() => {
    if (getReportFinancialSuccess === true && reportFinancial && reportFinancial?.otherInfo) {
      const currentDateString = timestampToString(reportFinancial.curDate.to ?? 0);
      const previousDateString = timestampToString(reportFinancial.preDate.to ?? 0);
      const currentYear = currentDateString.year;
      const previousYear = previousDateString.year;

      const curALR = reportFinancial.otherInfo.assetLiabilityRatio[currentDateString.date]
        ?.data || [0, 0, 0];
      const preALR = reportFinancial.otherInfo.assetLiabilityRatio[previousDateString.date]
        ?.data || [0, 0, 0];
      const curALRLabels = reportFinancial.otherInfo.assetLiabilityRatio[currentDateString.date]
        ?.labels || ['', '', ''];
      const preALRLabels = reportFinancial.otherInfo.assetLiabilityRatio[previousDateString.date]
        ?.labels || ['', '', ''];

      const curAMR = reportFinancial.otherInfo.assetMixRatio[currentDateString.date]?.data || [
        0, 0, 0, 0, 0, 0,
      ];
      const curAMRLabels = reportFinancial.otherInfo.assetMixRatio[currentDateString.date]
        ?.labels || ['', '', '', '', '', '其他'];
      const preAMR = reportFinancial.otherInfo.assetMixRatio[previousDateString.date]?.data || [
        0, 0, 0, 0, 0, 0,
      ];
      const preAMRLabels = reportFinancial.otherInfo.assetMixRatio[previousDateString.date]
        ?.labels || ['', '', '', '', '', '其他'];

      setCurAssetLiabilityRatio(curALR);
      setPreAssetLiabilityRatio(preALR);
      setCurAssetLiabilityRatioLabels(curALRLabels);
      setPreAssetLiabilityRatioLabels(preALRLabels);

      setCurAssetMixRatio(curAMR);
      setPreAssetMixRatio(preAMR);
      setCurAssetMixLabels(curAMRLabels);
      setPreAssetMixLabels(preAMRLabels);

      setCurDate(currentDateString.date);
      setPreDate(previousDateString.date);
      setCurYear(currentYear);
      setPreYear(previousYear);
    }
  }, [reportFinancial]);

  useEffect(() => {
    if (reportFinancial && reportFinancial.details) {
      const initialCollapseState: { [key: string]: boolean } = reportFinancial.details.reduce(
        (acc, item) => {
          // acc[item.code] = true; // Info: (20241017 - Anna) 預設每個項目的展開狀態為摺疊
          acc[item.code] = !totalSubAccountsToggle; // Info: (20241029 - Anna) 根據 totalSubAccountsToggle 設定初始展開狀態
          return acc;
        },
        {} as { [key: string]: boolean }
      );
      setIsSubAccountsCollapsed(initialCollapseState);
    }
  }, [reportFinancial, totalSubAccountsToggle]); // Info: (20241029 - Anna) 新增 totalSubAccountsToggle 作為依賴項

  // useEffect(() => {
  //   // Info: (20241112 - Anna) 列印之前啟動列印模式
  //   const handleBeforePrint = () => setIsPrinting(true);
  //   // Info: (20241112 - Anna) 列印之後退出列印模式
  //   const handleAfterPrint = () => setIsPrinting(false);

  //   window.addEventListener('beforeprint', handleBeforePrint);
  //   window.addEventListener('afterprint', handleAfterPrint);

  //   // Info: (20241112 - Anna) 清除事件監聽器
  //   return () => {
  //     window.removeEventListener('beforeprint', handleBeforePrint);
  //     window.removeEventListener('afterprint', handleAfterPrint);
  //   };
  // }, []);

  // useEffect(() => {
  //   if (isPrinting) {
  //     const observer = new MutationObserver(() => {
  //       // Info: (20241118 - Anna) 檢查所有需要的 ID 是否渲染完成
  //       const requiredIds = ['#1', '#2', '#3', '#4', '#5'];
  //       const allRendered = requiredIds.every((id) => document.querySelector(id));

  //       if (allRendered) {
  //         observer.disconnect(); // Info: (20241118 - Anna) 停止監控
  //         window.print(); // Info: (20241118 - Anna) 所有節點渲染完成後觸發列印
  //        // setIsPrinting(false); // Info: (20241118 - Anna) 列印完成後退出列印模式
  //       }
  //     });

  //     // Info: (20241118 - Anna) 監控目標節點的變化
  //     observer.observe(document.body, {
  //       childList: true,
  //       subtree: true,
  //     });

  //     // Info: (20241118 - Anna) 返回清理函數以移除監控器
  //     return () => {
  //       observer.disconnect(); // Info: (20241118 - Anna) 確保監控器被清理
  //     };
  //   }

  //   // Info: (20241118 - Anna) 如果 `isPrinting` 為假，則返回空清理函數，滿足 ESLint 的要求
  //   return () => {};
  // }, [isPrinting]);

  useEffect(() => {
    if (isPrinting && printRef.current) {
      // Deprecated: (20241130 - Anna) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('balance_sheet_list 觀察 Printing content:', printRef.current.innerHTML);
      // Deprecated: (20241130 - Anna) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('BalanceSheetList received isPrinting?', isPrinting);
    } else {
      // Deprecated: (20241130 - Anna) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('BalanceSheetList printRef is null');
    }
  }, [isPrinting]);

  // Info: (20241122 - Anna) 打印 Ref 的內容
  useEffect(() => {
    if (printRef.current) {
      // Deprecated: (20241130 - Anna) remove eslint-disable
      // eslint-disable-next-line no-console
      // console.log('balance_sheet_list 觀察 Current printRef content:', printRef.current);
      // eslint-disable-next-line no-console
      console.log('balance_sheet_list 觀察 Download content:', printRef.current.innerHTML);
    } else {
      // Deprecated: (20241130 - Anna) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('BalanceSheetList printRef is currently null');
    }
  }, [printRef]);

  // Info: (20241023 - Anna) 顯示圖片或報告資料
  if (!hasFetchedOnce && !getReportFinancialIsLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <Image src="/elements/empty.png" alt="No data image" width={120} height={135} />
        <div>
          <p className="text-neutral-300">{t('report_401:REPORT.NO_DATA_AVAILABLE')}</p>
          <p className="text-neutral-300">{t('report_401:REPORT.PLEASE_SELECT_PERIOD')}</p>
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
    !Object.prototype.hasOwnProperty.call(reportFinancial.otherInfo, 'assetLiabilityRatio') ||
    !Object.prototype.hasOwnProperty.call(reportFinancial.otherInfo, 'assetMixRatio') ||
    !Object.prototype.hasOwnProperty.call(reportFinancial.otherInfo, 'dso') ||
    !Object.prototype.hasOwnProperty.call(reportFinancial.otherInfo, 'inventoryTurnoverDays')
  ) {
    return <div>Error {getReportFinancialCode}</div>;
  }

  const displayedCurALRChart = isNoDataForCurALR ? (
    <div className="ml-20">
      {/* ToDo: (20240911 - Liz) 未來可以改用 CSS 刻，以便拔掉 svg */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="200"
        height="200"
        fill="none"
        viewBox="0 0 200 200"
      >
        <circle cx="100" cy="100" r="100" fill="#D9D9D9"></circle>
        <text x="100" y="105" fill="#fff" fontSize="20" textAnchor="middle">
          {t('reports:REPORTS.NO_DATA')}
        </text>
      </svg>
    </div>
  ) : (
    <div className="ml-10">
      <PieChart data={curAssetLiabilityRatio} />
    </div>
  );

  const displayedPreALRChart = isNoDataForPreALR ? (
    <div className="ml-20">
      {/* ToDo: (20240911 - Liz) 未來可以改用 CSS 刻，以便拔掉 svg */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="200"
        height="200"
        fill="none"
        viewBox="0 0 200 200"
      >
        <circle cx="100" cy="100" r="100" fill="#D9D9D9"></circle>
        <text x="100" y="105" fill="#fff" fontSize="20" textAnchor="middle">
          {t('reports:REPORTS.NO_DATA')}
        </text>
      </svg>
    </div>
  ) : (
    <div className="ml-10">
      <PieChart data={preAssetLiabilityRatio} />
    </div>
  );

  const renderDataRow = (
    label: string,
    curValue: number | undefined,
    preValue: number | undefined
  ) => (
    <tr>
      <td className="border border-stroke-brand-secondary-soft p-10px text-sm">{label}</td>
      <td className="border border-stroke-brand-secondary-soft p-10px text-end text-sm">
        {curValue}
      </td>
      <td className="border border-stroke-brand-secondary-soft p-10px text-end text-sm">
        {preValue}
      </td>
    </tr>
  );

  const rowsForSummary = (items: Array<IAccountReadyForFrontend>) => {
    const rows = items.map((item) => {
      if (!item.code) {
        return (
          <tr key={item.code}>
            <td
              colSpan={6}
              className="border border-stroke-brand-secondary-soft p-10px text-sm font-bold"
            >
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        <tr key={item.code}>
          <td className="border border-stroke-brand-secondary-soft p-10px text-sm">{item.code}</td>
          <td className="border border-stroke-brand-secondary-soft p-10px text-sm">{item.name}</td>
          <td className="border border-stroke-brand-secondary-soft p-10px text-end text-sm">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-stroke-brand-secondary-soft p-10px text-center text-sm">
            {item.curPeriodPercentageString}
          </td>
          <td className="border border-stroke-brand-secondary-soft p-10px text-end text-sm">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-stroke-brand-secondary-soft p-10px text-center text-sm">
            {item.prePeriodPercentageString}
          </td>
        </tr>
      );
    });
    return rows;
  };

  // Info: (20241021 - Anna) 要記得改interface
  const rowsForDetail = (items: Array<IAccountReadyForFrontend>) => {
    const rows = items.map((item) => {
      if (!item.code) {
        return (
          <tr key={item.code}>
            <td
              colSpan={6}
              className="border border-stroke-brand-secondary-soft p-10px text-sm font-bold"
            >
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        <React.Fragment key={item.code}>
          <tr>
            <td className="border border-stroke-brand-secondary-soft p-10px text-sm">
              {item.code}
            </td>
            <td
              className={`flex items-center justify-between ${
                item.children && item.children.length > 0 && !isSubAccountsCollapsed[item.code]
                  ? ''
                  : 'border-b'
              } border-stroke-brand-secondary-soft p-10px text-sm`}
            >
              {item.name}
              {/* Info: (20241021 - Anna) 如果有 children 才顯示 CollapseButton */}
              {item.children && item.children.length > 0 && (
                <CollapseButton
                  className="print:hidden"
                  // Info: (20241017 - Anna) 指定 item 的 code 作為參數
                  onClick={() => toggleSubAccounts(item.code)}
                  // Info: (20241017 - Anna) 依據每個 item 的狀態決定是否展開
                  isCollapsed={isSubAccountsCollapsed[item.code] ?? true}
                  buttonType="orange"
                />
              )}
            </td>
            <td className="border border-stroke-brand-secondary-soft p-10px text-end text-sm">
              {item.curPeriodAmountString}
            </td>
            <td className="border border-stroke-brand-secondary-soft p-10px text-center text-sm">
              {item.curPeriodPercentageString}
            </td>
            <td className="border border-stroke-brand-secondary-soft p-10px text-end text-sm">
              {item.prePeriodAmountString}
            </td>
            <td className="border border-stroke-brand-secondary-soft p-10px text-center text-sm">
              {item.prePeriodPercentageString}
            </td>
          </tr>
          {/* Info: (20241003 - Anna) 如果展開，新增子科目表格 */}
          {!isSubAccountsCollapsed[item.code] &&
            item.children &&
            item.children.length > 0 &&
            item.children.map((child) => (
              <tr key={`sub-accounts-${child.code}`}>
                <td className="border border-stroke-brand-secondary-soft p-10px text-sm"></td>
                <td className="items-center border border-stroke-brand-secondary-soft p-10px text-sm">
                  <div className="flex items-center justify-between">
                    <div className="justify-start">
                      <span>{child.code}</span>
                      <span className="ml-2">{child.name}</span>
                    </div>
                    {/* Info: (20241107 - Anna) 將子項目的會計科目名稱傳遞給
                    BalanceDetailsButton，用於顯示彈出視窗的標題 */}
                    <BalanceDetailsButton
                      accountName={child.name}
                      accountId={child.accountId}
                      className="print:hidden"
                    />
                  </div>
                </td>
                <td className="border border-stroke-brand-secondary-soft p-10px text-end text-sm">
                  {child.curPeriodAmountString}
                </td>
                <td className="border border-stroke-brand-secondary-soft p-10px text-center text-sm">
                  {child.curPeriodPercentageString}
                </td>
                <td className="border border-stroke-brand-secondary-soft p-10px text-end text-sm">
                  {child.prePeriodAmountString}
                </td>
                <td className="border border-stroke-brand-secondary-soft p-10px text-center text-sm">
                  {child.prePeriodPercentageString}
                </td>
              </tr>
            ))}
        </React.Fragment>
      );
    });
    return rows;
  };
  // Info: (20241029 - Anna) 子科目 Toggle 開關、列印及下載按鈕
  // const displayedSelectArea = (ref: React.RefObject<HTMLDivElement>) => {
  const displayedSelectArea = () => {
    // Deprecated: (20241130 - Anna) remove eslint-disable
    // eslint-disable-next-line no-console
    console.log('[displayedSelectArea] Display Area Rendered');
    return (
      <div className="mb-16px flex items-center justify-between px-px max-md:flex-wrap print:hidden">
        <div className="flex items-center gap-4">
          <Toggle
            id="totalSubAccounts-toggle"
            initialToggleState={totalSubAccountsToggle}
            getToggledState={totalSubAccountsToggleHandler}
            toggleStateFromParent={totalSubAccountsToggle}
          />
          <span className="text-neutral-600">{t('reports:REPORTS.DISPLAY_SUB_ACCOUNTS')}</span>
        </div>
        <div className="ml-auto flex items-center gap-24px">
          {/* <DownloadButton onClick={exportVoucherModalVisibilityHandler} disabled={false} /> */}
          <DownloadButton onClick={handleDownloadPDF} disabled={false} />
          <PrintButton onClick={printFn} disabled={false} />
        </div>
      </div>
    );
  };

  const ItemSummary = (
    <div id="1" className="relative overflow-y-hidden">
      {/* Info: (20240723 - Shirley) watermark logo */}
      <div className="relative right-0 top-16 z-0">
        <Image
          className="absolute right-0 top-0"
          src="/logo/watermark_logo.svg"
          alt="isunfa logo"
          width={400}
          height={300}
        />
      </div>

      <section className="mx-1 text-text-neutral-secondary">
        <div className="relative z-1 mb-16px flex justify-between font-semibold text-surface-brand-secondary">
          <div className="flex items-center">
            <p>項目彙總格式</p>
            <CollapseButton
              onClick={toggleSummaryTable}
              isCollapsed={isSummaryCollapsed}
              buttonType="default"
            />
          </div>
          <p>單位：新台幣元</p>
        </div>
        {!isSummaryCollapsed && (
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
                  {curDate}
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold">
                  %
                </th>
                <th className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                  {preDate}
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {reportFinancial &&
                reportFinancial.general &&
                Object.prototype.hasOwnProperty.call(reportFinancial, 'general') &&
                rowsForSummary(reportFinancial.general)}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
  const ItemDetail = (
    <div id="2" className={`relative overflow-y-hidden print:break-before-page`}>
      <section className="mx-1 text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <div className="flex items-center">
            <p className="font-bold leading-5">細項分類格式</p>
            <CollapseButton onClick={toggleDetailTable} isCollapsed={isDetailCollapsed} />
          </div>
          <p className="font-bold leading-5">單位：新台幣元</p>
        </div>
        {!isDetailCollapsed && (
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                  代號
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                  會計項目
                </th>
                <th className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                  {curDate}
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold">
                  %
                </th>
                <th className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                  {preDate}
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {reportFinancial &&
                reportFinancial.general &&
                Object.prototype.hasOwnProperty.call(reportFinancial, 'general') &&
                rowsForDetail(reportFinancial.details)}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
  const ProportionalTable = (
    <div id="3" className={`relative overflow-y-hidden print:break-before-page`}>
      <section className="mx-1 text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>資產負債比例表</p>
        </div>
        <div className="mx-3 flex flex-col space-y-10">
          <div className="flex flex-col space-y-0">
            <p className="text-xs font-semibold text-text-brand-secondary-lv2">{curDate}</p>
            <div className="flex items-center">
              <ul className="space-y-2">
                {curAssetLiabilityRatioLabels.map((label, index) => (
                  <li key={label} className="flex items-center">
                    <span
                      className={`mr-2 inline-block h-2 w-2 rounded-full text-xs ${ASSETS_LIABILITIES_EQUITY_COLOR[index % ASSETS_LIABILITIES_EQUITY_COLOR.length]}`}
                    ></span>
                    <span className="w-200px">{label}</span>
                  </li>
                ))}
              </ul>
              {displayedCurALRChart}{' '}
            </div>
          </div>
          <div className="flex flex-col space-y-0">
            <p className="text-xs font-semibold text-text-brand-secondary-lv2">{preDate}</p>
            <div className="flex items-center">
              <ul className="space-y-2">
                {preAssetLiabilityRatioLabels.map((label, index) => (
                  <li key={label} className="flex items-center">
                    <span
                      className={`mr-2 inline-block h-2 w-2 rounded-full text-xs ${ASSETS_LIABILITIES_EQUITY_COLOR[index % ASSETS_LIABILITIES_EQUITY_COLOR.length]}`}
                    ></span>
                    <span className="w-200px">{label}</span>
                  </li>
                ))}
              </ul>
              {displayedPreALRChart}{' '}
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
    </div>
  );
  const AssetItem = (
    <div id="4" className={`relative overflow-y-hidden print:break-before-page`}>
      <section className="mx-1 text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>資產分布圖</p>
        </div>
        <div className="mx-3 flex flex-col space-y-10">
          <div className="flex flex-col space-y-5">
            <p className="text-xs font-semibold text-text-brand-secondary-lv2">{curDate}</p>
            <div className="flex items-center justify-between">
              <ul className="space-y-2">
                {curAssetMixLabels.map((label, index) => (
                  <li key={label} className="flex items-center">
                    <span
                      className={`mr-2 inline-block h-2 w-2 rounded-full ${COLOR_CLASSES[index % COLOR_CLASSES.length]}`}
                    ></span>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
              <div className="relative" style={{ marginTop: '-20px' }}>
                <PieChartAssets
                  data={curAssetMixRatio}
                  labels={curAssetMixLabels}
                  colors={COLORS}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-5">
            <p className="text-xs font-semibold text-text-brand-secondary-lv2">{preDate}</p>
            <div className="flex items-center justify-between">
              <ul className="space-y-2">
                {preAssetMixLabels.map((label, index) => (
                  <li key={label} className="flex items-center">
                    <span
                      className={`mr-2 inline-block h-2 w-2 rounded-full ${COLOR_CLASSES[index % COLOR_CLASSES.length]}`}
                    ></span>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
              <div className="relative" style={{ marginTop: '-20px' }}>
                {' '}
                <PieChartAssets
                  data={preAssetMixRatio}
                  labels={preAssetMixLabels}
                  colors={COLORS}
                />
              </div>
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
    </div>
  );
  const TurnoverDay = (
    <div id="5" className={`relative overflow-y-hidden print:break-before-page`}>
      <section className="mx-1 text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>應收帳款週轉天數</p>
          <p>單位：天</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-300px border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold"></th>
              <th className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                {curYear}年度
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                {preYear}年度
              </th>
            </tr>
          </thead>
          <tbody>
            {renderDataRow(
              '應收帳款週轉天數',
              reportFinancial?.otherInfo?.dso.curDso,
              reportFinancial?.otherInfo?.dso.preDso
            )}
          </tbody>
        </table>
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>存貨週轉天數</p>
          <p>單位：天</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-300px border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold"></th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                {curYear}年度
              </th>
              <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end text-sm font-semibold">
                {preYear}年度
              </th>
            </tr>
          </thead>
          <tbody>
            {renderDataRow(
              '存貨週轉天數',
              reportFinancial?.otherInfo?.inventoryTurnoverDays.curInventoryTurnoverDays,
              reportFinancial?.otherInfo?.inventoryTurnoverDays.preInventoryTurnoverDays
            )}
          </tbody>
        </table>
        <div className="relative top-28rem -z-10">
          <Image
            className="absolute bottom-0 right-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>
      </section>
    </div>
  );

  // Info: (20241118 - Anna) 如果正在列印，僅渲染列印模式的內容
  // if (isPrinting) {
  //   // eslint-disable-next-line no-console
  //   console.log('printRef', printRef);
  //   return (
  //     <div ref={printRef} className="mx-auto w-full origin-top overflow-x-auto print:block">
  //       <BalanceSheetA4Template
  //         reportFinancial={reportFinancial}
  //         curDate={curDate}
  //         preDate={preDate}
  //       >
  //         {ItemSummary}
  //         {ItemDetail}
  //         {ProportionalTable}
  //         {AssetItem}
  //         {TurnoverDay}
  //       </BalanceSheetA4Template>
  //     </div>
  //   );
  // }

  // return (
  //   <div className="mx-auto w-full origin-top overflow-x-auto">
  //     {displayedSelectArea(printRef)}
  //     {ItemSummary}
  //     <hr className="break-before-page" />
  //     {ItemDetail}
  //     <hr className="break-before-page" />
  //     {ProportionalTable}
  //     <hr className="mb-16px mt-32px break-before-page" />
  //     {AssetItem}
  //     <hr className="break-before-page" />
  //     {TurnoverDay}
  //   </div>
  // );

  return (
    <div className={`relative mx-auto w-full origin-top overflow-x-auto`}>
      {displayedSelectArea()}
      {/* Info: (20241125 - Tzuhan) 渲染打印模板，通過 CSS 隱藏 */}
      {/* <div ref={printRef} id="download-content" className="hidden print:block"> */}
      <div
        ref={printRef}
        id="download-content"
        className={`${isDownloadingPDF ? 'block' : 'hidden print:block'}`} // 🌟 同時支持下載和列印功能
      >
        <BalanceSheetA4Template
          reportFinancial={reportFinancial}
          curDate={curDate}
          preDate={preDate}
        >
          {ItemSummary}
          {ItemDetail}
          {ProportionalTable}
          {AssetItem}
          {TurnoverDay}
        </BalanceSheetA4Template>
      </div>
      {/*  Info: (20241125 - Tzuhan) 預覽區域 */}
      <div className="block print:hidden">
        {ItemSummary}
        <hr className="break-before-page" />
        {ItemDetail}
        <hr className="break-before-page" />
        {ProportionalTable}
        <hr className="mb-16px mt-32px break-before-page" />
        {AssetItem}
        <hr className="break-before-page" />
        {TurnoverDay}
      </div>
    </div>
  );
};

export default BalanceSheetList;
