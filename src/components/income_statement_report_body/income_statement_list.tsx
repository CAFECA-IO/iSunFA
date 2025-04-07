import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { FinancialReport } from '@/interfaces/report';
import APIHandler from '@/lib/utils/api_handler';
import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { FinancialReportTypesKey } from '@/interfaces/report_type';
import { IDatePeriod } from '@/interfaces/date_period';
import PrintButton from '@/components/button/print_button';
import DownloadButton from '@/components/button/download_button';
import PrintPreview from '@/components/income_statement_report_body/print_preview';
import { useReactToPrint } from 'react-to-print';
import NoData from '@/components/income_statement_report_body/no_data';
import Loading from '@/components/income_statement_report_body/loading';
import ItemSummary from '@/components/income_statement_report_body/item_summary';
// Todo: (20250115 - Anna) 目前 ItemSummary 資訊已足夠，暫時不需要 ItemDetail
// import ItemDetail from '@/components/income_statement_report_body/item_detail';
import CostRevRatio from '@/components/income_statement_report_body/cost_rev_ratio';
import { useTranslation } from 'next-i18next';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import DownloadPreview from '@/components/income_statement_report_body/download_preview';

interface FilterBarProps {
  printFn: () => void;
  downloadFn: () => void; // Info: (20250328 - Anna)
  isChinese: boolean; // Info: (20250108 - Anna) 添加 isChinese 屬性
}
const FilterBar = ({ printFn, isChinese, downloadFn }: FilterBarProps) => {
  // eslint-disable-next-line no-console
  console.log('🧩 FilterBar 收到的 downloadFn:', downloadFn);
  return (
    <div className="mb-16px flex items-center justify-between px-px max-md:flex-wrap print:hidden">
      <div className="ml-auto flex items-center gap-24px">
        {/* Info: (20250328 - Anna) */}
        <DownloadButton onClick={downloadFn} />
        <PrintButton onClick={() => printFn()} disabled={!isChinese} />
      </div>
    </div>
  );
};

