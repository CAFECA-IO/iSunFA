import React, { useRef } from 'react';
import { BalanceSheetReport } from '@/interfaces/report';
import DownloadButton from '@/components/button/download_button';
import Pdf from 'react-to-pdf';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';

interface DownloadBalanceSheetProps {
  reportFinancial: BalanceSheetReport | null;
}

const DownloadBalanceSheet: React.FC<DownloadBalanceSheetProps> = ({ reportFinancial }) => {
  const { t } = useTranslation(['reports']);

  const reportRef = useRef<HTMLDivElement>(null);

  // Info: (20250314 - Anna) 將時間戳轉換為 YYYY-MM-DD
  const getFormattedDate = (timestamp: number | undefined) => {
    if (!timestamp) return 'Unknown-Date';
    const date = new Date(timestamp * 1000); // Info: (20250314 - Anna) 轉換成毫秒
    return date.toISOString().split('T')[0]; // Info: (20250314 - Anna) 取得 YYYY-MM-DD 格式
  };

  // Info: (20250314 - Anna) 當期結束日 轉換為 YYYY-MM-DD
  const curDateFormatted = getFormattedDate(reportFinancial?.curDate?.to);

  // Info: (20250314 - Anna) 前期結束日 轉換為 YYYY-MM-DD
  //   const preDateFormatted = getFormattedDate(reportFinancial?.preDate?.to);

  // Info: (20250314 - Anna) 取得帳簿名稱
  const AccountBookName = reportFinancial?.company?.name || 'Unknown-Company';

  // Info: (20250314 - Anna) 設定動態檔案名稱
  const filename = `${curDateFormatted}_${AccountBookName}_BalanceSheet.pdf`;

  // Info: (20250314 - Anna) 設定 react-to-pdf 參數
  const pdfOptions = {
    filename,
    page: { format: 'a4' }, // Info: (20250314 - Anna) 確保 HTML 擷取時尺寸正確
    html2canvas: { scale: 2, windowHeight: document.documentElement.scrollHeight }, // Info: (20250314 - Anna) 動態擷取整個 div 的高度
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, // Info: (20250314 - Anna) 確保 PDF 產出時尺寸正確
  };

  // Info: (20250314 - Anna) 下載 PDF 方法
  const handleDownload = async () => {
    if (!reportRef.current) return;

    try {
      const pdf = await Pdf(() => reportRef.current, pdfOptions);
      pdf.save();
    } catch (error) {
      // Info: (20250314 - Anna) Debug
      // eslint-disable-next-line no-console
      console.error('Download failed:', error);
    }
  };

  // Info: (20241112 - Anna) 動態應用分頁樣式
  const printContainerClass =
    'mx-auto w-a4-width origin-top overflow-x-auto print:m-0  print:block  print:h-auto print:w-full print:p-0';
  const printContentClass = 'relative h-a4-height overflow-hidden';
  // Info: (20241111 - Anna) 分割內容為多頁

  // Info: (20241112 - Anna) 將頁眉封裝成函數，並使用 `isFirstPage` 參數區分不同頁面
  const renderedHeader = (isFirstPage: boolean) => {
    return isFirstPage ? (
      <header className="mb-12 flex justify-between pl-14px text-white">
        <div className="w-3/10 bg-surface-brand-secondary pb-14px pl-10px pr-14px pt-40px font-bold">
          <div className="">
            {reportFinancial && reportFinancial.company && (
              <>
                <h1 className="mb-30px text-h6">
                  {reportFinancial.company.code} <br />
                  {reportFinancial.company.name}
                </h1>
                <p className="text-left text-xs font-bold leading-5">
                  {curDateFormatted}
                  <br />
                  財務報告 - 資產負債表
                </p>
              </>
            )}
          </div>
        </div>
        <div className="box-border w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Balance Sheet
            <span className="absolute -bottom-20px right-0 h-5px w-9/12 bg-surface-brand-secondary"></span>
          </h2>
        </div>
        <Image
          className="absolute right-0 top-0 z-0 mt-80px bg-transparent"
          src="/logo/watermark_logo.svg"
          alt="isunfa logo"
          width={400}
          height={300}
        />
      </header>
    ) : (
      // Info: (20241112 - Anna) 渲染除第一頁以外的頁眉結構
      <header className="mb-25px flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Balance Sheet
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
    );
  };

  const renderedFooter = (page: number) => (
    <footer className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between bg-surface-brand-secondary p-10px">
      <p className="text-xs text-white">{page}</p>
      <div className="text-base font-bold text-surface-brand-secondary">
        <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
      </div>
    </footer>
  );

  if (!reportFinancial) {
    return <p>Loading...</p>;
  }

  return (
    <>
      <DownloadButton onClick={handleDownload} />

      <div ref={reportRef} className="bg-white p-4 pb-10">
        {/* Info: (20241120 - Anna) 渲染第一塊分頁 */}
        <div
          key={`first-block-page-`}
          className={printContainerClass}
          // style={{ pageBreakBefore: index === 0 ? 'auto' : 'always', pageBreakAfter: 'always' }}
          style={{
            pageBreakBefore: 'auto',
            pageBreakAfter: 'auto',
          }}
        >
          <div
            id={`first-block-page-`}
            className={`${printContentClass} relative h-a4-height overflow-y-hidden`}
          >
            {renderedHeader(true)}
            <div className="relative z-10 mx-14px mb-2 flex justify-between text-sm font-bold leading-5 text-surface-brand-secondary">
              <p>{t('reports:REPORTS.ITEM_SUMMARY_FORMAT')}</p>
              <p>{t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}</p>
            </div>
            {renderedFooter(1)}
          </div>
        </div>

        {/* Info: (20241120 - Anna) 渲染第二塊分頁 */}
        <div
          key={`second-block-page-`}
          className={printContainerClass}
          // style={{ pageBreakBefore: 'always', pageBreakAfter: 'always' }}
          style={{
            pageBreakBefore: 'auto',
            pageBreakAfter: 'auto',
          }}
        >
          <div
            id={`second-block-page-`}
            className={`${printContentClass} relative h-a4-height overflow-y-hidden`}
          >
            {renderedHeader(false)}
            <div className="mx-14px mb-2 flex justify-between text-sm font-bold leading-5 text-surface-brand-secondary">
              <p>{t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}</p>
              <p>{t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}</p>
            </div>
            {renderedFooter(2)}
          </div>
        </div>
        {/* Info: (20241120 - Anna) 渲染額外的內容 */}
        <div
          key={`additional-block-page-`}
          className={printContainerClass}
          // style={{ pageBreakBefore: 'always', pageBreakAfter: 'always' }}
          style={{
            pageBreakBefore: 'auto',
            pageBreakAfter: 'auto',
          }}
        >
          <div
            id={`additional-block-page-`}
            className={`${printContentClass} relative h-a4-height overflow-y-hidden`}
          >
            {renderedHeader(false)}
            <div className="px-12px"></div>
            {/* Info: (20241130 - Anna) 渲染 pageContent */}
            {renderedFooter(3)}
          </div>
        </div>
      </div>

      <div className="bg-white p-4 pb-10">
        <h2 className="text-xl font-bold">DownloadBalanceSheet</h2>
        <pre>{JSON.stringify(reportFinancial, null, 2)}</pre>
      </div>
    </>
  );
};

export default DownloadBalanceSheet;
