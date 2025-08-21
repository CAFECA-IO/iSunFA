import React from 'react';
import { CashFlowStatementReport, FinancialReportItem } from '@/interfaces/report';
import { useTranslation } from 'next-i18next';
import { useCurrencyCtx } from '@/contexts/currency_context';
import { DecimalOperations } from '@/lib/utils/decimal_operations';

interface DownloadCashFlowStatementProps {
  reportFinancial: CashFlowStatementReport | null;
  downloadRef: React.RefObject<HTMLDivElement>;
  isDownloading: boolean;
}

const DownloadCashFlowStatement: React.FC<DownloadCashFlowStatementProps> = ({
  reportFinancial,
  downloadRef,
  isDownloading,
}) => {
  const { t } = useTranslation(['reports']);
  const { currency } = useCurrencyCtx();

  // Info: (20250314 - Anna) 將時間戳轉換為 YYYY-MM-DD
  const getFormattedDate = (timestamp: number | undefined) => {
    if (!timestamp) return 'Unknown-Date';
    const date = new Date(timestamp * 1000); // Info: (20250314 - Anna) 轉換成毫秒
    return date.toISOString().split('T')[0]; // Info: (20250314 - Anna) 取得 YYYY-MM-DD 格式
  };

  // Info: (20250314 - Anna) 當期開始日 轉換為 YYYY-MM-DD
  const curDateStartFormatted = getFormattedDate(reportFinancial?.curDate?.from);

  // Info: (20250314 - Anna) 當期結束日 轉換為 YYYY-MM-DD
  const curDateEndFormatted = getFormattedDate(reportFinancial?.curDate?.to);

  // Info: (20250314 - Anna) 前期開始日 轉換為 YYYY-MM-DD
  const preDateStartFormatted = getFormattedDate(reportFinancial?.preDate?.from);

  // Info: (20250314 - Anna) 前期結束日 轉換為 YYYY-MM-DD
  const preDateEndFormatted = getFormattedDate(reportFinancial?.preDate?.to);

  // Info: (20250318 - Anna) 取得當年度
  const curYear = reportFinancial?.curDate?.to
    ? String(new Date(reportFinancial.curDate.to * 1000).getFullYear()) // Info: (20250318 - Anna) 轉換為字串
    : 'N/A';

  // Info: (20250318 - Anna) 取得前年度
  const preYear = reportFinancial?.preDate?.to
    ? String(new Date(reportFinancial.preDate.to * 1000).getFullYear()) // Info: (20250318 - Anna) 轉換為字串
    : 'N/A';

  // Info: (20241112 - Anna) 動態應用分頁樣式
  const printContainerClass = `mx-auto w-a4-width origin-top overflow-x-auto print:m-0  print:block  print:h-auto print:w-full print:p-0 ${isDownloading ? 'download-page' : ''}`;

  const printContentClass = 'relative h-a4-height overflow-hidden';

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
                <p className="whitespace-pre-line text-left text-xs font-bold leading-5">
                  {curDateStartFormatted}
                  <br />⾄{curDateEndFormatted}
                  <br />
                  財務報告 - 現金流量表
                </p>
              </>
            )}
          </div>
        </div>
        <div className="box-border w-35% text-right">
          <h2 className="relative whitespace-nowrap border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
            <span className="absolute -bottom-20px right-0 h-5px w-9/12 bg-surface-brand-secondary"></span>
          </h2>
        </div>
        {/* Info: (20250622 - Anna) 為了正確被 html2canvas 捕捉生成 PDF，使用 <img> 而不是 <Image> */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
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
          <h2 className="relative whitespace-nowrap border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Cash Flow Statement
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
        {/* Info: (20250622 - Anna) 為了正確被 html2canvas 捕捉生成 PDF，使用 <img> 而不是 <Image> */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
      </div>
    </footer>
  );

  // Info: (20250401 - Anna)  計算 ItemSummary 佔的頁數
  const renderTable = (data: FinancialReportItem[]) => {
    if (!data || data.length === 0) return []; // Info: (20250401 - Anna) 確保回傳陣列

    // Info: (20250401 - Anna) 過濾掉 `curPeriodAmount` 和 `prePeriodAmount` 都為 0 的數據
    const filteredData = data.filter(
      (value) => !(Number(value.curPeriodAmount) === 0 && Number(value.prePeriodAmount) === 0)
    );

    // Info: (20250401 - Anna)確保 `code` 唯一
    const uniqueData: FinancialReportItem[] = [];
    const seenCodes = new Set();

    filteredData.forEach((item) => {
      if (!seenCodes.has(item.code)) {
        seenCodes.add(item.code);
        uniqueData.push(item);
      }
    });

    // Info: (20250401 - Anna) 設定每頁 10 行
    const rowsPerPage = 10;
    const totalPages = Math.ceil(uniqueData.length / rowsPerPage);

    // Info: (20250401 - Anna) 確保回傳的是 `table` 陣列，而不是數字
    return Array.from({ length: totalPages }, (_, pageIndex) => {
      const pageRows = uniqueData.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);

      const pageKey = pageRows[0]?.code ?? `page-${crypto.randomUUID()}`;

      return (
        <table
          key={`table-${pageKey}`} // Info: (20250401 - Anna) 使用 `pageIndex` 確保 key 穩定
          className="relative z-1 w-full border-collapse bg-white"
          style={{ pageBreakBefore: pageIndex === 0 ? 'auto' : 'always' }}
        >
          <thead>
            <tr className="print:hidden">
              <th className="w-125px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold">
                {t('reports:REPORTS.CODE_NUMBER')}
              </th>
              <th className="w-540px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold">
                {t('reports:REPORTS.ACCOUNTING_ITEMS')}
              </th>
              <th className="w-285px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold">
                {curDateStartFormatted} <br /> {t('reports:COMMON.TO')} {curDateEndFormatted}
              </th>
              <th className="w-285px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold">
                {preDateStartFormatted} <br /> {t('reports:COMMON.TO')} {preDateEndFormatted}
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((value) => (
              <tr key={value.code ?? `row-${crypto.randomUUID()}`}>
                <td className="border border-stroke-neutral-quaternary p-10px text-sm">
                  {value.code}
                </td>
                <td className="border border-stroke-neutral-quaternary p-10px text-sm">
                  {t(`reports:ACCOUNTING_ACCOUNT.${value.name}`)}
                </td>
                <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm">
                  {DecimalOperations.isZero(value.curPeriodAmount ?? '0')
                    ? '-'
                    : DecimalOperations.isNegative(value.curPeriodAmount ?? '0')
                      ? `(${Math.abs(parseFloat(value.curPeriodAmount ?? '0')).toLocaleString()})`
                      : parseFloat(value.curPeriodAmount ?? '0').toLocaleString()}
                </td>
                <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm">
                  {DecimalOperations.isZero(value.prePeriodAmount ?? '0')
                    ? '-'
                    : DecimalOperations.isNegative(value.prePeriodAmount ?? '0')
                      ? `(${Math.abs(parseFloat(value.prePeriodAmount ?? '0')).toLocaleString()})`
                      : parseFloat(value.prePeriodAmount ?? '0').toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    });
  };

  const ItemSummaryPages = renderTable(reportFinancial?.general || []); // Info: (20250401 - Anna) 確保回傳 `table[]` 陣列
  const ItemSummary = ItemSummaryPages.map((table) => {
    const tableKey = crypto.randomUUID(); // Info: (20250401 - Anna) Generate a stable unique key

    return (
      <div
        key={tableKey} // Info: (20250401 - Anna) Use a unique key
        className={`${printContainerClass} border border-stroke-neutral-quaternary`}
        style={{
          pageBreakBefore: 'auto',
          pageBreakAfter: 'auto',
        }}
      >
        <div
          id={`summary-page-${tableKey}`} // Info: (20250401 - Anna) Use the unique key for ID as well
          className={`${printContentClass} relative h-a4-height overflow-y-hidden`}
        >
          {renderedHeader(true)}
          <section className="mx-1 px-14px text-text-neutral-secondary">
            <div className="relative z-10 mb-2 flex justify-between text-sm font-bold leading-5 text-surface-brand-secondary">
              <p>{t('reports:REPORTS.ITEM_SUMMARY_FORMAT')}</p>
              <p>
                {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
                {currency}
              </p>
            </div>
            {table} {/* Info: (20250401 - Anna) Render the table content */}
          </section>
          {/* Info: (20250401 - Anna) Ensure correct page numbering */}
          {renderedFooter(ItemSummaryPages.indexOf(table) + 1)}
        </div>
      </div>
    );
  });

  const tablePages = reportFinancial?.details ? renderTable(reportFinancial.details) : [];

  const ItemDetail = tablePages.map((table, pageIndex) => {
    const tableKey = table?.key ?? crypto.randomUUID();
    return (
      <div
        key={tableKey} // Info: (20250401 - Anna) 直接用 pageIndex 來確保 key 唯一
        className={`${printContainerClass} border border-stroke-neutral-quaternary`}
        style={{
          pageBreakBefore: 'auto',
          pageBreakAfter: 'auto',
        }}
      >
        <div
          id={`detail-page-${pageIndex}`}
          className={`${printContentClass} relative h-a4-height overflow-y-hidden`}
        >
          {renderedHeader(false)}
          <section className="relative mx-1 px-14px text-text-neutral-secondary">
            <div className="mb-2 flex justify-between text-sm font-bold leading-5 text-surface-brand-secondary">
              <p>{t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}</p>
              <p>
                {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
                {currency}
              </p>
            </div>
            {table}
          </section>
          {renderedFooter(ItemSummaryPages.length + pageIndex + 1)}
        </div>
      </div>
    );
  });

  const renderedFreeCashFlow = (currentYear: string, previousYear: string) => {
    if (!reportFinancial?.otherInfo?.freeCash) {
      return null;
    }

    const displayedTableBody =
      reportFinancial?.otherInfo?.freeCash[currentYear] &&
      reportFinancial?.otherInfo?.freeCash[previousYear] ? (
        <tbody>
          <tr>
            <td className="border border-stroke-neutral-quaternary p-10px text-start text-sm font-normal leading-5 text-text-neutral-secondary">
              {t('reports:REPORTS.CASH_INFLOWS_FROM_OPERATING')}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm font-normal leading-5 text-text-neutral-secondary">
              {DecimalOperations.isZero(reportFinancial?.otherInfo?.freeCash[currentYear]?.operatingCashFlow ?? '0')
                ? '-'
                : DecimalOperations.isNegative(reportFinancial?.otherInfo?.freeCash[currentYear]?.operatingCashFlow ?? '0')
                  ? `(${Math.abs(parseFloat(reportFinancial?.otherInfo?.freeCash[currentYear]?.operatingCashFlow ?? '0')).toLocaleString()})` // Info: (20241021 - Anna) 如果是負數，使用括號表示，並加千分位
                  : parseFloat(reportFinancial?.otherInfo?.freeCash[
                      currentYear
                    ]?.operatingCashFlow ?? '0').toLocaleString()}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm font-normal leading-5 text-text-neutral-secondary">
              {DecimalOperations.isZero(reportFinancial?.otherInfo?.freeCash[previousYear]?.operatingCashFlow ?? '0')
                ? '-'
                : DecimalOperations.isNegative(reportFinancial?.otherInfo?.freeCash[previousYear]?.operatingCashFlow ?? '0')
                  ? `(${Math.abs(parseFloat(reportFinancial?.otherInfo?.freeCash[previousYear]?.operatingCashFlow ?? '0')).toLocaleString()})`
                  : parseFloat(reportFinancial?.otherInfo?.freeCash[
                      previousYear
                    ]?.operatingCashFlow ?? '0').toLocaleString()}
            </td>
          </tr>
          <tr>
            <td className="border border-stroke-neutral-quaternary p-10px text-start text-sm font-normal leading-5 text-text-neutral-secondary">
              {t('reports:REPORTS.PROPERTY_PLANT_EQUIPMENT')}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm font-normal leading-5 text-text-neutral-secondary">
              {DecimalOperations.isZero(reportFinancial?.otherInfo?.freeCash[currentYear]?.ppe ?? '0')
                ? '-'
                : DecimalOperations.isNegative(reportFinancial?.otherInfo?.freeCash[currentYear]?.ppe ?? '0')
                  ? `(${Math.abs(parseFloat(reportFinancial?.otherInfo?.freeCash[currentYear]?.ppe ?? '0')).toLocaleString()})`
                  : parseFloat(reportFinancial?.otherInfo?.freeCash[currentYear]?.ppe ?? '0').toLocaleString()}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm font-normal leading-5 text-text-neutral-secondary">
              {DecimalOperations.isZero(reportFinancial?.otherInfo?.freeCash[previousYear]?.ppe ?? '0')
                ? '-'
                : DecimalOperations.isNegative(reportFinancial?.otherInfo?.freeCash[previousYear]?.ppe ?? '0')
                  ? `(${Math.abs(parseFloat(reportFinancial?.otherInfo?.freeCash[previousYear]?.ppe ?? '0')).toLocaleString()})`
                  : parseFloat(reportFinancial?.otherInfo?.freeCash[previousYear]?.ppe ?? '0').toLocaleString()}
            </td>
          </tr>
          <tr>
            <td className="border border-stroke-neutral-quaternary p-10px text-start text-sm font-normal leading-5 text-text-neutral-secondary">
              {t('reports:REPORTS.EXPENDITURES_ON_INTANGIBLE_ASSETS')}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm font-normal leading-5 text-text-neutral-secondary">
              {DecimalOperations.isZero(reportFinancial?.otherInfo?.freeCash[currentYear]?.intangibleAsset ?? '0')
                ? '-'
                : DecimalOperations.isNegative(reportFinancial?.otherInfo?.freeCash[currentYear]?.intangibleAsset ?? '0')
                  ? `(${Math.abs(parseFloat(reportFinancial?.otherInfo?.freeCash[currentYear]?.intangibleAsset ?? '0')).toLocaleString()})`
                  : parseFloat(reportFinancial?.otherInfo?.freeCash[
                      currentYear
                    ]?.intangibleAsset ?? '0').toLocaleString()}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm font-normal leading-5 text-text-neutral-secondary">
              {DecimalOperations.isZero(reportFinancial?.otherInfo?.freeCash[previousYear]?.intangibleAsset ?? '0')
                ? '-'
                : DecimalOperations.isNegative(reportFinancial?.otherInfo?.freeCash[previousYear]?.intangibleAsset ?? '0')
                  ? `(${Math.abs(parseFloat(reportFinancial?.otherInfo?.freeCash[previousYear]?.intangibleAsset ?? '0')).toLocaleString()})`
                  : parseFloat(reportFinancial?.otherInfo?.freeCash[
                      previousYear
                    ]?.intangibleAsset ?? '0').toLocaleString()}
            </td>
          </tr>
          <tr>
            <td className="border border-stroke-neutral-quaternary p-10px text-start text-sm font-normal leading-5 text-text-neutral-secondary">
              {t('reports:REPORTS.AVAILABLE_CASH_FLOW')}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm font-normal leading-5 text-text-neutral-secondary">
              {DecimalOperations.isZero(reportFinancial?.otherInfo?.freeCash[currentYear]?.freeCash ?? '0')
                ? '-'
                : DecimalOperations.isNegative(reportFinancial?.otherInfo?.freeCash[currentYear]?.freeCash ?? '0')
                  ? `(${Math.abs(parseFloat(reportFinancial?.otherInfo?.freeCash[currentYear]?.freeCash ?? '0')).toLocaleString()})`
                  : parseFloat(reportFinancial?.otherInfo?.freeCash[currentYear]?.freeCash ?? '0').toLocaleString()}
            </td>
            <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm font-normal leading-5 text-text-neutral-secondary">
              {DecimalOperations.isZero(reportFinancial?.otherInfo?.freeCash[previousYear]?.freeCash ?? '0')
                ? '-'
                : DecimalOperations.isNegative(reportFinancial?.otherInfo?.freeCash[previousYear]?.freeCash ?? '0')
                  ? `(${Math.abs(parseFloat(reportFinancial?.otherInfo?.freeCash[previousYear]?.freeCash ?? '0')).toLocaleString()})`
                  : parseFloat(reportFinancial?.otherInfo?.freeCash[previousYear]?.freeCash ?? '0').toLocaleString()}
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
            <tr className="bg-surface-brand-primary-50">
              <th className="w-300px border border-stroke-neutral-quaternary p-10px text-left text-xxs font-semibold leading-5 text-text-neutral-secondary"></th>
              <th className="w-300px border border-stroke-neutral-quaternary p-10px text-center text-sm font-semibold leading-5 text-text-neutral-secondary">
                {t('reports:REPORTS.YEAR_TEMPLATE', { year: currentYear })}
              </th>
              <th className="w-300px border border-stroke-neutral-quaternary p-10px text-center text-sm font-semibold leading-5 text-text-neutral-secondary">
                {t('reports:REPORTS.YEAR_TEMPLATE', { year: previousYear })}
              </th>
            </tr>
          </thead>
          {displayedTableBody}
        </table>
      </div>
    );
  };
  const freeCashFlow = (
    <div id="6" className="relative overflow-hidden">
      <section className="relative mx-3 text-text-neutral-secondary">
        <div className="mb-4 mt-32px text-center font-semibold leading-5 text-surface-brand-secondary">
          <p className="text-start font-semibold">{t('reports:REPORTS.FREE_CASH_FLOW')}</p>
          {renderedFreeCashFlow(curYear, preYear)}
        </div>
      </section>
    </div>
  );

  if (!reportFinancial) {
    return <p>No data available for download.</p>;
  }

  return (
    <div ref={downloadRef} className="hidden">
      {/* Info: (20250401 - Anna) `ItemSummary` 分頁，每頁 10 行 */}
      {ItemSummary}

      {/* Info: (20250401 - Anna) `ItemDetail` 分頁，每頁 10 行，從 `ItemSummary` 最後一頁 +1 開始 */}
      {ItemDetail}

      {/* Info: (20250401 - Anna) `freeCashFlow`，頁碼從 `ItemDetail` 最後一頁 +1 */}
      <div
        key="additional-block-page"
        className={printContainerClass}
        style={{
          pageBreakBefore: 'auto',
          pageBreakAfter: 'auto',
        }}
      >
        <div
          id="additional-block-page"
          className={`${printContentClass} relative h-a4-height overflow-y-hidden border border-stroke-neutral-quaternary`}
        >
          {renderedHeader(false)}
          <div className="text-sm">{freeCashFlow}</div>
          {/* Info: (20250401 - Anna) 動態計算頁碼 */}
          {renderedFooter(ItemSummaryPages.length + ItemDetail.length + 1)}
        </div>
      </div>
    </div>
  );
};

export default DownloadCashFlowStatement;