interface IncomeStatementListProps {
  selectedDateRange: IDatePeriod | null;
}
const IncomeStatementList = ({ selectedDateRange }: IncomeStatementListProps) => {
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const prevSelectedDateRange = useRef<IDatePeriod | null>(null);
  const { isAuthLoading, connectedAccountBook } = useUserCtx();
  const hasCompanyId = isAuthLoading === false && !!connectedAccountBook?.id;
  const [isGetReportAPILoading, setIsGetReportAPILoading] = useState<boolean>(false);
  const [isGetReportAPISuccess, setIsGetReportAPISuccess] = useState<boolean>(false);
  const [reportAPICode, setReportAPICode] = useState<string>('');
  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
  const { trigger: getReportAPI } = APIHandler<FinancialReport>(APIName.REPORT_GET_V2);

  // Info: (20250108 - Anna) 判斷當前語言是否為繁體或簡體中文
  const { i18n } = useTranslation('reports');
  const isChinese = i18n.language === 'tw' || i18n.language === 'cn';

  const printRef = useRef<HTMLDivElement>(null);
  // Info: (20250328 - Anna)
  const downloadRef = useRef<HTMLDivElement>(null);

  // Info: (20250328 - Anna)
  const filename = `Income_Statement.pdf`;

  const printFn = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Income_Statement',
  });

  const handleDownload = async () => {
    // eslint-disable-next-line no-console
    console.log('🔥 handleDownload 被呼叫了');
    // pageCountRef.current = 1; // // Info: (20250327 - Anna) reset 頁數

    if (!downloadRef.current) {
      // eslint-disable-next-line no-console
      console.error('❌ downloadRef is null');
      return;
    }

    // eslint-disable-next-line no-console
    console.log('🕵️‍♀️ downloadRef.current:', downloadRef.current);
    // eslint-disable-next-line no-console
    console.log(
      '🧱 downloadRef.current.innerHTML (preview):',
      downloadRef.current?.innerHTML.slice(0, 300)
    );

    //  Info: (20250401 - Anna) 插入修正樣式
    const style = document.createElement('style');
    style.innerHTML = `
  /* Info: (20250401 - Anna) 表格 */
  .download-page td,
  .download-page th {
    padding-top: 0 !important;
  }


  /* Info: (20250401 - Anna) Income Statement (header) 調整底部間距 */
  .download-page h2 {
    padding-bottom: 6px !important;
  }

  /* Info: (20250401 - Anna) 大標題與表格間距 */
  .download-page .download-header-label {
    padding-bottom: 8px !important;
  }
`;

    document.head.appendChild(style);

    //  Info: (20250327 - Anna) 顯示下載內容讓 html2canvas 擷取，移到畫面外避免干擾
    downloadRef.current.classList.remove('hidden');
    downloadRef.current.style.position = 'absolute';
    downloadRef.current.style.left = '-9999px';

    // Info: (20250327 - Anna) 強制瀏覽器執行「重新排版 (reflow)」，預防 classList.remove('hidden') 還沒生效導致 html2canvas 擷取不到內容
    downloadRef.current?.getBoundingClientRect();

    // Info: (20250327 - Anna) 等所有圖片載入，確保 html2canvas 可以擷取圖片內容
    const images = Array.from(downloadRef.current.querySelectorAll('img'));
    await Promise.all(
      images.map((imgElement) => {
        const img = imgElement; // Info: (20250327 - Anna)新變數，避免直接操作參數
        return new Promise((resolve) => {
          if (img.complete) {
            resolve(true); // Info: (20250327 - Anna) 圖片已完成載入流程（無論成功或失敗），立即 resolve
          } else {
            img.onload = () => resolve(true); // Info: (20250327 - Anna) 尚未載入完成，監聽 onload 成功事件
            img.onerror = () => resolve(true); // Info: (20250327 - Anna) 尚未載入完成，監聽 onerror 失敗事件，依然 resolve 避免卡住
          }
        });
      })
    );

    // Info: (20250327 - Anna) 等待所有字體（包含系統字體）完成解析與載入。
    await document.fonts.ready;

    // Info: (20250327 - Anna) 雙重 requestAnimationFrame：等待兩次繪製週期，確保樣式與 DOM 完整渲染，避免 html2canvas 抓到第一頁空白
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    // Info: (20250327 - Anna) 額外延遲（150ms）確保樣式穩定下來
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      });

    await wait(150);

    const downloadPages = downloadRef.current.querySelectorAll('.download-page');
    // eslint-disable-next-line no-console
    console.log('📄 抓到 downloadPages 數量:', downloadPages.length); // 🌟
    if (!downloadPages.length) {
      // eslint-disable-next-line no-console
      console.error('❌ 沒有抓到 .download-page 元素');
      return;
    }

    // Info: (20250327 - Anna) jsPDF 是類別，但命名為小寫，需關閉 eslint new-cap
    // eslint-disable-next-line new-cap
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    // Info: (20250327 - Anna) 把 div 用 html2canvas 轉成圖片
    for (let i = 0; i < downloadPages.length; i += 1) {
      const page = downloadPages[i];
      // Info: (20250327 - Anna) 為了逐頁轉圖並依序加入 PDF，需保留 await；略過 ESLint 提示
      // eslint-disable-next-line no-await-in-loop
      const canvas = await html2canvas(page as HTMLElement, {
        scale: 2,
        useCORS: true,
        logging: true, // Info: (20250327 - Anna) 「顯示除錯訊息」到 console
      }).catch((err) => {
        // eslint-disable-next-line no-console
        console.error('❌ html2canvas 擷取錯誤:', err);
        return null;
      });

      if (!canvas) {
        // eslint-disable-next-line no-console
        console.error(`❌ 第 ${i + 1} 頁 canvas 是 null，停止下載流程`);
        return;
      }

      // eslint-disable-next-line no-console
      console.log(`🎨 canvas size: ${canvas.width} x ${canvas.height}`);
      // eslint-disable-next-line no-console
      console.log(`🎨 canvas toDataURL size: ${canvas.toDataURL().length}`);

      // Info: (20250327 - Anna) 轉成 PNG 格式
      const imgData = canvas.toDataURL('image/png');

      if (i === 0) {
        // Info: (20250327 - Anna) 放入 PDF
        pdf.addImage(imgData, 'PNG', 10, 10, 190, 270);
      } else {
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, 10, 190, 270);
      }
    }

    // Info: (20250401 - Anna) 移除修正樣式
    style.remove();

    // Info: (20250327 - Anna) 隱藏下載用的內容
    downloadRef.current.classList.add('hidden');
    downloadRef.current.style.position = '';
    downloadRef.current.style.left = '';

    // Info: (20250327 - Anna) 下載 PDF
    // eslint-disable-next-line no-console
    console.log('📥 嘗試呼叫 pdf.save()');
    pdf.save(filename);
    // eslint-disable-next-line no-console
    console.log('✅ pdf.save() 已執行');
  };

  useEffect(() => {
    if (!selectedDateRange) return;

    const getIncomeStatementReport = async () => {
      if (!hasCompanyId || !selectedDateRange || selectedDateRange.endTimeStamp === 0) return;
      if (
        prevSelectedDateRange.current &&
        prevSelectedDateRange.current.startTimeStamp === selectedDateRange.startTimeStamp &&
        prevSelectedDateRange.current.endTimeStamp === selectedDateRange.endTimeStamp
      ) {
        return;
      }
      setIsGetReportAPILoading(true);

      try {
        const { success, data, code } = await getReportAPI({
          params: {
            companyId: connectedAccountBook?.id,
          },
          query: {
            startDate: selectedDateRange.startTimeStamp,
            endDate: selectedDateRange.endTimeStamp,
            language: 'en',
            reportType: FinancialReportTypesKey.comprehensive_income_statement,
          },
        });
        setIsGetReportAPISuccess(success);
        setReportAPICode(code);

        if (success && data) {
          setHasFetchedOnce(true); // Info: (20241024 - Anna) 設定已成功請求過 API
          prevSelectedDateRange.current = selectedDateRange; // Info: (20241024 - Anna) 更新日期範圍
          setFinancialReport(data);
          // Deprecated: (20241204 - Liz)
          // eslint-disable-next-line no-console
          console.log('IncomeStatementList received data:', data);
        }
      } catch (error) {
        // (() => {})(); // Info: (20241024 - Anna) Empty function, does nothing
        // Deprecated: (20241204 - Liz)
        // eslint-disable-next-line no-console
        console.log('Error:', error);
      } finally {
        setIsGetReportAPILoading(false);
      }
    };

    getIncomeStatementReport();
  }, [hasCompanyId, connectedAccountBook?.id, selectedDateRange]);

  if (!hasFetchedOnce && !isGetReportAPILoading) {
    return <NoData />;
  } else if (isGetReportAPILoading) {
    return <Loading />;
  } else if (
    !isGetReportAPISuccess ||
    !financialReport ||
    !Object.prototype.hasOwnProperty.call(financialReport, 'otherInfo') ||
    !financialReport.otherInfo ||
    !Object.prototype.hasOwnProperty.call(financialReport.otherInfo, 'revenueAndExpenseRatio') ||
    !Object.prototype.hasOwnProperty.call(financialReport.otherInfo, 'revenueToRD')
  ) {
    return <div>Error: {reportAPICode}</div>;
  }

  // Info: (20240730 - Anna) 轉換和格式化日期
  const curDateFrom = new Date(financialReport.curDate.from * 1000);
  const curDateTo = new Date(financialReport.curDate.to * 1000);
  const preDateFrom = new Date(financialReport.preDate.from * 1000);
  const preDateTo = new Date(financialReport.preDate.to * 1000);
  const formattedCurFromDate = format(curDateFrom, 'yyyy-MM-dd');
  const formattedCurToDate = format(curDateTo, 'yyyy-MM-dd');
  const formattedPreFromDate = format(preDateFrom, 'yyyy-MM-dd');
  const formattedPreToDate = format(preDateTo, 'yyyy-MM-dd');

  // eslint-disable-next-line no-console
  console.log('📄 downloadRef 即將 render');
  // eslint-disable-next-line no-console
  console.log('📄 financialReport:', financialReport);

  return (
    <div className={`relative mx-auto w-full origin-top overflow-x-auto`}>
      {/* Info: (20250108 - Anna) 傳遞 isChinese 給 FilterBar */}
      {/* Info: (20250328 - Anna) */}
      <FilterBar printFn={printFn} isChinese={isChinese} downloadFn={handleDownload} />
      <div>
        <ItemSummary
          financialReport={financialReport}
          formattedCurFromDate={formattedCurFromDate}
          formattedCurToDate={formattedCurToDate}
          formattedPreFromDate={formattedPreFromDate}
          formattedPreToDate={formattedPreToDate}
        />
        {/* Todo: (20250115 - Anna) 目前 ItemSummary 資訊已足夠，暫時不需要 ItemDetail */}
        {/* <ItemDetail
          financialReport={financialReport}
          formattedCurFromDate={formattedCurFromDate}
          formattedCurToDate={formattedCurToDate}
          formattedPreFromDate={formattedPreFromDate}
          formattedPreToDate={formattedPreToDate}
        /> */}
        <CostRevRatio
          financialReport={financialReport}
          formattedCurFromDate={formattedCurFromDate}
          formattedCurToDate={formattedCurToDate}
          formattedPreFromDate={formattedPreFromDate}
          formattedPreToDate={formattedPreToDate}
        />
      </div>
      <div className="hidden">
        <PrintPreview
          ref={printRef}
          financialReport={financialReport}
          formattedCurFromDate={formattedCurFromDate}
          formattedCurToDate={formattedCurToDate}
          formattedPreFromDate={formattedPreFromDate}
          formattedPreToDate={formattedPreToDate}
        />
      </div>

      <DownloadPreview
        ref={downloadRef}
        className="hidden w-a4-width"
        // style={{ left: '-9999px' }}
        financialReport={financialReport}
        formattedCurFromDate={formattedCurFromDate}
        formattedCurToDate={formattedCurToDate}
        formattedPreFromDate={formattedPreFromDate}
        formattedPreToDate={formattedPreToDate}
      />
    </div>
  );
};

export default IncomeStatementList;
