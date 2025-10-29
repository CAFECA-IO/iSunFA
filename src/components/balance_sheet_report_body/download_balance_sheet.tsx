import React from 'react';
import { BalanceSheetReport } from '@/interfaces/report';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';
import { useCurrencyCtx } from '@/contexts/currency_context';

let currentPage = 1;
export const createRenderedFooter = () => {
  const footer = () => {
    const page = currentPage;
    currentPage += 1;
    return (
      <footer className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between bg-surface-brand-secondary p-10px">
        <p className="text-xs text-white">{page}</p>
        <div className="text-base font-bold text-surface-brand-secondary">
          <Image
            priority
            unoptimized
            width={80}
            height={20}
            src="/logo/white_isunfa_logo_light.svg"
            alt="iSunFA Logo"
          />
        </div>
      </footer>
    );
  };
  return footer;
};

interface DownloadBalanceSheetProps {
  reportFinancial: BalanceSheetReport | null;
  downloadRef: React.RefObject<HTMLDivElement>;
  isDownloading: boolean;
}

const DownloadBalanceSheet: React.FC<DownloadBalanceSheetProps> = ({
  reportFinancial,
  downloadRef,
  isDownloading,
}) => {
  const { t } = useTranslation(['reports']);
  const { currency } = useCurrencyCtx();
  // Info: (20250401 - Anna) 每次渲染前先把頁碼重置為 1
  currentPage = 1;

  // Info: (20250401 - Anna) 建立工具函式，將 rows 平均分成每頁最多 10 列
  const paginateRows = (rows: React.ReactNode[], pageSize = 10): React.ReactNode[][] => {
    const paginated: React.ReactNode[][] = [];
    for (let i = 0; i < rows.length; i += pageSize) {
      paginated.push(rows.slice(i, i + pageSize));
    }
    return paginated.filter((page) => page.length > 0);
  };

  const renderedFooter = createRenderedFooter();

  // Info: (20250314 - Anna) 將時間戳轉換為 YYYY-MM-DD
  const getFormattedDate = (timestamp: number | undefined) => {
    if (!timestamp) return 'Unknown-Date';
    const date = new Date(timestamp * 1000); // Info: (20250314 - Anna) 轉換成毫秒
    return date.toISOString().split('T')[0]; // Info: (20250314 - Anna) 取得 YYYY-MM-DD 格式
  };

  // Info: (20250314 - Anna) 當期結束日 轉換為 YYYY-MM-DD
  const curDateFormatted = getFormattedDate(reportFinancial?.curDate?.to);

  // Info: (20250314 - Anna) 前期結束日 轉換為 YYYY-MM-DD
  const preDateFormatted = getFormattedDate(reportFinancial?.preDate?.to);

  // Info: (20250314 - Anna) 取得當前年份與前一年
  const curYear = curDateFormatted.split('-')[0];
  const preYear = preDateFormatted.split('-')[0];

  // Info: (20241112 - Anna) 動態應用分頁樣式
  const printContainerClass = `mx-auto w-a4-width origin-top overflow-x-auto m-0  print:block  print:h-auto print:w-full p-0 border border-stroke-neutral-quaternary ${
    isDownloading ? 'download-page' : ''
  }`;
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
          priority // Info: (20250314 - Anna) 確保提前載入
          unoptimized // Info: (20250314 - Anna) 避免 next/image 預設處理影響 html2canvas
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

  const rowsForSummary = (items: Array<IAccountReadyForFrontend>) => {
    const rows = items.map((item) => {
      // Info: (20250213 - Anna) 判斷是否四個欄位都是 "0" 或 "-"
      const isAllZeroOrDash =
        (item.curPeriodAmountString === '0' || item.curPeriodAmountString === '-') &&
        (item.curPeriodPercentageString === '0' || item.curPeriodPercentageString === '-') &&
        (item.prePeriodAmountString === '0' || item.prePeriodAmountString === '-') &&
        (item.prePeriodPercentageString === '0' || item.prePeriodPercentageString === '-');

      if (isAllZeroOrDash) {
        return null; // Info: (20250213 - Anna) 這一列不顯示
      }

      if (!item.code) {
        return (
          <tr key={item.name}>
            <td
              colSpan={6}
              className="border border-stroke-neutral-quaternary p-10px text-sm font-bold"
            >
              {item.name}
            </td>
          </tr>
        );
      }

      return (
        <tr key={item.code}>
          <td className="w-50px border border-stroke-neutral-quaternary p-10px text-sm">
            {item.code}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-sm">
            <p>{t(`reports:ACCOUNTING_ACCOUNT.${item.name}`)}</p>
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-sm">
            {item.curPeriodPercentageString}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-sm">
            {item.prePeriodPercentageString}
          </td>
        </tr>
      );
    });
    return rows;
  };

  const rowsForDetail = (items: Array<IAccountReadyForFrontend>) => {
    const rows: React.ReactNode[] = [];

    items.forEach((item) => {
      const isAllZeroOrDash =
        (item.curPeriodAmountString === '0' || item.curPeriodAmountString === '-') &&
        (item.curPeriodPercentageString === '0' || item.curPeriodPercentageString === '-') &&
        (item.prePeriodAmountString === '0' || item.prePeriodAmountString === '-') &&
        (item.prePeriodPercentageString === '0' || item.prePeriodPercentageString === '-');

      if (isAllZeroOrDash) return; // Info: (20250401 - Anna) 用 return 跳過這一筆

      if (!item.code) {
        rows.push(
          <tr key={`group-${item.name}`}>
            <td
              colSpan={6}
              className="border border-stroke-neutral-quaternary p-10px text-sm font-bold"
            >
              {item.name}
            </td>
          </tr>
        );
        return;
      }

      // Info: (20250401 - Anna) 主科目 row
      rows.push(
        <tr key={item.code}>
          <td className="border border-stroke-neutral-quaternary p-10px text-sm">{item.code}</td>
          <td className="border border-stroke-neutral-quaternary p-10px text-sm">
            <div className="flex items-center justify-between">
              {t(`reports:ACCOUNTING_ACCOUNT.${item.name}`)}
            </div>
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm">
            {item.curPeriodAmountString}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-sm">
            {item.curPeriodPercentageString}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm">
            {item.prePeriodAmountString}
          </td>
          <td className="border border-stroke-neutral-quaternary p-10px text-center text-sm">
            {item.prePeriodPercentageString}
          </td>
        </tr>
      );

      // Info: (20250401 - Anna) 子科目 rows
      item.children
        ?.filter(
          (child) =>
            child.curPeriodAmountString !== '-' ||
            child.curPeriodPercentageString !== '-' ||
            child.prePeriodAmountString !== '-' ||
            child.prePeriodPercentageString !== '-'
        )
        .forEach((child) => {
          rows.push(
            <tr key={`sub-accounts-${child.code}`}>
              <td className="border border-t-0 border-stroke-brand-secondary-soft p-10px text-sm"></td>
              <td className="items-center border border-t-0 border-stroke-brand-secondary-soft px-10px py-3px text-sm">
                <div className="flex items-center justify-between">
                  <div className={`${isDownloading ? 'pb-2' : ''} justify-start`}>
                    <span>{child.code}</span>
                    <span className={`${isDownloading ? 'whitespace-normal' : ''} ml-2`}>
                      {t(`reports:ACCOUNTING_ACCOUNT.${child.name}`)}
                    </span>
                  </div>
                </div>
              </td>
              <td className="border border-t-0 border-stroke-brand-secondary-soft p-10px text-end text-sm">
                {child.curPeriodAmountString}
              </td>
              <td className="border border-t-0 border-stroke-brand-secondary-soft p-10px text-center text-sm">
                {child.curPeriodPercentageString}
              </td>
              <td className="border border-t-0 border-stroke-brand-secondary-soft p-10px text-end text-sm">
                {child.prePeriodAmountString}
              </td>
              <td className="border border-t-0 border-stroke-brand-secondary-soft p-10px text-center text-sm">
                {child.prePeriodPercentageString}
              </td>
            </tr>
          );
        });
    });

    return rows;
  };

  const renderDataRow = (
    label: string,
    curValue: string | undefined,
    preValue: string | undefined
  ) => (
    <tr>
      <td className="border border-stroke-neutral-quaternary p-10px text-sm">{label}</td>
      <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm">
        {curValue}
      </td>
      <td className="border border-stroke-neutral-quaternary p-10px text-end text-sm">
        {preValue}
      </td>
    </tr>
  );

  const ItemSummary = (
    <>
      <div className="relative overflow-y-hidden px-14px">
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

        <section className="text-text-neutral-secondary">
          {
            <table className="relative z-1 w-full border-collapse bg-white">
              <thead>
                <tr className="print:hidden">
                  <th className="w-50px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold">
                    {t('reports:REPORTS.CODE_NUMBER')}
                  </th>
                  <th
                    className={`w-800px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold`}
                  >
                    {t('reports:REPORTS.ACCOUNTING_ITEMS')}
                  </th>
                  <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold">
                    {curDateFormatted}
                  </th>
                  <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold">
                    %
                  </th>
                  <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold">
                    {preDateFormatted}
                  </th>
                  <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold">
                    %
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportFinancial?.general &&
                  paginateRows(rowsForSummary(reportFinancial.general)).map((pageRows, index) => (
                    <React.Fragment key={`summary-page-${pageRows.map((row, i) => i).join('-')}`}>
                      {pageRows}
                      {/* Info: (20250401 - Anna) 強制分頁：html2canvas 將此 div 當作分頁標記 */}
                      {index !== 0 && <tr className="break-after-page" />}
                    </React.Fragment>
                  ))}
              </tbody>
            </table>
          }
        </section>
      </div>
      {renderedFooter()}
    </>
  );

  // Info: (20250401 - Anna) 只做一次分頁
  const detailPages = reportFinancial?.details
    ? paginateRows(rowsForDetail(reportFinancial.details))
    : [];

  const ItemDetail = detailPages.map((pageRows) => {
    const pageKey = pageRows
      .map((row) => (React.isValidElement(row) && row.key ? row.key : 'unknown'))
      .join('-');

    const footer = renderedFooter(); // Info: (20250401 - Anna) 確保頁碼遞增正確

    return (
      <div key={`detail-page-${pageKey}`} className={printContainerClass}>
        <div className={`${printContentClass} relative h-a4-height overflow-y-hidden`}>
          {renderedHeader(false)}
          <div
            className={`${
              isDownloading ? 'pb-2' : ''
            } mx-14px mb-2 flex justify-between text-sm font-bold leading-5 text-surface-brand-secondary`}
          >
            <p>{t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}</p>
            <p>
              {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
              {currency}
            </p>
          </div>
          <div className={`relative overflow-y-hidden px-14px print:break-before-page`}>
            <section className="text-text-neutral-secondary">
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr className="print:hidden">
                    <th className="w-50px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold">
                      {t('reports:REPORTS.CODE_NUMBER')}
                    </th>
                    <th className="w-800px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold">
                      {t('reports:REPORTS.ACCOUNTING_ITEMS')}
                    </th>
                    <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold">
                      {curDateFormatted}
                    </th>
                    <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold">
                      %
                    </th>
                    <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold">
                      {preDateFormatted}
                    </th>
                    <th className="w-60px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody>{pageRows}</tbody>
              </table>
            </section>
          </div>
          {footer}
        </div>
      </div>
    );
  });

  const TurnoverDay = (
    <div id="5" className={`relative overflow-y-hidden print:break-before-page`}>
      <section className="mx-1 text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>{t('reports:REPORTS.ACCOUNTS_RECEIVABLE_TURNOVER_DAYS')}</p>
          <p>{t('reports:REPORTS.UNIT_DAYS')}</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-300px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold"></th>
              <th className="w-300px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-sm font-semibold">
                {t('reports:REPORTS.YEAR_TEMPLATE', { year: curYear })}
              </th>
              <th className="w-300px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-sm font-semibold">
                {t('reports:REPORTS.YEAR_TEMPLATE', { year: preYear })}
              </th>
            </tr>
          </thead>
          <tbody>
            {renderDataRow(
              t('reports:REPORTS.ACCOUNTS_RECEIVABLE_TURNOVER_DAYS'),
              reportFinancial?.otherInfo?.dso.curDso,
              reportFinancial?.otherInfo?.dso.preDso
            )}
          </tbody>
        </table>
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p>{t('reports:REPORTS.INVENTORY_TURNOVER_DAYS')}</p>
          <p>{t('reports:REPORTS.UNIT_DAYS')}</p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-300px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold"></th>
              <th className="w-300px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-sm font-semibold">
                {t('reports:REPORTS.YEAR_TEMPLATE', { year: curYear })}
              </th>
              <th className="w-300px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-sm font-semibold">
                {t('reports:REPORTS.YEAR_TEMPLATE', { year: preYear })}
              </th>
            </tr>
          </thead>
          <tbody>
            {renderDataRow(
              t('reports:REPORTS.INVENTORY_TURNOVER_DAYS'),
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

  if (!reportFinancial) {
    return <p>Loading...</p>;
  }

  return (
    <div ref={downloadRef} className="hidden">
      {/* Info: (20241120 - Anna) 渲染第一塊分頁 */}
      <div
        className={printContainerClass}
        style={{
          pageBreakBefore: 'auto',
          pageBreakAfter: 'auto',
        }}
      >
        <div className={`${printContentClass} relative h-a4-height overflow-y-hidden`}>
          {renderedHeader(true)}
          <div
            className={`${
              isDownloading ? 'pb-2' : ''
            } relative z-10 mx-14px mb-2 flex justify-between text-sm font-bold leading-5 text-surface-brand-secondary`}
          >
            <p>{t('reports:REPORTS.ITEM_SUMMARY_FORMAT')}</p>
            <p>
              {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
              {currency}
            </p>
          </div>
          {ItemSummary}
        </div>
      </div>
      {/* Info: (20250401 - Anna) 渲染第二塊分頁 */}
      {ItemDetail}

      {/* Info: (20241120 - Anna) 渲染額外的內容 */}
      <div
        className={printContainerClass}
        style={{
          pageBreakBefore: 'auto',
          pageBreakAfter: 'auto',
        }}
      >
        <div className={`${printContentClass} relative h-a4-height overflow-y-hidden`}>
          {renderedHeader(false)}
          <div className="px-12px">{TurnoverDay}</div>
          {renderedFooter()}
        </div>
      </div>
    </div>
  );
};

export default DownloadBalanceSheet;
