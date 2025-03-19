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
// import { useGlobalCtx } from '@/contexts/global_context';
import PrintPreview from '@/components/income_statement_report_body/print_preview';
import DownloadPreview from '@/components/income_statement_report_body/download_preview';
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

interface FilterBarProps {
  printFn: () => void;
  isChinese: boolean; // Info: (20250108 - Anna) 添加 isChinese 屬性
  handleDownload: () => void; // Info: (20250108 - Anna) handleDownload
}
const FilterBar = ({ printFn, isChinese, handleDownload }: FilterBarProps) => {
  // const { exportVoucherModalVisibilityHandler } = useGlobalCtx();
  return (
    <div className="mb-16px flex items-center justify-between px-px max-md:flex-wrap print:hidden">
      <div className="ml-auto flex items-center gap-24px">
        <DownloadButton onClick={handleDownload} />
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
  const { isAuthLoading, selectedAccountBook } = useUserCtx();
  const hasCompanyId = isAuthLoading === false && !!selectedAccountBook?.id;
  const [isGetReportAPILoading, setIsGetReportAPILoading] = useState<boolean>(false);
  const [isGetReportAPISuccess, setIsGetReportAPISuccess] = useState<boolean>(false);
  const [reportAPICode, setReportAPICode] = useState<string>('');
  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
  const { trigger: getReportAPI } = APIHandler<FinancialReport>(APIName.REPORT_GET_V2);

  // Info: (20250108 - Anna) 判斷當前語言是否為繁體或簡體中文
  const { i18n } = useTranslation('reports');
  const isChinese = i18n.language === 'tw' || i18n.language === 'cn';

  const printRef = useRef<HTMLDivElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  const printFn = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Income_Statement Report',
  });

  // Info: (20250317 - Anna) handleDownload
  const handleDownload = async () => {
    if (!downloadRef.current) {
      // eslint-disable-next-line no-console
      console.error('Print reference is null!');
      return;
    }

    // Info: (20250317 - Anna) 讓 downloadRef 可見，移到畫面外不影響 UI
    downloadRef.current.classList.remove('hidden');
    downloadRef.current.style.position = 'absolute';
    downloadRef.current.style.left = '-9999px';

    // Info: (20250317 - Anna) 確保 DOM 渲染完成
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });

    // Info: (20250317 - Anna) 選取所有要下載的區塊
    const downloadPages = downloadRef.current.querySelectorAll('.download-page');
    if (downloadPages.length === 0) {
      // eslint-disable-next-line no-console
      console.error('No .download-page elements found!');
      return;
    }

    // Info: (20250317 - Anna) 確保所有圖片載入完成
    const images = Array.from(downloadRef.current.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete) {
              resolve(true);
            } else {
              img.addEventListener('load', () => resolve(true), { once: true });
            }
          })
      )
    );

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    await document.fonts.ready; // Info: (20250317 - Anna) 確保字體載入完成

    // Info: (20250317 - Anna) 逐一擷取 .download-page 並添加到 PDF
    const canvasPromises = Array.from(downloadPages, async (page, index) => {
      const canvas = await html2canvas(page as HTMLElement, {
        scale: 2, // 提高解析度
        useCORS: true,
        logging: true,
      });

      const imgData = canvas.toDataURL('image/png');

      if (index === 0) {
        pdf.addImage(imgData, 'PNG', 10, 10, 190, 270);
      } else {
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, 10, 190, 270);
      }

      return imgData;
    });

    await Promise.all(canvasPromises);

    // Info: (20250317 - Anna) 確保下載後 `downloadRef` 不影響 UI
    downloadRef.current.classList.add('hidden');
    downloadRef.current.style.position = '';
    downloadRef.current.style.left = '';

    // 下載 PDF
    pdf.save('Income_Statement_Report.pdf');
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
            companyId: selectedAccountBook?.id,
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
  }, [hasCompanyId, selectedAccountBook?.id, selectedDateRange]);

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

  return (
    <div className={`relative mx-auto w-full origin-top overflow-x-auto`}>
      {/* Info: (20250108 - Anna) 傳遞 isChinese 給 FilterBar */}
      <FilterBar printFn={printFn} isChinese={isChinese} handleDownload={handleDownload} />
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
      <div>
        <DownloadPreview
          ref={downloadRef}
          // className="absolute top-0"
          // style={{ left: '-9999px' }}
          financialReport={financialReport}
          formattedCurFromDate={formattedCurFromDate}
          formattedCurToDate={formattedCurToDate}
          formattedPreFromDate={formattedPreFromDate}
          formattedPreToDate={formattedPreToDate}
        />
      </div>
    </div>
  );
};

export default IncomeStatementList;
