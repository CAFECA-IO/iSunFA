import React from 'react';
import { BalanceSheetReport } from '@/interfaces/report';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';

export const createRenderedFooter = () => {
  let currentPage = 1;
  return () => {
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
};

interface DownloadBalanceSheetProps {
  reportFinancial: BalanceSheetReport | null;
  downloadRef: React.RefObject<HTMLDivElement>;
  // pageCountRef: React.MutableRefObject<number>;
}

const DownloadBalanceSheet: React.FC<DownloadBalanceSheetProps> = ({
  reportFinancial,
  downloadRef,
  // pageCountRef,
}) => {
  const { t } = useTranslation(['reports']);

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

  //  // Info: (20250314 - Anna) 取得當前年份與前一年
  const curYear = curDateFormatted.split('-')[0];
  const preYear = preDateFormatted.split('-')[0];

  // Info: (20241112 - Anna) 動態應用分頁樣式
  const printContainerClass =
    'mx-auto w-a4-width origin-top overflow-x-auto m-0  print:block  print:h-auto print:w-full p-0 download-page border border-stroke-neutral-quaternary';
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
          // Todo: (20250331 - Anna) 這裡的 key 需要改成 item.name
          <tr key={item.code}>
            {/* <tr key={`group-${item.name}-${index}`}> */}
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
          // Todo: (20250331 - Anna) 這裡的 key 需要改成 item.name
          <tr key={item.code}>
            {/* <tr key={`group-${item.name}-${index}`}> */}
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
        <React.Fragment key={item.code}>
          <tr>
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
          {/* Info: (20250314 - Anna) 子科目表格 */}
          {item.children &&
            item.children.length > 0 &&
            item.children
              // Info: (20241203 - Anna) 過濾掉數值為 "0" 或 "-" 的子科目
              .filter(
                (child) =>
                  child.curPeriodAmountString !== '-' ||
                  child.curPeriodPercentageString !== '-' ||
                  child.prePeriodAmountString !== '-' ||
                  child.prePeriodPercentageString !== '-'
              )
              .map((child) => (
                <tr key={`sub-accounts-${child.code}`}>
                  <td className="border border-t-0 border-stroke-brand-secondary-soft p-10px text-sm"></td>
                  <td className="items-center border border-t-0 border-stroke-brand-secondary-soft px-10px py-3px text-sm">
                    <div className="flex items-center justify-between">
                      <div className="justify-start">
                        <span>{child.code}</span>
                        <span className="ml-2">
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
              ))}
        </React.Fragment>
      );
    });
    return rows;
  };
  const renderDataRow = (
    label: string,
    curValue: number | undefined,
    preValue: number | undefined
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

  // Todo: (20250331 - Anna) id 可拿掉
  const ItemSummary = (
    <div id="1" className="relative overflow-y-hidden px-14px">
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
            {/* <tbody>
              {reportFinancial &&
                reportFinancial.general &&
                Object.prototype.hasOwnProperty.call(reportFinancial, 'general') &&
                rowsForSummary(reportFinancial.general)}
            </tbody> */}
            {/* Todo: (20250331 - Anna)  Object.prototype.hasOwnProperty 可拿掉 */}
            <tbody>{reportFinancial?.general && rowsForSummary(reportFinancial.general)}</tbody>
          </table>
        }
      </section>
    </div>
  );

  // Todo: (20250331 - Anna) id 可拿掉
  const ItemDetail = (
    <div id="2" className={`relative overflow-y-hidden px-14px print:break-before-page`}>
      <section className="text-text-neutral-secondary">
        {
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
            {/* Todo: (20250331 - Anna)  Object.prototype.hasOwnProperty 可拿掉 */}
            {/* <tbody>
              {reportFinancial &&
                reportFinancial.general &&
                Object.prototype.hasOwnProperty.call(reportFinancial, 'general') &&
                rowsForDetail(reportFinancial.details)}
            </tbody> */}
            <tbody>{reportFinancial?.details && rowsForDetail(reportFinancial.details)}</tbody>
          </table>
        }
      </section>
    </div>
  );
  // Todo: (20250331 - Anna) id 可拿掉
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
        // Todo: (20241120 - Anna) key 可拿掉
        key={`first-block-page-`}
        className={printContainerClass}
        style={{
          pageBreakBefore: 'auto',
          pageBreakAfter: 'auto',
        }}
      >
        <div
          // Todo: (20241120 - Anna) id 可拿掉
          id={`first-block-page-`}
          className={`${printContentClass} relative h-a4-height overflow-y-hidden`}
        >
          {renderedHeader(true)}
          <div className="relative z-10 mx-14px mb-2 flex justify-between text-sm font-bold leading-5 text-surface-brand-secondary">
            <p>{t('reports:REPORTS.ITEM_SUMMARY_FORMAT')}</p>
            <p>{t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}</p>
          </div>
          {ItemSummary}
          {renderedFooter()}
        </div>
      </div>
      {/* Info: (20241120 - Anna) 渲染第二塊分頁 */}
      {/* Todo: (20241120 - Anna) key 可拿掉 */}
      <div
        key={`second-block-page-`}
        className={printContainerClass}
        style={{
          pageBreakBefore: 'auto',
          pageBreakAfter: 'auto',
        }}
      >
        <div
          // Todo: (20241120 - Anna) id 可拿掉
          id={`second-block-page-`}
          className={`${printContentClass} relative h-a4-height overflow-y-hidden`}
        >
          {renderedHeader(false)}
          <div className="mx-14px mb-2 flex justify-between text-sm font-bold leading-5 text-surface-brand-secondary">
            <p>{t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}</p>
            <p>{t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}</p>
          </div>
          {ItemDetail}
          {renderedFooter()}
        </div>
      </div>
      {/* Info: (20241120 - Anna) 渲染額外的內容 */}
      {/* Todo: (20241120 - Anna) key 可拿掉 */}
      <div
        key={`additional-block-page-`}
        className={printContainerClass}
        style={{
          pageBreakBefore: 'auto',
          pageBreakAfter: 'auto',
        }}
      >
        <div
          // Todo: (20241120 - Anna) id 可拿掉
          id={`additional-block-page-`}
          className={`${printContentClass} relative h-a4-height overflow-y-hidden`}
        >
          {renderedHeader(false)}
          <div className="px-12px">{TurnoverDay}</div>
          {/* Info: (20241130 - Anna) 渲染 pageContent */}
          {renderedFooter()}
        </div>
      </div>
    </div>
  );
};

export default DownloadBalanceSheet;
